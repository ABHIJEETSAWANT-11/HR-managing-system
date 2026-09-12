import mongoose, { Schema, Document } from "mongoose";

export interface IOrganization extends Document {
  name: string;
  logoUrl?: string;
  logoCloudinaryId?: string;
  industry?: string;
  size?: string;
  website?: string;
  address?: string;
  country?: string;
  timezone?: string;
  currency?: string;
  dateFormat?: string;
  isActive: boolean;
  plan: string;
  dataRetentionMonths: number;
  createdAt: Date;
  updatedAt: Date;
}

const organizationSchema = new Schema<IOrganization>(
  {
    name: { type: String, required: true },
    logoUrl: { type: String },
    logoCloudinaryId: { type: String },
    industry: { type: String },
    size: { type: String },
    website: { type: String },
    address: { type: String },
    country: { type: String },
    timezone: { type: String, default: "UTC" },
    currency: { type: String, default: "USD" },
    dateFormat: { type: String, default: "YYYY-MM-DD" },
    isActive: { type: Boolean, default: true },
    plan: { type: String, default: "free" },
    dataRetentionMonths: { type: Number, default: 24 },
  },
  { timestamps: true }
);

export const Organization = mongoose.model<IOrganization>("Organization", organizationSchema);
