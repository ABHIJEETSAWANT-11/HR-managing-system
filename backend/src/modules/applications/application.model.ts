import mongoose, { Schema, Document } from "mongoose";

export interface ICandidateApplication extends Document {
  organizationId: mongoose.Types.ObjectId;
  candidateId: mongoose.Types.ObjectId;
  jobId: mongoose.Types.ObjectId;
  pipelineStage: string;
  fitScore?: number;
  eligibilityStatus: "passed" | "failed" | "pending" | "not_evaluated";
  recruiterOwnerId?: mongoose.Types.ObjectId;
  screeningAnswers: [{ question: string; answer: string }];
  isDeleted: boolean;
  status: "active" | "withdrawn" | "rejected" | "duplicate";
  applicationDate: Date;
  lastActivityAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const applicationSchema = new Schema<ICandidateApplication>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    candidateId: {
      type: Schema.Types.ObjectId,
      ref: "Candidate",
      required: true,
    },
    jobId: {
      type: Schema.Types.ObjectId,
      ref: "Job",
      required: true,
    },
    pipelineStage: {
      type: String,
      default: "Applied",
    },
    fitScore: {
      type: Number,
    },
    eligibilityStatus: {
      type: String,
      enum: ["passed", "failed", "pending", "not_evaluated"],
      default: "not_evaluated",
    },
    recruiterOwnerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    screeningAnswers: [
      {
        question: { type: String, required: true },
        answer: { type: String, required: true },
      },
    ],
    isDeleted: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ["active", "withdrawn", "rejected", "duplicate"],
      default: "active",
    },
    applicationDate: {
      type: Date,
      default: Date.now,
    },
    lastActivityAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Index for Kanban board constant queries
applicationSchema.index({ organizationId: 1, jobId: 1, pipelineStage: 1 });

export const CandidateApplication = mongoose.model<ICandidateApplication>("CandidateApplication", applicationSchema);