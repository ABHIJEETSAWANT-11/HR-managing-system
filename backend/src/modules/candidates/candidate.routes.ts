import { Router, Request, Response, NextFunction } from "express";
import { Candidate } from "./candidate.model";
import { requireAuth } from "../../middleware/requireAuth";
import { requireTenant } from "../../middleware/tenantGuard";

const router = Router();

// GET /api/v1/candidates - List candidates (org-scoped, filterable)
router.get(
  "/",
  requireAuth,
  requireTenant,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.org!._id;
      const { search, skills, experienceMin, experienceMax, location, sortBy, sortOrder } = req.query as Record<string, string>;

      const filter: Record<string, unknown> = { organizationId: orgId, isDeleted: { $ne: true } };
      if (search) filter.fullName = { $regex: search, $options: "i" };
      if (skills) filter.skills = { $in: skills.split(",").map((s) => s.trim()).filter(Boolean) };
      if (location) filter.currentCity = { $regex: location, $options: "i" };
      if (experienceMin || experienceMax) {
        filter.totalExperienceYears = {
          ...(experienceMin ? { $gte: Number(experienceMin) } : {}),
          ...(experienceMax ? { $lte: Number(experienceMax) } : {}),
        };
      }

      const sortField = sortBy === "experience" ? "totalExperienceYears" : "createdAt";
      const sortDir: 1 | -1 = sortOrder === "asc" ? 1 : -1;

      const candidates = await Candidate.find(filter)
        .sort({ [sortField]: sortDir })
        .limit(200);

      res.status(200).json({ success: true, data: { candidates, total: candidates.length } });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/v1/candidates - Create a candidate
router.post(
  "/",
  requireAuth,
  requireTenant,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.org!._id;
      const { fullName, email, phone, ...rest } = req.body;

      if (!fullName) {
        return res.status(400).json({
          success: false,
          error: { code: "BAD_REQUEST", message: "fullName is required" },
        });
      }

      if (email) {
        const existing = await Candidate.findOne({ email, organizationId: orgId, isDeleted: { $ne: true } });
        if (existing) {
          return res.status(409).json({
            success: false,
            error: { code: "CONFLICT", message: "A candidate with this email already exists" },
          });
        }
      }

      const candidate = new Candidate({
        organizationId: orgId,
        fullName,
        email,
        phone,
        ...rest,
        source: rest.source || "manual",
      });
      await candidate.save();

      res.status(201).json({ success: true, data: { candidate } });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/v1/candidates/:id - Candidate detail
router.get(
  "/:id",
  requireAuth,
  requireTenant,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.org!._id;

      const candidate = await Candidate.findOne({
        _id: req.params.id,
        organizationId: orgId,
        isDeleted: { $ne: true },
      });
      if (!candidate) {
        return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Candidate not found" } });
      }

      res.status(200).json({ success: true, data: { candidate } });
    } catch (error) {
      next(error);
    }
  }
);

// PATCH /api/v1/candidates/:id - Update a candidate
router.patch(
  "/:id",
  requireAuth,
  requireTenant,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.org!._id;

      const candidate = await Candidate.findOneAndUpdate(
        { _id: req.params.id, organizationId: orgId, isDeleted: { $ne: true } },
        { $set: req.body },
        { new: true }
      );

      if (!candidate) {
        return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Candidate not found" } });
      }

      res.status(200).json({ success: true, data: { candidate } });
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/v1/candidates/:id - Soft delete a candidate
router.delete(
  "/:id",
  requireAuth,
  requireTenant,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.org!._id;

      const candidate = await Candidate.findOneAndUpdate(
        { _id: req.params.id, organizationId: orgId, isDeleted: { $ne: true } },
        { $set: { isDeleted: true, deletedAt: new Date() } },
        { new: true }
      );

      if (!candidate) {
        return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Candidate not found" } });
      }

      res.status(200).json({ success: true, data: { candidate } });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/v1/candidates/detect-duplicates - Heuristic duplicate groups (same email, or same name+phone)
router.post(
  "/detect-duplicates",
  requireAuth,
  requireTenant,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.org!._id;
      const candidates = await Candidate.find({ organizationId: orgId, isDeleted: { $ne: true } }).lean();

      const groups: { key: string; candidateIds: string[] }[] = [];
      const byEmail = new Map<string, any[]>();
      const byNamePhone = new Map<string, any[]>();

      for (const c of candidates) {
        if (c.email) {
          const k = c.email.toLowerCase();
          byEmail.set(k, [...(byEmail.get(k) ?? []), c]);
        }
        if (c.phone) {
          const k = `${c.fullName.toLowerCase().trim()}|${c.phone.replace(/\D/g, "")}`;
          byNamePhone.set(k, [...(byNamePhone.get(k) ?? []), c]);
        }
      }

      for (const [key, list] of byEmail) {
        if (list.length > 1) groups.push({ key: `email:${key}`, candidateIds: list.map((c) => String(c._id)) });
      }
      for (const [key, list] of byNamePhone) {
        if (list.length > 1) groups.push({ key: `name_phone:${key}`, candidateIds: list.map((c) => String(c._id)) });
      }

      res.status(200).json({ success: true, data: { groups, total: groups.length } });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/v1/candidates/merge - Merge duplicates: keep primary, soft-delete the rest
router.post(
  "/merge",
  requireAuth,
  requireTenant,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.org!._id;
      const { primaryId, duplicateIds } = req.body;

      const primary = await Candidate.findOne({ _id: primaryId, organizationId: orgId, isDeleted: { $ne: true } });
      if (!primary) {
        return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Primary candidate not found" } });
      }

      const dupIds = (duplicateIds ?? []).filter((id: string) => String(id) !== String(primary._id));
      const result = await Candidate.updateMany(
        { _id: { $in: dupIds, $ne: primary._id }, organizationId: orgId },
        { $set: { isDeleted: true, deletedAt: new Date() } }
      );

      res.status(200).json({ success: true, data: { primaryId: primary._id, mergedAway: result.modifiedCount } });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
