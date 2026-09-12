import mongoose, { Schema, Document, Types } from "mongoose";

export interface IInterview extends Document {
  organizationId: Types.ObjectId;
  applicationId: Types.ObjectId;
  candidateId: Types.ObjectId;
  jobId: Types.ObjectId;
  type: "hr_screening" | "technical" | "assignment_review" | "managerial" | "cultural" | "final";
  interviewerIds: Types.ObjectId[];
  scheduledAt: Date;
  durationMinutes: number;
  meetingLink?: string;
  location?: string;
  instructions?: string;
  status: "scheduled" | "ongoing" | "completed" | "cancelled" | "rescheduled";
  cancelReason?: string;
  rescheduledFrom?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const interviewSchema = new Schema<IInterview>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    applicationId: {
      type: Schema.Types.ObjectId,
      ref: "CandidateApplication",
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
    type: {
      type: String,
      enum: ["hr_screening", "technical", "assignment_review", "managerial", "cultural", "final"],
      required: true,
    },
    interviewerIds: [{
      type: Schema.Types.ObjectId,
      ref: "User",
    }],
    scheduledAt: {
      type: Date,
      required: true,
    },
    durationMinutes: {
      type: Number,
      default: 30,
    },
    meetingLink: { type: String, sparse: true },
    location: { type: String, sparse: true },
    instructions: { type: String, sparse: true },
    status: {
      type: String,
      enum: ["scheduled", "ongoing", "completed", "cancelled", "rescheduled"],
      default: "scheduled",
    },
    cancelReason: { type: String, sparse: true },
    rescheduledFrom: {
      type: Schema.Types.ObjectId,
      ref: "Interview",
      sparse: true,
    },
  },
  { timestamps: true }
);

interviewSchema.index({ organizationId: 1, applicationId: 1 });
interviewSchema.index({ organizationId: 1, scheduledAt: 1 });

export const Interview = mongoose.model<IInterview>("Interview", interviewSchema);