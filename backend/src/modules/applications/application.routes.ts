import { Router, Request, Response, NextFunction } from "express";
import { CandidateApplication } from "./application.model";
import { Job } from "../jobs/job.model";
import { Candidate } from "../candidates/candidate.model";
import { requireAuth } from "../../middleware/requireAuth";
import { requireTenant } from "../../middleware/tenantGuard";
import { CandidateScore } from "./candidate-score.model";
import { generateFitScore } from "../../services/score.service";

// Hardcoded default pipeline stages (no PipelineConfig model exists yet).
// Must stay in sync with the frontend Kanban board (Part 2).
export const PIPELINE_STAGES = [
  "Applied",
  "AI Reviewed",
  "Recruiter Review",
  "Shortlisted",
  "Screening Call",
  "Interview",
  "Assessment",
  "Final Interview",
  "Offer Approval",
  "Offer Sent",
  "Offer Accepted",
  "Joined",
  "On Hold",
  "Rejected",
  "Candidate Withdrew",
  "No Response",
  "Duplicate",
  "Future Opportunity",
  "Offer Declined",
] as const;

const router = Router();

// GET /api/v1/applications - List applications (org-scoped, filterable)
router.get(
  "/",
  requireAuth,
  requireTenant,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.org!._id;
      const { jobId, candidateId, pipelineStage, status } = req.query as Record<string, string>;

      const filter: Record<string, unknown> = { organizationId: orgId, isDeleted: { $ne: true } };
      if (jobId) filter.jobId = jobId;
      if (candidateId) filter.candidateId = candidateId;
      if (pipelineStage) filter.pipelineStage = pipelineStage;
      if (status) filter.status = status;

      const applications = await CandidateApplication.find(filter)
        .populate("candidateId", "fullName email currentDesignation photoUrl skills totalExperienceYears")
        .populate("jobId", "title location employmentType")
        .sort({ lastActivityAt: -1 });

      res.status(200).json({ success: true, data: { applications, total: applications.length } });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/v1/applications - Create application
router.post(
  "/",
  requireAuth,
  requireTenant,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.org!._id;
      const { jobId, candidateId, screeningAnswers } = req.body;

      if (!jobId || !candidateId) {
        return res.status(400).json({
          success: false,
          error: { code: "BAD_REQUEST", message: "jobId and candidateId are required" },
        });
      }

      const job = await Job.findOne({ _id: jobId, organizationId: orgId });
      if (!job) {
        return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Job not found" } });
      }

      const candidate = await Candidate.findOne({
        _id: candidateId,
        organizationId: orgId,
        isDeleted: { $ne: true },
      });
      if (!candidate) {
        return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Candidate not found" } });
      }

      // Prevent duplicate active applications for the same job
      const existing = await CandidateApplication.findOne({
        organizationId: orgId,
        jobId,
        candidateId,
        isDeleted: { $ne: true },
        status: "active",
      });
      if (existing) {
        return res.status(409).json({
          success: false,
          error: { code: "CONFLICT", message: "An active application already exists for this candidate and job" },
        });
      }

      const application = new CandidateApplication({
        organizationId: orgId,
        jobId,
        candidateId,
        screeningAnswers: screeningAnswers || [],
        pipelineStage: "Applied",
        lastActivityAt: new Date(),
      });
      await application.save();

      res.status(201).json({ success: true, data: { application } });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/v1/applications/:id - Application detail
router.get(
  "/:id",
  requireAuth,
  requireTenant,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.org!._id;

      const application = await CandidateApplication.findOne({
        _id: req.params.id,
        organizationId: orgId,
        isDeleted: { $ne: true },
      })
        .populate("candidateId", "fullName email currentDesignation photoUrl skills totalExperienceYears")
        .populate("jobId", "title location employmentType");

      if (!application) {
        return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Application not found" } });
      }

      res.status(200).json({ success: true, data: { application } });
    } catch (error) {
      next(error);
    }
  }
);

// PATCH /api/v1/applications/:id/stage - Move an application through the pipeline (Kanban)
router.patch(
  "/:id/stage",
  requireAuth,
  requireTenant,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.org!._id;
      const { pipelineStage } = req.body;

      if (!pipelineStage || !PIPELINE_STAGES.includes(pipelineStage)) {
        return res.status(400).json({
          success: false,
          error: {
            code: "BAD_REQUEST",
            message: `Invalid pipelineStage "${pipelineStage ?? ""}". Allowed stages: ${PIPELINE_STAGES.join(", ")}`,
          },
        });
      }

      const application = await CandidateApplication.findOneAndUpdate(
        { _id: req.params.id, organizationId: orgId, isDeleted: { $ne: true } },
        { $set: { pipelineStage, lastActivityAt: new Date() } },
        { new: true }
      );

      if (!application) {
        return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Application not found" } });
      }

      res.status(200).json({ success: true, data: { application } });
    } catch (error) {
      next(error);
    }
  }
);

// ===== Section 3.3: Candidate Fit Score routes =====

// GET /api/v1/applications/:id/score — full scorecard incl. breakdown + explanation
router.get(
  "/:id/score",
  requireAuth,
  requireTenant,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = (req as any).org!._id;
      const score = await CandidateScore.findOne({ applicationId: req.params.id, organizationId: orgId });
      if (!score) {
        return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "No score generated yet. POST /:id/score/generate first." } });
      }
      res.status(200).json({ success: true, data: { score } });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/v1/applications/:id/score/generate — deterministic, idempotent (replaces, never duplicates)
router.post(
  "/:id/score/generate",
  requireAuth,
  requireTenant,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = (req as any).org!._id;
      const { scoreDoc, geminiExplanation } = await generateFitScore(orgId, req.params.id);
      res.status(200).json({ success: true, data: { score: scoreDoc, geminiExplanation } });
    } catch (error: any) {
      if (error?.status === 404) {
        return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: error.message } });
      }
      next(error);
    }
  }
);

// POST /api/v1/applications/:id/score/override — recruiter override; original stays visible
router.post(
  "/:id/score/override",
  requireAuth,
  requireTenant,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = (req as any).org!._id;
      const { overrideScore, reason } = req.body || {};
      const n = Number(overrideScore);
      if (!Number.isFinite(n) || n < 0 || n > 100) {
        return res.status(400).json({ success: false, error: { code: "BAD_REQUEST", message: "overrideScore must be a number 0-100" } });
      }
      if (!reason || !String(reason).trim()) {
        return res.status(400).json({ success: false, error: { code: "BAD_REQUEST", message: "reason is required for an override" } });
      }
      const score = await CandidateScore.findOne({ applicationId: req.params.id, organizationId: orgId });
      if (!score) {
        return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "No score to override. Generate one first." } });
      }
      score.isOverridden = true;
      score.overrideReason = String(reason).trim().slice(0, 1000);
      score.overriddenBy = (req as any).user!._id;
      score.overallScore = Math.round(n);
      await score.save();
      await CandidateApplication.updateOne({ _id: score.applicationId }, { $set: { fitScore: score.overallScore } });
      res.status(200).json({ success: true, data: { score } });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
