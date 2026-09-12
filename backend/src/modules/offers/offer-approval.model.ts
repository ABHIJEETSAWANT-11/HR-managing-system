import mongoose, { Schema, Document, Types } from "mongoose";

export interface IOfferApproval extends Document {
  offerId: Types.ObjectId;
  organizationId: Types.ObjectId;
  approvalConfig: {
    level: number;
    approverRole: string;
    approverId?: Types.ObjectId;
  }[];
  approvals: {
    level: number;
    approverId: Types.ObjectId;
    status: "pending" | "approved" | "rejected" | "changes_requested";
    comments?: string;
    decidedAt: Date;
    offerVersionAtDecision: number;
  }[];
  currentLevel: number;
  overallStatus: "in_progress" | "approved" | "rejected" | "changes_requested";
  createdAt: Date;
  updatedAt: Date;
}

const offerApprovalSchema = new Schema<IOfferApproval>(
  {
    offerId: {
      type: Schema.Types.ObjectId,
      ref: "Offer",
      required: true,
      unique: true,
      index: true,
    },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    approvalConfig: [
      {
        level: { type: Number, required: true },
        approverRole: { type: String, required: true },
        approverId: { type: Schema.Types.ObjectId, sparse: true },
      },
    ],
    approvals: [
      {
        level: { type: Number, required: true },
        approverId: { type: Schema.Types.ObjectId, required: true },
        status: {
          type: String,
          enum: ["pending", "approved", "rejected", "changes_requested"],
          default: "pending",
        },
        comments: { type: String },
        decidedAt: { type: Date, default: Date.now },
        offerVersionAtDecision: { type: Number, required: true },
      },
    ],
    currentLevel: {
      type: Number,
      default: 1,
    },
    overallStatus: {
      type: String,
      enum: ["in_progress", "approved", "rejected", "changes_requested"],
      default: "in_progress",
    },
  },
  { timestamps: true }
);

export const OfferApproval = mongoose.model<IOfferApproval>("OfferApproval", offerApprovalSchema);