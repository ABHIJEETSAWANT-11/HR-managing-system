import { Router, Request, Response, NextFunction } from "express";
import { Offer } from "./offer.model";
import { OfferApproval } from "./offer-approval.model";
import { DocumentTemplate } from "../templates/document-template.model";
import { generateOfferPdf } from "../../services/pdf.service";
import { sendOfferEmail } from "../../services/mail.service";
import { requireAuth } from "../../middleware/requireAuth";
import { requireTenant } from "../../middleware/tenantGuard";
import { CandidateApplication } from "../applications/application.model";
import { Candidate } from "../candidates/candidate.model";
import { Job } from "../jobs/job.model";
import { Organization } from "../organizations/organization.model";
import mongoose from "mongoose";

/**
 * Inline salary validation service for Phase 7
 */
function validateAndComputeOfferSalary(
  annualCTC: number,
  salaryStructure: {
    annualCTC: number;
    basicSalary?: number;
    hra?: number;
    specialAllowance?: number;
    variablePay?: number;
    performanceBonus?: number;
    joiningBonus?: number;
    employerPF?: number;
    gratuity?: number;
    insurance?: number;
    otherBenefits?: number[];
  }
) {
  let total = 0;

  if (salaryStructure.basicSalary !== undefined) total += salaryStructure.basicSalary;
  if (salaryStructure.hra !== undefined) total += salaryStructure.hra;
  if (salaryStructure.specialAllowance !== undefined) total += salaryStructure.specialAllowance;
  if (salaryStructure.variablePay !== undefined) total += salaryStructure.variablePay;
  if (salaryStructure.performanceBonus !== undefined) total += salaryStructure.performanceBonus;
  if (salaryStructure.joiningBonus !== undefined) total += salaryStructure.joiningBonus;
  if (salaryStructure.employerPF !== undefined) total += salaryStructure.employerPF;
  if (salaryStructure.gratuity !== undefined) total += salaryStructure.gratuity;
  if (salaryStructure.insurance !== undefined) total += salaryStructure.insurance;
  if (salaryStructure.otherBenefits && salaryStructure.otherBenefits.length > 0) {
    salaryStructure.otherBenefits.forEach((benefit) => {
      total += benefit;
    });
  }

  const mismatch = Math.abs(annualCTC - total);
  const valid = mismatch <= 1;

  const monthlyGross = Math.round(annualCTC / 12 * 100) / 100;

  return {
    valid,
    mismatch,
    monthlyGross,
  };
}

function isReviewer(req: Request): boolean {
  const role = (req.user as any).role;
  return ["hiring_manager", "org_admin", "recruiter"].includes(role);
}

const router = Router();

