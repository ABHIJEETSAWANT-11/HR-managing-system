import { Router } from "express";
import { getMe, listOrgUsers } from "./user.controller";
import { requireAuth } from "../../middleware/requireAuth";
import { requireTenant } from "../../middleware/tenantGuard";
import { requireRole } from "../../middleware/roleGuard";

const router = Router();

router.use(requireAuth);

router.get("/me", getMe);
router.get("/", requireTenant, requireRole("org_admin", "hr_head"), listOrgUsers);

export default router;
