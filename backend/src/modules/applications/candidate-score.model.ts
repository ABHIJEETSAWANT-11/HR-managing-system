import mongoose, { Schema, Document, Types } from "mongoose";

/**
 * Section 3.1 — CandidateScore: deterministic Fit Score record, one per application
 * (unique index). Gemini NEVER writes overallScore or any number here; it only
 * contributes the `explanation` prose, validated separately (score.service.ts).
 */
export interface ICandidateScore extends Document {
  organizationId: Types.ObjectId;
  applicationId: Types.ObjectId;
  overallScore: number;
  breakdown: Record<
    string,
    { score: number; weight: number; details: string }
  >;
  eligibilityChecks: {
    requirementId: string;
    requirementName: string;
    type: "mandatory" | "preferred";
    status: "passed" | "failed" | "info_unavailable";
  }[];
  explanation?: {
    strengths: string[];
    missing: string[];
    gaps: string[];
    unavailableInfo: string[];
    summary: string;
  };
  scoringConfigSnapshot: Record<string, unknown>;
  geminiModelVersion?: string;
  isOverridden: boolean;
  overrideReason?: string;
  overriddenBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const candidateScoreSchema = new Schema<ICandidateScore>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    applicationId: { type: Schema.Types.ObjectId, ref: "CandidateApplication", required: true, unique: true, index: true },
    overallScore: { type: Number, required: true, min: 0, max: 100 },
    breakdown: {
      type: Schema.Types.Mixed,
      required: true,
    },
    eligibilityChecks: [
      {
        requirementId: String,
        requirementName: String,
        type: { type: String, enum: ["mandatory", "preferred"] },
        status: { type: String, enum: ["passed", "failed", "info_unavailable"] },
      },
    ],
    explanation: {
      strengths: [String],
      missing: [String],
      gaps: [String],
      unavailableInfo: [String],
      summary: String,
    },
    scoringConfigSnapshot: { type: Schema.Types.Mixed, required: true },
    geminiModelVersion: String,
    isOverridden: { type: Boolean, default: false },
    overrideReason: String,
    overriddenBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export const CandidateScore = mongoose.model<ICandidateScore>("CandidateScore", candidateScoreSchema);
