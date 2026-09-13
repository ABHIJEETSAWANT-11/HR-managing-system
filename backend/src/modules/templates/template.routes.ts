import { Router, Request, Response, NextFunction } from "express";
import { DocumentTemplate } from "./document-template.model";
import { requireAuth } from "../../middleware/requireAuth";
import { requireTenant } from "../../middleware/tenantGuard";

const router = Router();

const TEMPLATE_TYPES = ["offer_letter", "email", "interview_scorecard", "salary"] as const;

// GET /api/v1/templates - List active templates for this org
router.get(
  "/",
  requireAuth,
  requireTenant,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.org!._id;
      const { type } = req.query as Record<string, string>;

      const filter: Record<string, unknown> = { organizationId: orgId, isActive: true };
      if (type && (TEMPLATE_TYPES as readonly string[]).includes(type)) filter.type = type;

      const templates = await DocumentTemplate.find(filter).sort({ createdAt: -1 });

      res.status(200).json({ success: true, data: { templates, total: templates.length } });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/v1/templates - Create a template
router.post(
  "/",
  requireAuth,
  requireTenant,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.org!._id;
      const { type, name, htmlContent, variables, isDefault } = req.body;

      if (!type || !(TEMPLATE_TYPES as readonly string[]).includes(type)) {
        return res.status(400).json({
          success: false,
          error: { code: "BAD_REQUEST", message: `type must be one of: ${TEMPLATE_TYPES.join(", ")}` },
        });
      }
      if (!name || !htmlContent) {
        return res.status(400).json({
          success: false,
          error: { code: "BAD_REQUEST", message: "name and htmlContent are required" },
        });
      }

      const template = new DocumentTemplate({
        organizationId: orgId,
        type,
        name,
        htmlContent,
        variables: Array.isArray(variables) ? variables : [],
        isDefault: !!isDefault,
        isActive: true,
        createdBy: req.user?._id,
      });
      await template.save();

      res.status(201).json({ success: true, data: { template } });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/v1/templates/:id - Get a single template
router.get(
  "/:id",
  requireAuth,
  requireTenant,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.org!._id;

      const template = await DocumentTemplate.findOne({ _id: req.params.id, organizationId: orgId });
      if (!template) {
        return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Template not found" } });
      }

      res.status(200).json({ success: true, data: { template } });
    } catch (error) {
      next(error);
    }
  }
);

// PATCH /api/v1/templates/:id - Update a template
router.patch(
  "/:id",
  requireAuth,
  requireTenant,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.org!._id;

      const template = await DocumentTemplate.findOne({ _id: req.params.id, organizationId: orgId });
      if (!template) {
        return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Template not found" } });
      }

      const { type, name, htmlContent, variables, isDefault, isActive } = req.body;

      if (type !== undefined) {
        if (!(TEMPLATE_TYPES as readonly string[]).includes(type)) {
          return res.status(400).json({
            success: false,
            error: { code: "BAD_REQUEST", message: `type must be one of: ${TEMPLATE_TYPES.join(", ")}` },
          });
        }
        template.type = type;
      }
      if (name !== undefined) template.name = name;
      if (htmlContent !== undefined) template.htmlContent = htmlContent;
      if (variables !== undefined) template.variables = Array.isArray(variables) ? variables : [];
      if (isDefault !== undefined) template.isDefault = !!isDefault;
      if (isActive !== undefined) template.isActive = !!isActive;

      await template.save();

      res.status(200).json({ success: true, data: { template } });
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/v1/templates/:id - Soft delete (isActive=false)
router.delete(
  "/:id",
  requireAuth,
  requireTenant,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.org!._id;

      const template = await DocumentTemplate.findOne({ _id: req.params.id, organizationId: orgId });
      if (!template) {
        return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Template not found" } });
      }

      template.isActive = false;
      await template.save();

      res.status(200).json({ success: true, data: { template } });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
