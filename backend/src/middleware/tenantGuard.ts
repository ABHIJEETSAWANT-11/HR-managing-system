import { Request, Response, NextFunction } from "express";
import { Organization } from "../modules/organizations/organization.model";

export const requireTenant = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ success: false, error: { code: "UNAUTHORIZED", message: "Authentication required" } });
  }

  try {
    const org = await Organization.findById(req.user.organizationId);
    if (!org) {
      return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Organization not found" } });
    }

    if (!org.isActive) {
      return res.status(403).json({ success: false, error: { code: "FORBIDDEN", message: "Organization account is inactive" } });
    }

    req.org = org;
    next();
  } catch (error) {
    return res.status(500).json({ success: false, error: { code: "INTERNAL_SERVER_ERROR", message: "Failed to fetch organization" } });
  }
};
