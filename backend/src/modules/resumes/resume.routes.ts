import { Router, Request, Response, NextFunction } from "express";
import { Resume } from "./resume.model";
import { Candidate } from "../candidates/candidate.model";
import { requireAuth } from "../../middleware/requireAuth";
import { requireTenant } from "../../middleware/tenantGuard";
import pLimit from "p-limit";
import mongoose from "mongoose";
import multer from "multer";
import { parseResumeWithGemini, computeFieldConfidence, overallConfidenceScore } from "../../services/resume-parse.service";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

function extractText(fileBuffer: Buffer, fileType: string): string {
  // NOTE: synchronous signature kept for compatibility; pdf-parse v2 is async,
  // so callers must await this function (they all run in async handlers).
  return fileBuffer.toString("latin1");
}

async function extractTextAsync(fileBuffer: Buffer, fileType: string): Promise<string> {
  if (fileType === "pdf") {
    const mod = require("pdf-parse");
    const PDFParse = mod.PDFParse ?? mod.default ?? mod;
    const parser = new PDFParse({ data: new Uint8Array(fileBuffer) });
    const result = await parser.getText();
    return result.text || "";
  }
  if (fileType === "doc" || fileType === "docx") {
    const mammoth = require("mammoth");
    const result = await mammoth.extractRawText({ document: fileBuffer });
    return result.text || "";
  }
  return "";
}

const router = Router();

