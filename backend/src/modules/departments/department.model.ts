import mongoose, { Schema, Document } from "mongoose";

export interface IDepartment extends Document {
  organizationId: mongoose.Types.ObjectId;
  name: string;
  headUserId?: mongoose.Types.ObjectId;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const departmentSchema = new Schema<IDepartment>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
    name: { type: String, required: true },
    headUserId: { type: Schema.Types.ObjectId, ref: "User" },
    isArchived: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const Department = mongoose.model<IDepartment>("Department", departmentSchema);
