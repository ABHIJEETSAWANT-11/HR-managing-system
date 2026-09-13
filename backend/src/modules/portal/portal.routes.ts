import { Router, Request, Response, NextFunction } from "express";
import rateLimit from "express-rate-limit";
import crypto from "crypto";
import { Offer } from "../offers/offer.model";
import { Candidate } from "../candidates/candidate.model";
import { Job } from "../jobs/job.model";
import { Organization } from "../organizations/organization.model";
import { notifyOrg } from "../../services/notification.service";

/**
 * Section 5 — Phase 8 candidate offer portal.
 * PUBLIC/UNAUTHENTICATED by design: access is granted solely by possession of a
 * 64-hex-char portal token. Rate limited (this is a public write surface).
 * Errors are GENERIC by intent — no token enumeration hints, no org data leakage.
 */

// Dedicated limiter for the portal: stricter than the global API limiter.
const portalLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: "RATE_LIMITED", message: "Too many attempts. Try again later." } },
});

const router = Router();
router.use(portalLimiter);

/** Loads an offer by token for a candidate-facing action; enforces lifecycle guards. */
async function loadOfferByToken(token: string) {
  return Offer.findOne({ portalToken: token }).select("+portalToken");
}

function genericNotFound(res: Response) {
  return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "This offer link is invalid or no longer available." } });
}

function clientIp(req: Request): string {
  const xf = (req.headers["x-forwarded-for"] as string) || "";
  return (xf.split(",")[0] || req.socket.remoteAddress || "unknown").trim();
}

/** Public-safe projection — NEVER includes salary annexure detail, org internals, or ids beyond what's needed. */
function publicView(offer: any, candidate: any, job: any, org: any) {
  return {
    candidateName: candidate?.fullName || "Candidate",
    jobTitle: job?.title || "the position",
    companyName: org?.name || "",
    companyLogoUrl: org?.logoUrl || "",
    companyAddress: org?.address || "",
    joiningDate: offer.joiningDate || null,
    salarySummary: { annualCTC: offer.salaryStructure?.annualCTC ?? null, currency: "INR" },
    workLocation: offer.workLocation || "",
    pdfUrl: offer.pdfUrl || "",
    expiresAt: offer.validUntil || null,
    status: offer.status,
    firstViewedAt: offer.firstViewedAt || null,
  };
}

// GET /api/v1/portal/offers/:token — view (public-safe)
router.get(
  "/:token",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const token = String(req.params.token || "");
      if (!/^[a-f0-9]{64}$/.test(token)) return genericNotFound(res);

      const offer = await loadOfferByToken(token);
      if (!offer || ["withdrawn", "expired"].includes(offer.status)) return genericNotFound(res);

      const [candidate, job, org] = await Promise.all([
        Candidate.findById(offer.candidateId).select("fullName"),
        Job.findById(offer.jobId).select("title"),
        Organization.findById(offer.organizationId).select("name logoUrl address"),
      ]);

      // View tracking: firstViewedAt once, lastViewedAt always, sent→viewed once.
      const now = new Date();
      offer.lastViewedAt = now;
      if (!offer.firstViewedAt) offer.firstViewedAt = now;
      if (offer.status === "sent") offer.status = "viewed";
      await offer.save();

      res.status(200).json({ success: true, data: { offer: publicView(offer, candidate, job, org) } });
    } catch (error) {
      next(error);
    }
  }
);

/** Guards shared by accept/reject: token valid, offer live and not already decided. */
async function guardDecidable(token: string) {
  if (!/^[a-f0-9]{64}$/.test(token)) return { error: "not_found" as const };
  const offer = await loadOfferByToken(token);
  if (!offer || ["withdrawn", "expired"].includes(offer.status)) return { error: "not_found" as const };
  if (offer.validUntil && offer.validUntil.getTime() < Date.now()) return { error: "expired" as const };
  if (["accepted", "rejected"].includes(offer.status)) return { error: "decided" as const, offer };
  return { offer };
}

