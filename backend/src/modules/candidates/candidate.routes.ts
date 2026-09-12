import { Router, Request, Response, NextFunction } from "express";
import { Candidate } from "./candidate.model";
import { Resume } from "../resumes/resume.model";
import { CandidateApplication } from "../applications/application.model";
import { requireAuth, requireTenant } from "../../middleware/tenantGuard";
import pLimit from "p-limit";

function extractText(fileBuffer: Buffer, fileType: string): string {
  if (fileType === "pdf") {
    const pdfParse = require("pdf-parse");
    const data = pdfParse(fileBuffer);
    return data.text || "";
  }
  if (fileType === "doc" || fileType === "docx") {
    const mammoth = require("mammoth");
    const result = mammoth.extractRawText({ document: fileBuffer });
    return result.text || "";
  }
  return "";
}

const router = Router();

router.get(
  "/",
  requireAuth,
  requireTenant,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.org!._id;
      res.status(200).json({ success: true, data: [] });
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
      res.status(201).json({ success: true, data: {} });
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
      res.status(200).json({ success: true, data: {} });
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
      res.status(200).json({ success: true, data: {} });
    } catch (error) {
      next(error);
    }
  }
);

router.delete(
  "/:id",
  requireAuth,
  requireTenant,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.status(200).json({ success: true, data: {} });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  "/compare",
  requireAuth,
  requireTenant,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.status(200).json({ success: true, data: {} });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  "/detect-duplicates",
  requireAuth,
  requireTenant,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.status(200).json({ success: true, data: {} });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  "/merge",
  requireAuth,
  requireTenant,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.status(200).json({ success: true, data: {} });
    } catch (error) {
      next(error);
    }
  }
);

export default router;