import { Router, Request, Response, NextFunction } from "express";
import { Resume } from "../modules/resumes/resume.model";
import { Candidate } from "../modules/candidates/candidate.model";
import { requireAuth, requireTenant } from "../../middleware/requireAuth";
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

router.post(
  "/upload",
  requireAuth,
  requireTenant,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.org!._id;
      const candidateId = req.body.candidateId;
      const file = req.file;

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
        candidateId: candidateId || new mongoose.Types.ObjectId(),
        fileUrl: "https://res.cloudinary.com/" + (process.env.CLOUDINARY_CLOUD_NAME || "demo") + "/raw/upload",
        fileCloudinaryId: cloudinaryPublicId,
        originalFilename: file.originalname,
        fileType: file.mimetype.includes("pdf") ? "pdf" : file.mimetype.includes("word") ? "docx" : "pdf",
        parsingStatus: "pending",
      });

      await resume.save();

      if (candidateId) {
        const fileBuffer = Buffer.from(file.buffer);
        const text = extractText(fileBuffer, resume.fileType);
        resume.parsedText = text;
        await resume.save();

        Resume.findByIdAndUpdate(resume._id, {
          parsingStatus: "completed",
          parsedAt: new Date(),
        }).catch(() => {});

        Candidate.findByIdAndUpdate(candidateId, {
          $set: {
            skills: [],
            education: [],
            certifications: [],
            workHistory: [],
            projects: [],
            languages: [],
          },
        }).catch(() => {});
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
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.org!._id;
      const files = req.files;
      const candidateId = req.body.candidateId;

      if (!files || files.length === 0) {
        return res.status(400).json({ success: false, error: { code: "BAD_REQUEST", message: "No files uploaded" } });
      }

      const limit = pLimit(3);
      const results = await Promise.all(
        files.map((file) =>
          limit(async () => {
            const cloudinaryPublicId = "resume_" + Date.now() + "_" + file.originalname.replace(/\s+/g, "_");

            const resume = new Resume({
              candidateId,
              fileUrl: "https://res.cloudinary.com/" + (process.env.CLOUDINARY_CLOUD_NAME || "demo") + "/raw/upload",
              fileCloudinaryId: cloudinaryPublicId,
              originalFilename: file.originalname,
              fileType: file.mimetype.includes("pdf") ? "pdf" : file.mimetype.includes("word") ? "docx" : "pdf",
              parsingStatus: "pending",
            });

            await resume.save();

            if (file.buffer && candidateId) {
              const fileBuffer = Buffer.from(file.buffer);
              const text = extractText(fileBuffer, resume.fileType);
              resume.parsedText = text;
              await resume.save();

              Resume.findByIdAndUpdate(resume._id, {
                parsingStatus: "completed",
                parsedAt: new Date(),
              }).catch(() => {});

              Candidate.findByIdAndUpdate(candidateId, {
                $set: {
                  skills: [],
                  education: [],
                  certifications: [],
                  workHistory: [],
                  projects: [],
                  languages: [],
                },
              }).catch(() => {});
            }

            return {
              filename: file.originalname,
              status: resume.parsingStatus,
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
        organizationId: req.org!._id,
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
        organizationId: req.org!._id,
      });

      if (!resume) {
        return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Resume not found" } });
      }

      Resume.findByIdAndUpdate(resume._id, {
        $set: { parsedData: req.body.parsedData, parsingStatus: "completed" },
      });

      res.status(200).json({
        success: true,
        data: { resume },
      });
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
        organizationId: req.org!._id,
      });

      if (!resume) {
        return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Resume not found" } });
      }

      res.status(200).json({
        success: true,
        data: {
          parsingStatus: resume.parsingStatus,
          parsedAt: resume.parsedAt,
          parseProgress: resume.parsingStatus === "completed" ? 100 : resume.parsingStatus === "processing" ? 50 : 0,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;