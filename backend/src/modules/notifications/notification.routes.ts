import { Router, Request, Response, NextFunction } from "express";
import { Notification } from "./notification.model";
import { requireAuth } from "../../middleware/requireAuth";
import { requireTenant } from "../../middleware/tenantGuard";

/**
 * Section 6.1 — Notifications. REST polling only (NO Socket.io, per project
 * invariants): the frontend refetches GET / every ~30s via TanStack Query.
 * Visible set = notifications addressed to me OR org-wide (userId absent).
 */
const router = Router();
router.use(requireAuth, requireTenant);

// GET /api/v1/notifications?unread=true&page=1&limit=20
router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = (req as any).org!._id;
    const userId = (req as any).user!._id;
    const { unread, page = "1", limit = "20" } = req.query as Record<string, string>;

    const filter: Record<string, unknown> = {
      organizationId: orgId,
      $or: [{ userId: userId }, { userId: { $exists: false } }, { userId: null }],
    };
    if (unread === "true") filter.isRead = false;

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(filter).sort({ createdAt: -1 }).skip((pageNum - 1) * limitNum).limit(limitNum),
      Notification.countDocuments(filter),
      Notification.countDocuments({ ...filter, isRead: false }),
    ]);

    res.status(200).json({ success: true, data: { notifications, total, unreadCount, page: pageNum, limit: limitNum } });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/v1/notifications/read-all
router.patch("/read-all", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = (req as any).org!._id;
    const userId = (req as any).user!._id;
    const r = await Notification.updateMany(
      { organizationId: orgId, isRead: false, $or: [{ userId }, { userId: { $exists: false } }, { userId: null }] },
      { $set: { isRead: true, readAt: new Date() } }
    );
    res.status(200).json({ success: true, data: { updated: r.modifiedCount } });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/v1/notifications/:id/read
router.patch("/:id/read", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = (req as any).org!._id;
    const userId = (req as any).user!._id;
    const n = await Notification.findOne({
      _id: req.params.id,
      organizationId: orgId,
      $or: [{ userId }, { userId: { $exists: false } }, { userId: null }],
    });
    if (!n) return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Notification not found" } });
    if (!n.isRead) {
      n.isRead = true;
      n.readAt = new Date();
      await n.save();
    }
    res.status(200).json({ success: true, data: { notification: n } });
  } catch (error) {
    next(error);
  }
});

export default router;
