import mongoose, { Schema, Document } from "mongoose";

export interface IResume extends Document {
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
  createdAt: Date;
  updatedAt: Date;
}

const resumeSchema = new Schema<IResume>(
  {
    candidateId: {
      type: Schema.Types.ObjectId,
      ref: "Candidate",
      required: true,
    },
    fileUrl: {
      type: String,
      required: true,
    },
    fileCloudinaryId: {
      type: String,
      required: true,
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