// POST /api/v1/portal/offers/:token/accept — typed-name e-signature (deliberate MVP simplification)
router.post(
  "/:token/accept",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const fullName = String(req.body?.fullName || "").trim();
      if (fullName.length < 3 || fullName.length > 120) {
        return res.status(400).json({ success: false, error: { code: "BAD_REQUEST", message: "Type your full legal name to accept." } });
      }

      const { offer, error } = await guardDecidable(String(req.params.token));
      if (error === "not_found") return genericNotFound(res);
      if (error === "expired") return res.status(410).json({ success: false, error: { code: "OFFER_EXPIRED", message: "This offer has expired." } });
      if (error === "decided" && offer) {
        return res.status(409).json({ success: false, error: { code: "ALREADY_DECIDED", message: `This offer was already ${offer.status}.` } });
      }
      if (!offer) return genericNotFound(res);

      offer.acceptanceSignature = fullName; // typed-name e-signature + timestamp + IP, per project spec
      offer.acceptanceIp = clientIp(req);
      offer.acceptanceUserAgent = String(req.headers["user-agent"] || "").slice(0, 300);
      offer.acceptedAt = new Date();
      offer.status = "accepted";
      await offer.save();

      // Section 6.1 trigger: portal acceptance → org notification
      notifyOrg({
        organizationId: String(offer.organizationId),
        type: "offer_accepted",
        title: "🎉 Candidate accepted the offer",
        message: `${fullName} accepted the offer (signed via portal from IP ${offer.acceptanceIp}).`,
        link: "/app/offers",
        relatedEntityType: "offer",
        relatedEntityId: String(offer._id),
      });

      res.status(200).json({
        success: true,
        data: {
          status: offer.status,
          acceptedAt: offer.acceptedAt,
          signedAs: offer.acceptanceSignature,
          ip: offer.acceptanceIp,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/v1/portal/offers/:token/reject
router.post(
  "/:token/reject",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const reason = String(req.body?.reason || "").trim().slice(0, 1000);
      const { offer, error } = await guardDecidable(String(req.params.token));
      if (error === "not_found") return genericNotFound(res);
      if (error === "expired") return res.status(410).json({ success: false, error: { code: "OFFER_EXPIRED", message: "This offer has expired." } });
      if (error === "decided" && offer) {
        return res.status(409).json({ success: false, error: { code: "ALREADY_DECIDED", message: `This offer was already ${offer.status}.` } });
      }
      if (!offer) return genericNotFound(res);

      offer.rejectionReason = reason || undefined;
      offer.rejectedAt = new Date();
      offer.status = "rejected";
      await offer.save();

      // Section 6.1 trigger: portal rejection → org notification
      notifyOrg({
        organizationId: String(offer.organizationId),
        type: "offer_rejected",
        title: "Candidate declined the offer",
        message: reason ? `Candidate declined via portal. Reason: ${reason.slice(0, 200)}` : "Candidate declined the offer via the portal.",
        link: "/app/offers",
        relatedEntityType: "offer",
        relatedEntityId: String(offer._id),
      });

      res.status(200).json({ success: true, data: { status: offer.status, rejectedAt: offer.rejectedAt } });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/v1/portal/offers/:token/query — clarification request; does NOT change status
router.post(
  "/:token/query",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const message = String(req.body?.message || "").trim();
      if (message.length < 3 || message.length > 2000) {
        return res.status(400).json({ success: false, error: { code: "BAD_REQUEST", message: "Write your question (3–2000 characters)." } });
      }
      const token = String(req.params.token);
      if (!/^[a-f0-9]{64}$/.test(token)) return genericNotFound(res);
      const offer = await loadOfferByToken(token);
      if (!offer || ["withdrawn", "expired"].includes(offer.status)) return genericNotFound(res);

      offer.clarificationRequests = offer.clarificationRequests || [];
      offer.clarificationRequests.push({ message, askedAt: new Date(), ip: clientIp(req) });
      await offer.save();

      res.status(200).json({ success: true, data: { received: true, message: "Your question has been sent to the hiring team." } });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
