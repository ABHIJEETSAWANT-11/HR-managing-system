import mongoose, { Schema, Document, Types } from "mongoose";

export interface IDocumentTemplate extends Document {
  organizationId: Types.ObjectId;
  type: "offer_letter" | "email" | "interview_scorecard" | "salary";
  name: string;
  htmlContent: string;
  variables: string[];
  version: number;
  isDefault: boolean;
  isActive: boolean;
  createdBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const documentTemplateSchema = new Schema<IDocumentTemplate>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["offer_letter", "email", "interview_scorecard", "salary"],
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    htmlContent: {
      type: String,
      required: true,
    },
    variables: {
      type: [String],
      default: [],
    },
    version: {
      type: Number,
      default: 1,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: { type: Schema.Types.ObjectId, sparse: true },
  },
  { timestamps: true }
);

documentTemplateSchema.index({ organizationId: 1, type: 1 });

export const DocumentTemplate = mongoose.model<IDocumentTemplate>("DocumentTemplate", documentTemplateSchema);