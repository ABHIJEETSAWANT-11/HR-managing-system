import mongoose, { Schema, Document } from "mongoose";

export interface IResume extends Document {
  organizationId: mongoose.Types.ObjectId;
  candidateId: mongoose.Types.ObjectId;
  fileUrl: string;
  fileCloudinaryId: string;
  originalFilename: string;
  fileType: string;
  parsingStatus: string;
  parsedText?: string;
  parsedData?: any;
  parsingConfidence?: number;
  resumeQualityScore?: number;
  parsedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const resumeSchema = new Schema<IResume>(
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
    fileUrl: {
      type: String,
      // Optional: resumes live in Mongo (parsedText) when Cloudinary isn't configured
    },
    fileCloudinaryId: {
      type: String,
    },
    originalFilename: {
      type: String,
      required: true,
    },
    fileType: {
      type: String,
      required: true,
    },
    parsingStatus: {
      type: String,
      default: "pending",
    },
    parsedText: {
      type: String,
    },
    parsedData: {
      type: Schema.Types.Mixed,
    },
    parsingConfidence: {
      type: Number,
    },
    resumeQualityScore: {
      type: Number,
    },
  },
  { timestamps: true }
);

export const Resume = mongoose.model<IResume>("Resume", resumeSchema);