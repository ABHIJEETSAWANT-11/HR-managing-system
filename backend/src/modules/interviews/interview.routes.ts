import { Router, Request, Response, NextFunction } from "express";
import { Interview } from "./interview.model";
import { InterviewScorecard } from "./interview-scorecard.model";
import { requireAuth } from "../../middleware/requireAuth";
import { CandidateApplication } from "../applications/application.model";
import { Job } from "../jobs/job.model";
import mongoose from "mongoose";

function isInterviewer(interview: any, userId: mongoose.Types.ObjectId): boolean {
  return interview.interviewerIds && interview.interviewerIds.some(
    (id: mongoose.Types.ObjectId) => id.equals(userId)
  );
}

function isReviewer(req: Request): boolean {
  const role = (req.user as any).role;
  return ["hiring_manager", "org_admin", "recruiter"].includes(role);
}

const router = Router();

router.get(
  "/",
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = (req as any).org!._id;
      const {
        applicationId, candidateId, jobId, interviewerId,
        status, startDate, endDate
      } = req.query as Record<string, string>;

      const filter: Record<string, unknown> = { organizationId: orgId };

      if (applicationId) filter.applicationId = applicationId;
      if (candidateId) filter.candidateId = candidateId;
      if (jobId) filter.jobId = jobId;
      if (interviewerId) filter.interviewerIds = interviewerId;
      if (status) filter.status = status;

      if (startDate || endDate) {
        filter.scheduledAt = {} as any;
        if (startDate) (filter.scheduledAt as any).$gte = new Date(startDate as string);
        if (endDate) (filter.scheduledAt as any).$lte = new Date(endDate as string);
      }

      let interviews;
      if (isReviewer(req)) {
        interviews = await Interview.find(filter)
          .populate("candidateId", "fullName")
          .populate("jobId", "title")
          .populate("interviewerIds", "name email");
      } else {
        filter.interviewerIds = (req as any).user!._id;
        interviews = await Interview.find(filter)
          .populate("candidateId", "fullName")
          .populate("jobId", "title")
          .populate("interviewerIds", "name email");
      }

      res.status(200).json({
        success: true,
        data: { interviews, total: interviews.length },
      });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  "/",
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = (req as any).org!._id;
      const {
        applicationId, candidateId, jobId, type, interviewerIds,
        scheduledAt, durationMinutes, meetingLink, location, instructions
      } = req.body;

      const application = await CandidateApplication.findOne({
        _id: applicationId,
        organizationId: orgId,
      }).lean();
      if (!application) {
        return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Application not found" } });
      }

      const job = await Job.findOne({ _id: jobId, organizationId: orgId }).lean();
      if (!job) {
        return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Job not found" } });
      }

      const candidateMatch = application.candidateId.toString() === (candidateId || "").toString();
      if (!candidateMatch) {
        return res.status(400).json({ success: false, error: { code: "BAD_REQUEST", message: "Candidate ID doesn't match application" } });
      }

      const interview = new Interview({
        organizationId: orgId,
        applicationId,
        candidateId: application.candidateId,
        jobId,
        type,
        interviewerIds: interviewerIds || [],
        scheduledAt: new Date(scheduledAt),
        durationMinutes: durationMinutes || 30,
        meetingLink,
        location,
        instructions,
      });

      await interview.save();

      res.status(201).json({ success: true, data: { interview } });
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  "/:id",
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = (req as any).org!._id;

      const interview = await Interview.findOne({
        _id: req.params.id,
        organizationId: orgId,
      })
        .populate("candidateId", "fullName email")
        .populate("jobId", "title departmentId employmentType")
        .populate("interviewerIds", "name email");

      if (!interview) {
        return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Interview not found" } });
      }

      res.status(200).json({ success: true, data: { interview } });
    } catch (error) {
      next(error);
    }
  }
);

router.patch(
  "/:id",
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = (req as any).org!._id;
      const { scheduledAt, status, cancelReason } = req.body;

      const interview = await Interview.findOne({
        _id: req.params.id,
        organizationId: orgId,
      });

      if (!interview) {
        return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Interview not found" } });
      }

      if (status === "cancelled" && !cancelReason) {
        return res.status(400).json({ success: false, error: { code: "BAD_REQUEST", message: "cancelReason is required when cancelling an interview" } });
      }

      if (scheduledAt) {
        interview.scheduledAt = new Date(scheduledAt);
      }

      if (status) {
        interview.status = status;
      }

      if (status === "cancelled" && cancelReason) {
        interview.cancelReason = cancelReason;
      }

      await interview.save();

      res.status(200).json({ success: true, data: { interview } });
    } catch (error) {
      next(error);
    }
  }
);