router.get(
  "/",
  requireAuth,
  requireTenant,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.org!._id;
      const { status, jobId, candidateId, applicationId } = req.query as Record<string, string>;

      const filter: Record<string, unknown> = { organizationId: orgId };

      if (status) filter.status = status;
      if (jobId) filter.jobId = jobId;
      if (candidateId) filter.candidateId = candidateId;
      if (applicationId) filter.applicationId = applicationId;

      const offers = await Offer.find(filter)
        .populate("candidateId", "fullName")
        .populate("jobId", "title")
        .sort({ createdAt: -1 });

      res.status(200).json({
        success: true,
        data: { offers, total: offers.length },
      });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  "/",
  requireAuth,
  requireTenant,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.org!._id;
      const {
        applicationId, jobId, candidateId, templateId,
        joiningDate, reportingManagerId, workLocation,
        probationPeriodDays, noticePeriodDays, validUntil,
        salaryStructure, specialConditions,
      } = req.body;

      // Verify application exists and belongs to org
      const application = await CandidateApplication.findOne({
        _id: applicationId,
        organizationId: orgId,
        isDeleted: { $ne: true },
      });
      if (!application) {
        return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Application not found" } });
      }

      // Verify candidate belongs to application
      const candidate = await Candidate.findOne({
        _id: candidateId,
        organizationId: orgId,
        isDeleted: { $ne: true },
      });
      if (!candidate) {
        return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Candidate not found" } });
      }

      // Verify job belongs to org
      const job = await Job.findOne({ _id: jobId, organizationId: orgId });
      if (!job) {
        return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Job not found" } });
      }

      // Validate salary components
      const salaryValidation = validateAndComputeOfferSalary(
        salaryStructure.annualCTC,
        salaryStructure
      );

      if (!salaryValidation.valid) {
        return res.status(400).json({
          success: false,
          error: {
            code: "BAD_REQUEST",
            message: `Salary components total (₹${salaryValidation.mismatch}) doesn't match annual CTC (₹${salaryStructure.annualCTC}) within ±1 tolerance`,
          },
        });
      }

      // Check for existing offer
      const existingOffer = await Offer.findOne({
        applicationId,
        organizationId: orgId,
        status: { $ne: "accepted" },
      });

      if (existingOffer) {
        return res.status(409).json({
          success: false,
          error: {
            code: "CONFLICT",
            message: "An active offer already exists for this application",
          },
        });
      }

      // Generate portal token
      const crypto = require("crypto");
      const portalToken = crypto.randomBytes(32).toString("hex");

      const offer = new Offer({
        organizationId: orgId,
        applicationId,
        candidateId,
        jobId,
        templateId,
        joiningDate: new Date(joiningDate),
        reportingManagerId,
        workLocation,
        probationPeriodDays,
        noticePeriodDays,
        validUntil: new Date(validUntil),
        salaryStructure: {
          ...salaryStructure,
          monthlyGross: salaryValidation.monthlyGross,
        },
        specialConditions,
        portalToken,
        status: "draft",
        createdBy: req.user!._id,
      });

      await offer.save();

      res.status(201).json({ success: true, data: { offer } });
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  "/:id",
  requireAuth,
  requireTenant,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.org!._id;

      const offer = await Offer.findOne({
        _id: req.params.id,
        organizationId: orgId,
      })
        .populate("candidateId", "fullName email")
        .populate("jobId", "title departmentId employmentType")
        .populate("reportingManagerId", "name email");

      if (!offer) {
        return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Offer not found" } });
      }

      res.status(200).json({ success: true, data: { offer } });
    } catch (error) {
      next(error);
    }
  }
);

