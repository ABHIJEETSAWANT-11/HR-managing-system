import mongoose, { Schema, Document, Types } from "mongoose";

export interface INotification extends Document {
  organizationId: Types.ObjectId;
  userId: Types.ObjectId | null; // null/absent = org-wide (all admins/recruiters see it)
  type: string;
  title: string;
  message: string;
  link?: string;
  relatedEntityType?: string;
  relatedEntityId?: Types.ObjectId;
  isRead: boolean;
  readAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", index: true }, // org-wide when absent
    type: { type: String, required: true }, // e.g. interview_scheduled, offer_approved, offer_accepted, offer_rejected
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    link: { type: String },
    relatedEntityType: { type: String },
    relatedEntityId: { type: Schema.Types.ObjectId },
    isRead: { type: Boolean, default: false },
    readAt: { type: Date },
  },
  { timestamps: true }
);

notificationSchema.index({ organizationId: 1, createdAt: -1 });
notificationSchema.index({ organizationId: 1, userId: 1, isRead: 1 });

export const Notification = mongoose.model<INotification>("Notification", notificationSchema);
