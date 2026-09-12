import { Router } from "express";
import { requireAuth } from "../../middleware/requireAuth";
import { requireTenant } from "../../middleware/tenantGuard";
import { requireRole } from "../../middleware/roleGuard";
import {
  listJobs,
  createJob,
  getJob,
  updateJob,
  updateJobStatus,
  archiveJob,
  getJobAnalytics,
  generateJobDescription,
  getPublicJob,
} from "./job.controller";

const router = Router();

// ── Public routes (no auth) ─────────────────────────────────────────────────
// Must be defined before the auth middleware below
const publicRouter = Router();
publicRouter.get("/:slug", getPublicJob);
export { publicRouter as publicJobRouter };

// ── Protected routes ─────────────────────────────────────────────────────────
router.use(requireAuth, requireTenant);

router.get("/", listJobs);
router.post(
  "/",
  requireRole("org_admin", "hr_head", "recruiter", "hiring_manager"),
  createJob
);

// AI JD generation — must come before /:id routes
router.post(
  "/ai/generate-jd",
  requireRole("org_admin", "hr_head", "recruiter", "hiring_manager"),
  generateJobDescription
);

router.get("/:id", getJob);
router.patch(
  "/:id",
  requireRole("org_admin", "hr_head", "recruiter", "hiring_manager"),
  updateJob
);
router.patch(
  "/:id/status",
  requireRole("org_admin", "hr_head", "recruiter", "hiring_manager"),
  updateJobStatus
);
router.delete(
  "/:id",
  requireRole("org_admin", "hr_head"),
  archiveJob
);
router.get("/:id/analytics", getJobAnalytics);

export default router;