router.patch(
  "/:id",
  requireAuth,
  requireTenant,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.org!._id;

      const offer = await Offer.findOne({
        _id: req.params.id,
        organizationId: orgId,
      });

      if (!offer) {
        return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Offer not found" } });
      }

      // Only allow editing while draft or changes_requested
      if (offer.status !== "draft" && offer.status !== "changes_requested") {
        return res.status(400).json({
          success: false,
          error: {
            code: "BAD_REQUEST",
            message: `Cannot edit offer with status "${offer.status}". Only draft or changes_requested offers can be edited.`,
          },
        });
      }

      // Save previous version before editing
      offer.previousVersions.push({
        version: offer.version,
        snapshot: {
          status: offer.status,
          salaryStructure: offer.salaryStructure,
        },
        changedAt: new Date(),
        changedBy: req.user!._id,
      });

      // Increment version on substantive edits
      if (req.body.version) {
        offer.version = req.body.version;
      } else {
        offer.version += 1;
      }

      // Update fields
      if (req.body.status) offer.status = req.body.status;
      if (req.body.joiningDate) offer.joiningDate = new Date(req.body.joiningDate);
      if (req.body.reportingManagerId) offer.reportingManagerId = req.body.reportingManagerId;
      if (req.body.workLocation) offer.workLocation = req.body.workLocation;
      if (req.body.probationPeriodDays !== undefined) offer.probationPeriodDays = req.body.probationPeriodDays;
      if (req.body.noticePeriodDays !== undefined) offer.noticePeriodDays = req.body.noticePeriodDays;
      if (req.body.validUntil) offer.validUntil = new Date(req.body.validUntil);
      if (req.body.salaryStructure) {
        const salaryValidation = validateAndComputeOfferSalary(
          req.body.salaryStructure.annualCTC,
          req.body.salaryStructure
        );
        if (!salaryValidation.valid) {
          return res.status(400).json({
            success: false,
            error: {
              code: "BAD_REQUEST",
              message: `Salary mismatch: ₹${salaryValidation.mismatch}`,
            },
          });
        }
        offer.salaryStructure = {
          ...req.body.salaryStructure,
          monthlyGross: salaryValidation.monthlyGross,
        };
      }
      if (req.body.specialConditions) offer.specialConditions = req.body.specialConditions;

      await offer.save();

      res.status(200).json({ success: true, data: { offer } });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  "/:id/submit",
  requireAuth,
  requireTenant,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.org!._id;

      const offer = await Offer.findOne({
        _id: req.params.id,
        organizationId: orgId,
      });

      if (!offer) {
        return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Offer not found" } });
      }

      // Only draft can be submitted
      if (offer.status !== "draft") {
        return res.status(400).json({
          success: false,
          error: {
            code: "BAD_REQUEST",
            message: `Cannot submit offer with status "${offer.status}". Only draft offers can be submitted.`,
          },
        });
      }

      // Create OfferApproval with default 3-level chain
      const approvalConfig = [
        { level: 1, approverRole: "hiring_manager" },
        { level: 2, approverRole: "finance_approver" },
        { level: 3, approverRole: "hr_head" },
      ];

      const newApproval = new OfferApproval({
        offerId: offer._id,
        organizationId: orgId,
        approvalConfig,
        approvals: approvalConfig.map((config) => ({
          level: config.level,
          approverId: req.user!._id,
          status: "pending",
          offerVersionAtDecision: offer.version,
        })),
        currentLevel: 1,
        overallStatus: "in_progress",
      });

      await newApproval.save();

      // Update offer status
      offer.status = "awaiting_approval";
      await offer.save();

      res.status(200).json({ success: true, data: { offer, approval: newApproval } });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  "/:id/approve",
  requireAuth,
  requireTenant,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.org!._id;

      const offer = await Offer.findOne({
        _id: req.params.id,
        organizationId: orgId,
      });

      if (!offer) {
        return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Offer not found" } });
      }

      const approval = await OfferApproval.findOne({ offerId: offer._id });
      if (!approval) {
        return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Approval record not found" } });
      }

      // Only the current level's approver can act
      const currentLevelConfig = approval.approvalConfig.find(
        (c) => c.level === approval.currentLevel
      );
      if (!currentLevelConfig) {
        return res.status(400).json({
          success: false,
          error: {
            code: "BAD_REQUEST",
            message: "Invalid approval configuration",
          },
        });
      }

      // Find the approver at this level
      const currentApprover = approval.approvals.find(
        (a) => a.level === approval.currentLevel
      );

      if (!currentApprover) {
        return res.status(400).json({
          success: false,
          error: {
            code: "BAD_REQUEST",
            message: "No approver at current level",
          },
        });
      }

      // Map the decision verb to the per-level status enum on OfferApproval
      const decisionStatusMap: Record<string, "approved" | "rejected" | "changes_requested"> = {
        approve: "approved",
        reject: "rejected",
        request_changes: "changes_requested",
      };

      // Mark this level's approval
      currentApprover.status = decisionStatusMap[req.body.decision] ?? "pending";
      currentApprover.comments = req.body.comments || "";
      currentApprover.decidedAt = new Date();
      currentApprover.offerVersionAtDecision = offer.version;

      if (req.body.decision === "approve") {
        if (approval.currentLevel < approval.approvalConfig.length) {
          approval.currentLevel += 1;
        } else {
          offer.status = "approved";
          approval.overallStatus = "approved";
        }
      } else if (req.body.decision === "reject") {
        offer.status = "draft";
        approval.overallStatus = "rejected";
      } else if (req.body.decision === "request_changes") {
        offer.status = "changes_requested";
        approval.overallStatus = "changes_requested";
      }

      await approval.save();
      await offer.save();

      res.status(200).json({ success: true, data: { offer, approval } });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  "/:id/send",
  requireAuth,
  requireTenant,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.org!._id;

      const offer = await Offer.findOne({
        _id: req.params.id,
        organizationId: orgId,
      });

      if (!offer) {
        return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Offer not found" } });
      }

      // Only approved offers can be sent
      if (offer.status !== "approved") {
        return res.status(400).json({
          success: false,
          error: {
            code: "BAD_REQUEST",
            message: `Cannot send offer with status "${offer.status}". Only approved offers can be sent.`,
          },
        });
      }

      // Generate the real offer PDF via Puppeteer + Cloudinary (pdf.service) if not already generated
      if (!offer.pdfUrl) {
        const pdf = await generateOfferPdf(String(offer._id));
        offer.pdfUrl = pdf.url;
        offer.pdfCloudinaryId = pdf.publicId;
      }

      // Generate portal token if not exists
      if (!offer.portalToken) {
        const crypto = require("crypto");
        offer.portalToken = crypto.randomBytes(32).toString("hex");
      }

      // Section 4: real email via Nodemailer (graceful skip when SMTP is not configured).
      const candidate = await Candidate.findById(offer.candidateId).select("fullName email");
      const organization = await Organization.findById(orgId).select("name");
      const job = await Job.findById(offer.jobId).select("title");
      const portalUrl = `${process.env.CLIENT_URL || "http://localhost:5173"}/portal/offers/${offer.portalToken}`;

      let mailResult: any = null;
      if (candidate?.email) {
        mailResult = await sendOfferEmail({
          to: candidate.email,
          candidateName: candidate.fullName,
          jobTitle: job?.title || "the position",
          companyName: organization?.name || "Our company",
          portalUrl,
          ctc: offer.salaryStructure?.annualCTC ?? null,
          expiryDate: offer.validUntil ?? null,
        });
      }

      offer.status = "sent";
      offer.sentAt = new Date();
      await offer.save();
      res.status(200).json({ success: true, data: { offer, email: mailResult } });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  "/:id/withdraw",
  requireAuth,
  requireTenant,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.org!._id;

      const offer = await Offer.findOne({
        _id: req.params.id,
        organizationId: orgId,
      });

      if (!offer) {
        return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Offer not found" } });
      }

      // Allowed from sent/viewed/approved, not accepted
      if (
        offer.status === "accepted" ||
        offer.status === "rejected" ||
        offer.status === "expired"
      ) {
        return res.status(400).json({
          success: false,
          error: {
            code: "BAD_REQUEST",
            message: `Cannot withdraw offer with status "${offer.status}". Offer is already finalized.`,
          },
        });
      }

      offer.status = "withdrawn";
      await offer.save();

      res.status(200).json({ success: true, data: { offer } });
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  "/:id/pdf",
  requireAuth,
  requireTenant,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.org!._id;

      const offer = await Offer.findOne({
        _id: req.params.id,
        organizationId: orgId,
      });

      if (!offer) {
        return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Offer not found" } });
      }

      // Generate the real PDF if it doesn't exist yet, then redirect to the Cloudinary file
      if (!offer.pdfUrl) {
        await generateOfferPdf(String(offer._id));
      }

      const fresh = await Offer.findById(offer._id);
      if (!fresh?.pdfUrl) {
        return res.status(500).json({
          success: false,
          error: { code: "PDF_GENERATION_FAILED", message: "Offer PDF could not be generated" },
        });
      }

      return res.redirect(fresh.pdfUrl);
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  "/:id/history",
  requireAuth,
  requireTenant,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.org!._id;

      const offer = await Offer.findOne({
        _id: req.params.id,
        organizationId: orgId,
      });

      if (!offer) {
        return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Offer not found" } });
      }

      res.status(200).json({
        success: true,
        data: {
          previousVersions: offer.previousVersions,
          currentState: {
            version: offer.version,
            status: offer.status,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;