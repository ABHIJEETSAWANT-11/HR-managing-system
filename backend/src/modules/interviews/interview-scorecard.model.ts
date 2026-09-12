import mongoose, { Schema, Document, Types } from "mongoose";

export interface IInterviewScorecard extends Document {
  interviewId: Types.ObjectId;
  interviewerId: Types.ObjectId;
  applicationId: Types.ObjectId;
  competencies: { name: string; description: string; rating: number; notes?: string }[];
  overallRating?: number;
  recommendation: "strong_hire" | "hire" | "neutral" | "do_not_hire" | "strong_do_not_hire";
  generalNotes?: string;
  isSubmitted: boolean;
  submittedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const scorecardSchema = new Schema<IInterviewScorecard>(
  {
    interviewId: {
      type: Schema.Types.ObjectId,
      ref: "Interview",
      required: true,
      index: true,
    },
    interviewerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    applicationId: {
      type: Schema.Types.ObjectId,
      ref: "CandidateApplication",
      required: true,
      index: true,
    },
    competencies: [{
      name: { type: String, required: true },
      description: { type: String, sparse: true },
      rating: { type: Number, min: 1, max: 5, required: true },
      notes: { type: String, sparse: true },
    }],
    overallRating: {
      type: Number,
      min: 1,
      max: 5,
    },
    recommendation: {
      type: String,
      enum: ["strong_hire", "hire", "neutral", "do_not_hire", "strong_do_not_hire"],
      required: true,
    },
    generalNotes: { type: String, sparse: true },
    isSubmitted: {
      type: Boolean,
      default: false,
    },
    submittedAt: { type: Date, sparse: true },
  },
  { timestamps: true }
);

// One scorecard per interviewer per interview — unique constraint
scorecardSchema.index({ interviewId: 1, interviewerId: 1 }, { unique: true });

export const InterviewScorecard = mongoose.model<IInterviewScorecard>("InterviewScorecard", scorecardSchema);