import { Request, Response, NextFunction } from "express";
import { Job } from "./job.model";
import { nanoid } from "nanoid";

// Utility: generate a URL-safe slug
const makeSlug = (title: string) =>
  title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "") +
  "-" +
  nanoid(6);

// GET /api/v1/jobs
export const listJobs = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = req.org!._id;
    const { status, search, page = "1", limit = "20" } = req.query as Record<string, string>;

    const filter: Record<string, unknown> = { organizationId: orgId };
    if (status) filter.status = status;
    if (search) filter.title = { $regex: search, $options: "i" };

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    const [jobs, total] = await Promise.all([
      Job.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate("departmentId", "name")
        .populate("hiringManagerId", "name email")
        .populate("recruiterId", "name email"),
      Job.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: { jobs, total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum) },
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/v1/jobs
export const createJob = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = req.org!._id;
    const createdBy = req.user!._id;

    const slug = makeSlug(req.body.title);

    const job = new Job({ ...req.body, organizationId: orgId, createdBy, publicSlug: slug });
    await job.save();

    res.status(201).json({ success: true, data: { job } });
  } catch (error) {
    next(error);
  }
};

// GET /api/v1/jobs/:id
export const getJob = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const job = await Job.findOne({ _id: req.params.id, organizationId: req.org!._id })
      .populate("departmentId", "name")
      .populate("hiringManagerId", "name email")
      .populate("recruiterId", "name email");

    if (!job) return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Job not found" } });

    res.status(200).json({ success: true, data: { job } });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/v1/jobs/:id
export const updateJob = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Prevent changing organizationId
    delete req.body.organizationId;
    delete req.body.createdBy;
    delete req.body.publicSlug;

    const job = await Job.findOneAndUpdate(
      { _id: req.params.id, organizationId: req.org!._id },
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!job) return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Job not found" } });

    res.status(200).json({ success: true, data: { job } });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/v1/jobs/:id/status
export const updateJobStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status } = req.body;
    const allowedStatuses = ["draft", "awaiting_approval", "open", "paused", "closed", "filled", "archived"];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ success: false, error: { code: "BAD_REQUEST", message: "Invalid status" } });
    }

    const job = await Job.findOneAndUpdate(
      { _id: req.params.id, organizationId: req.org!._id },
      { $set: { status } },
      { new: true }
    );

    if (!job) return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Job not found" } });

    res.status(200).json({ success: true, data: { job } });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/v1/jobs/:id  (soft archive)
export const archiveJob = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const job = await Job.findOneAndUpdate(
      { _id: req.params.id, organizationId: req.org!._id },
      { $set: { status: "archived" } },
      { new: true }
    );

    if (!job) return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Job not found" } });

    res.status(200).json({ success: true, data: { message: "Job archived successfully" } });
  } catch (error) {
    next(error);
  }
};

// GET /api/v1/jobs/:id/analytics
export const getJobAnalytics = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const job = await Job.findOne({ _id: req.params.id, organizationId: req.org!._id });
    if (!job) return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Job not found" } });

    // Placeholder analytics — real counts will come from CandidateApplication later
    res.status(200).json({
      success: true,
      data: { jobId: req.params.id, totalApplications: 0, shortlisted: 0, hired: 0 },
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/v1/jobs/ai/generate-jd  (Gemini JD generation — DRAFT only)
export const generateJobDescription = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { title, industry, minExperience, skills, location, employmentType } = req.body;

    // Lazy import to avoid crashing if GEMINI_API_KEY is not set
    const { GoogleGenAI } = await import("@google/genai");
    const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

    const prompt = `Generate a professional job description for a ${title} role.
Industry: ${industry || "Technology"}
Experience Required: ${minExperience || 0}+ years
Key Skills: ${Array.isArray(skills) ? skills.join(", ") : skills || "Not specified"}
Location: ${location || "India"}
Employment Type: ${employmentType || "Full-time"}

Return ONLY valid JSON with keys: "description" (2-3 paragraphs), "responsibilities" (bullet list as single string), "requirements" (bullet list as single string).
Label it clearly as AI-generated draft. Keep it professional and concise.`;

    const response = await genAI.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });

    const rawText = response.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    // Strip markdown code fences if present
    const cleaned = rawText.replace(/```json\n?|\n?```/g, "").trim();

    let parsed: { description: string; responsibilities: string; requirements: string };
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      return res.status(502).json({
        success: false,
        error: { code: "AI_PARSE_ERROR", message: "AI returned unexpected format. Please try again." },
      });
    }

    res.status(200).json({
      success: true,
      data: {
        draft: parsed,
        aiGenerated: true,
        notice: "AI-generated draft — review and edit before publishing.",
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/v1/public/jobs/:slug  (public — no auth)
export const getPublicJob = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const job = await Job.findOne({ publicSlug: req.params.slug, status: "open" })
      .select("-organizationId -createdBy -hiringManagerId -recruiterId")
      .populate("departmentId", "name");

    if (!job) return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Job not found or no longer accepting applications" } });

    res.status(200).json({ success: true, data: { job } });
  } catch (error) {
    next(error);
  }
};
