import { Router, Request, Response, NextFunction } from "express";
import { CandidateApplication } from "../applications/application.model";
import { Candidate } from "../candidates/candidate.model";
import { Offer } from "../offers/offer.model";
import { requireAuth } from "../../middleware/requireAuth";
import { requireTenant } from "../../middleware/tenantGuard";

/**
 * Section 6.2 — Reports. Every pipeline is scoped by organizationId FIRST
 * (matching on the _id/foreign field inside the pipeline as well), per the
 * multi-tenancy invariant. All deterministic MongoDB aggregations.
 */
const router = Router();
router.use(requireAuth, requireTenant);

// GET /api/v1/reports/pipeline-summary — candidate counts per pipeline stage
router.get("/pipeline-summary", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = (req as any).org!._id;
    const data = await CandidateApplication.aggregate([
      { $match: { organizationId: orgId, isDeleted: { $ne: true } } },
      { $group: { _id: "$pipelineStage", count: { $sum: 1 }, avgFitScore: { $avg: "$fitScore" } } },
      { $sort: { count: -1 } },
    ]);
    res.status(200).json({ success: true, data: { stages: data } });
  } catch (e) { next(e); }
});

// GET /api/v1/reports/source-quality — applications, hires, per candidate source
router.get("/source-quality", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = (req as any).org!._id;
    const apps = await CandidateApplication.aggregate([
      { $match: { organizationId: orgId, isDeleted: { $ne: true } } },
      { $lookup: { from: "candidates", localField: "candidateId", foreignField: "_id", as: "candidate" } },
      { $unwind: "$candidate" },
      {
        $group: {
          _id: "$candidate.source",
          applications: { $sum: 1 },
          avgFitScore: { $avg: "$fitScore" },
          passedEligibility: { $sum: { $cond: [{ $eq: ["$eligibilityStatus", "passed"] }, 1, 0] } },
          hired: { $sum: { $cond: [{ $eq: ["$pipelineStage", "Joined"] }, 1, 0] } },
        },
      },
      { $addFields: { hireRatePct: { $round: [{ $multiply: [{ $divide: ["$hired", "$applications"] }, 100] }, 1] } } },
      { $sort: { applications: -1 } },
    ]);
    res.status(200).json({ success: true, data: { sources: apps } });
  } catch (e) { next(e); }
});

// GET /api/v1/reports/time-to-hire — days from application to Joined
router.get("/time-to-hire", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = (req as any).org!._id;
    const data = await CandidateApplication.aggregate([
      { $match: { organizationId: orgId, pipelineStage: "Joined", isDeleted: { $ne: true } } },
      {
        $addFields: {
          daysToHire: {
            $dateDiff: { startDate: "$applicationDate", endDate: "$lastActivityAt", unit: "day" },
          },
        },
      },
      {
        $group: {
          _id: null,
          hires: { $sum: 1 },
          avgDays: { $avg: "$daysToHire" },
          minDays: { $min: "$daysToHire" },
          maxDays: { $max: "$daysToHire" },
        },
      },
      { $project: { _id: 0, hires: 1, avgDays: { $round: ["$avgDays", 1] }, minDays: 1, maxDays: 1 } },
    ]);
    res.status(200).json({ success: true, data: data[0] || { hires: 0, avgDays: null, minDays: null, maxDays: null } });
  } catch (e) { next(e); }
});

// GET /api/v1/reports/offer-analytics
router.get("/offer-analytics", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = (req as any).org!._id;
    const data = await Offer.aggregate([
      { $match: { organizationId: orgId } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          avgCTC: { $avg: "$salaryStructure.annualCTC" },
        },
      },
      { $addFields: { avgCTC: { $round: ["$avgCTC", 0] } } },
      { $sort: { count: -1 } },
    ]);
    const total = data.reduce((s, d) => s + d.count, 0);
    const accepted = data.find((d) => d._id === "accepted")?.count || 0;
    const rejected = data.find((d) => d._id === "rejected")?.count || 0;
    const acceptRatePct = accepted + rejected > 0 ? Math.round((accepted / (accepted + rejected)) * 100) : null;
    res.status(200).json({ success: true, data: { byStatus: data, totalSentDecided: accepted + rejected, acceptRatePct } });
  } catch (e) { next(e); }
});

// GET /api/v1/reports/industries — candidate distribution by current company industry proxy (employer)
router.get("/industries", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = (req as any).org!._id;
    const data = await Candidate.aggregate([
      { $match: { organizationId: orgId, isDeleted: { $ne: true } } },
      { $lookup: { from: "jobs", localField: "_id", foreignField: "candidateId", as: "irrelevant" } },
      { $project: { employer: { $arrayElemAt: ["$workHistory.company", 0] } } },
      { $group: { _id: "$employer", candidates: { $sum: 1 } } },
      { $sort: { candidates: -1 } },
      { $limit: 12 },
    ]);
    res.status(200).json({ success: true, data: { industries: data.filter((d) => d._id) } });
  } catch (e) { next(e); }
});

// GET /api/v1/reports/countries — candidate distribution by currentCity (India-first: city-level)
router.get("/countries", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = (req as any).org!._id;
    const data = await Candidate.aggregate([
      { $match: { organizationId: orgId, isDeleted: { $ne: true } } },
      { $group: { _id: "$currentCity", candidates: { $sum: 1 } } },
      { $sort: { candidates: -1 } },
      { $limit: 12 },
    ]);
    res.status(200).json({ success: true, data: { locations: data.filter((d) => d._id) } });
  } catch (e) { next(e); }
});

export default router;