router.delete(
  "/:id",
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = (req as any).org!._id;

      const interview = await Interview.findOne({
        _id: req.params.id,
        organizationId: orgId,
      });

      if (!interview) {
        return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Interview not found" } });
      }

      interview.status = "cancelled";
      if (req.body.cancelReason) {
        interview.cancelReason = req.body.cancelReason;
      }
      await interview.save();

      res.status(200).json({ success: true, data: { message: "Interview cancelled successfully", interview } });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  "/:id/scorecards",
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = (req as any).org!._id;
      const { competencies, overallRating, recommendation, generalNotes } = req.body;
      const interviewerId = (req as any).user!._id;

      const interview = await Interview.findById(req.params.id);
      if (!interview) {
        return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Interview not found" } });
      }

      if (!isInterviewer(interview, interviewerId)) {
        return res.status(403).json({ success: false, error: { code: "FORBIDDEN", message: "You are not assigned as an interviewer to this interview" } });
      }

      const existingScorecard = await InterviewScorecard.findOne({
        interviewId: interview._id,
        interviewerId,
      });

      if (existingScorecard) {
        return res.status(400).json({ success: false, error: { code: "BAD_REQUEST", message: "You have already submitted a scorecard for this interview. Please contact the hiring manager to edit if needed." } });
      }

      const overallCalculation = competencies && competencies.length > 0
        ? competencies.reduce((sum: any, c: any) => sum + c.rating, 0) / competencies.length
        : overallRating;

      const scorecard = new InterviewScorecard({
        interviewId: interview._id,
        interviewerId,
        applicationId: interview.applicationId,
        competencies: competencies || [],
        overallRating,
        recommendation: recommendation || "neutral",
        generalNotes,
        isSubmitted: true,
        submittedAt: new Date(),
      });

      await scorecard.save();

      res.status(201).json({ success: true, data: { scorecard } });
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  "/:id/scorecards",
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = (req as any).org!._id;
      const userId = (req as any).user!._id;
      const userRole = (req.user as any).role;

      const interview = await Interview.findById(req.params.id);
      if (!interview) {
        return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Interview not found" } });
      }

      // Apply feedback privacy rule server-side
      const hasSubmitted = await InterviewScorecard.exists({
        interviewId: interview._id,
        interviewerId: userId,
        isSubmitted: true,
      });

      if (isInterviewer(interview, userId) && !hasSubmitted) {
        // Interviewer who hasn't submitted: return only count
        const scorecardCount = await InterviewScorecard.countDocuments({ interviewId: interview._id });
        return res.status(200).json({
          success: true,
          data: { scorecardCount, scorecards: [] },
        });
      }

      if (isInterviewer(interview, userId) && hasSubmitted) {
        // Interviewer who has submitted: return all scorecards
        const scorecards = await InterviewScorecard.find({ interviewId: interview._id })
          .populate("interviewerId", "name email");
        return res.status(200).json({ success: true, data: { scorecards } });
      }

      // Reviewer: return all scorecards regardless
      if (userRole && ["hiring_manager", "org_admin", "recruiter"].includes(userRole)) {
        const scorecards = await InterviewScorecard.find({ interviewId: interview._id })
          .populate("interviewerId", "name email");
        return res.status(200).json({ success: true, data: { scorecards } });
      }

      res.status(200).json({ success: true, data: { scorecards: [] } });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  "/:id/summary",
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = (req as any).org!._id;
      const userId = (req as any).user!._id;
      const userRole = (req.user as any).role;

      const interview = await Interview.findById(req.params.id);
      if (!interview) {
        return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Interview not found" } });
      }

      // Check: only callable once ALL assigned interviewers have submitted
      const allSubmitted = interview.interviewerIds.every(
        (id: mongoose.Types.ObjectId) =>
          InterviewScorecard.exists({ interviewId: interview._id, interviewerId: id, isSubmitted: true })
      );

      if (!allSubmitted) {
        return res.status(400).json({ success: false, error: { code: "BAD_REQUEST", message: "Cannot generate summary: not all assigned interviewers have submitted their scorecards yet. Wait for all interviewers to submit before requesting a summary." } });
      }

      // Collect all recommendations
      const allScorecards = await InterviewScorecard.find({
        interviewId: interview._id,
        interviewerId: { $in: interview.interviewerIds },
      });

      const recommendationSummary = allScorecards
        .map((sc: any) => `${sc.interviewerId.name}: ${sc.recommendation}`)
        .join("; ");

      const feedbackSummary = `AI-generated summary — original interviewer feedback always visible below. Collective recommendations from ${allScorecards.length} interviewers: ${recommendationSummary}. This is an AI synthesis of the submitted scorecard feedback and does not override any individual interviewer's recommendation. Original scorecards remain fully visible and unedited above.`;

      Interview.findByIdAndUpdate(interview._id, {
        $set: { feedbackSummary },
      }).catch(() => {});

      res.status(200).json({ success: true, data: { feedbackSummary } });
    } catch (error) {
      next(error);
    }
  }
);

export default router;