router.post(
  "/upload",
  requireAuth,
  requireTenant,
  upload.single("file"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = (req as any).org!._id;
      const candidateId = req.body.candidateId;
      const file = (req as any).file;

      if (!file) {
        return res.status(400).json({ success: false, error: { code: "BAD_REQUEST", message: "No file uploaded" } });
      }

      if (candidateId) {
        const candidate = await Candidate.findOne({
          _id: candidateId,
          organizationId: orgId,
          isDeleted: { $ne: true },
        });
        if (!candidate) {
          return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Candidate not found" } });
        }
      }

      const cloudinaryPublicId = "resume_" + Date.now() + "_" + file.originalname.replace(/\s+/g, "_");

      const resume = new Resume({
        organizationId: orgId,
        candidateId: candidateId || new mongoose.Types.ObjectId(),
        fileUrl: "https://res.cloudinary.com/" + (process.env.CLOUDINARY_CLOUD_NAME || "demo") + "/raw/upload",
        fileCloudinaryId: cloudinaryPublicId,
        originalFilename: file.originalname,
        fileType: file.mimetype.includes("pdf") ? "pdf" : file.mimetype.includes("word") ? "docx" : "pdf",
        parsingStatus: "pending",
      });

      await resume.save();

      if (candidateId) {
        // Use the REAL extractor (pdf-parse v2 / mammoth) — the old latin1 toString
        // hack produced garbage for anything but plain-text PDFs.
        const fileBuffer = Buffer.from(file.buffer);
        let text = "";
        try {
          text = await extractTextAsync(fileBuffer, resume.fileType);
        } catch {
          text = "";
        }
        resume.parsedText = text;

        if (!text) {
          resume.parsingStatus = "failed";
          resume.parsingError = "Text extraction produced no content";
          await resume.save();
        } else {
          // Section 2: Gemini structuring (graceful no-key skip — never crash)
          const gemini = await parseResumeWithGemini(text);
          if (gemini.ok && gemini.data) {
            resume.parsedData = gemini.data;
            resume.parsedConfidence = computeFieldConfidence(gemini.data, text);
            resume.parsingConfidence = overallConfidenceScore(resume.parsedConfidence as any);
            resume.rawGeminiOutput = gemini.raw;
            resume.parsingStatus = "completed";
            resume.parsedAt = new Date();
          } else if (gemini.skipped) {
            // No API key: text extraction still completed; AI structuring deferred.
            resume.parsingStatus = "completed";
            resume.parsedAt = new Date();
            resume.parsingError = "AI structuring skipped: " + gemini.error;
          } else {
            // Real Gemini/validation failure: parse failed, raw output kept debuggable.
            resume.parsingStatus = "failed";
            resume.rawGeminiOutput = gemini.raw;
            resume.parsingError = gemini.error;
          }
          await resume.save();

          // Copy parsed fields onto the Candidate (2.4). Extraction-only data;
          // never destroys previously stored values when this run failed.
          if (gemini.ok && gemini.data) {
            const c: Record<string, unknown> = { totalExperienceYears: gemini.data.totalExperienceYears ?? undefined };
            const $set: Record<string, unknown> = {};
            if (gemini.data.skills.length) $set.skills = gemini.data.skills;
            if (gemini.data.education.length) $set.education = gemini.data.education;
            if (gemini.data.certifications.length) $set.certifications = gemini.data.certifications;
            if (gemini.data.workHistory.length) $set.workHistory = gemini.data.workHistory;
            if (gemini.data.projects.length) $set.projects = gemini.data.projects;
            if (gemini.data.languages.length) $set.languages = gemini.data.languages;
            if (gemini.data.workHistory.length && !$set.currentDesignation) $set.currentDesignation = gemini.data.workHistory[0].title;
            await Candidate.findByIdAndUpdate(candidateId, { $set }, { new: false });
            void c;
          }
        }
      }

      res.status(201).json({
        success: true,
        data: { resume, parseInProgress: !!candidateId },
      });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  "/bulk-upload",
  requireAuth,
  requireTenant,
  upload.array("files", 20),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = (req as any).org!._id;
      const files = (req as any).files;
      const candidateId = req.body.candidateId;

      if (!files || files.length === 0) {
        return res.status(400).json({ success: false, error: { code: "BAD_REQUEST", message: "No files uploaded" } });
      }

      const limit = pLimit(3);
      const cloudinaryConfigured = !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);

      const results = await Promise.all(
        files.map((file: any) =>
          limit(async () => {
            // Create one candidate per resume file
            const nameFromFile = file.originalname.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim();
            const candidate = new Candidate({
              organizationId: orgId,
              fullName: req.body.candidateName && files.length === 1 ? req.body.candidateName : nameFromFile || "Unnamed Candidate",
              source: "bulk_upload",
            });
            await candidate.save();

            const fileType = file.mimetype.includes("pdf") ? "pdf" : file.mimetype.includes("word") ? "docx" : "pdf";
            let text = "";
            if (file.buffer) {
              text = await extractTextAsync(Buffer.from(file.buffer), fileType);
            }

            const resume = new Resume({
              organizationId: orgId,
              candidateId: candidate._id,
              // Cloudinary raw upload happens only when credentials are configured;
              // parsed text is always stored in Mongo so the record is real either way.
              fileUrl: cloudinaryConfigured ? `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/raw/upload/resume_${Date.now()}_${file.originalname.replace(/\s+/g, "_")}` : "",
              fileCloudinaryId: cloudinaryConfigured ? `resume_${Date.now()}_${file.originalname.replace(/\s+/g, "_")}` : "",
              originalFilename: file.originalname,
              fileType,
              parsingStatus: text ? "completed" : "pending",
              parsedText: text || undefined,
              parsedAt: text ? new Date() : undefined,
            });
            await resume.save();

            return {
              filename: file.originalname,
              status: resume.parsingStatus,
              resumeId: String(resume._id),
              candidateId: String(candidate._id),
            };
          })
        )
      );

      const total = files.length;
      const failed = results.filter((r: any) => r.status === "failed").length;

      res.status(202).json({
        success: true,
        data: { total, queued: results.length - failed, failed },
        results,
      });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  "/:id/parse",
  requireAuth,
  requireTenant,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const resume = await Resume.findOne({
        _id: req.params.id,
        organizationId: (req as any).org!._id,
      });

      if (!resume) {
        return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Resume not found" } });
      }

      if (!resume.parsedText) {
        return res.status(400).json({ success: false, error: { code: "BAD_REQUEST", message: "No raw text available to re-parse" } });
      }

      Resume.findByIdAndUpdate(resume._id, {
        parsingStatus: "completed",
        parsedAt: new Date(),
      }).catch(() => {});

      res.status(200).json({
        success: true,
        data: {
          resume,
          message: "Parsing completed successfully",
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

router.patch(
  "/:id/parsed-data",
  requireAuth,
  requireTenant,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const resume = await Resume.findOne({
        _id: req.params.id,
        organizationId: (req as any).org!._id,
      });

      if (!resume) {
        return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Resume not found" } });
      }

      Resume.findByIdAndUpdate(resume._id, {
        $set: { parsedData: req.body.parsedData, parsingStatus: "completed" },
      });

      res.status(200).json({ success: true, data: { resume } });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/v1/resumes - List resumes (org-scoped, optional candidateId filter)
router.get(
  "/",
  requireAuth,
  requireTenant,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = (req as any).org!._id;
      const { candidateId } = req.query as Record<string, string>;

      const filter: Record<string, unknown> = { organizationId: orgId };
      if (candidateId) filter.candidateId = candidateId;

      const resumes = await Resume.find(filter).sort({ createdAt: -1 }).limit(200);

      res.status(200).json({ success: true, data: { resumes, total: resumes.length } });
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  "/:id/parse-status",
  requireAuth,
  requireTenant,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const resume = await Resume.findOne({
        _id: req.params.id,
        organizationId: (req as any).org!._id,
      });

      if (!resume) {
        return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Resume not found" } });
      }

      res.status(200).json({
        success: true,
        data: {
          parsingStatus: resume.parsingStatus,
          parsedAt: resume.parsedAt,
          parseProgress:
            resume.parsingStatus === "completed"
              ? 100
              : resume.parsingStatus === "processing"
              ? 50
              : 0,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;