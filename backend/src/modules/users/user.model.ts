import mongoose, { Schema, Document } from "mongoose";

export type UserRole = 
  | "super_admin" 
  | "org_admin" 
  | "recruiter" 
  | "hiring_manager" 
  | "interviewer" 
  | "finance_approver" 
  | "hr_head";

export interface IUser extends Document {
  organizationId: mongoose.Types.ObjectId;
  name: string;
  email: string;
  passwordHash: string;
  avatarUrl?: string;
  avatarCloudinaryId?: string;
  role: UserRole;
  departmentId?: mongoose.Types.ObjectId;
  status: "invited" | "active" | "disabled";
  lastLogin?: Date;
  inviteToken?: string;
  inviteExpiry?: Date;
  failedLoginAttempts: number;
  lockUntil?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
    name: { type: String, required: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    avatarUrl: { type: String },
    avatarCloudinaryId: { type: String },
    role: { 
      type: String, 
      enum: ["super_admin", "org_admin", "recruiter", "hiring_manager", "interviewer", "finance_approver", "hr_head"], 
      default: "recruiter" 
    },
    departmentId: { type: Schema.Types.ObjectId, ref: "Department" },
    status: { type: String, enum: ["invited", "active", "disabled"], default: "active" },
    lastLogin: { type: Date },
    inviteToken: { type: String },
    inviteExpiry: { type: Date },
    failedLoginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date },
  },
  { timestamps: true }
);

userSchema.index({ email: 1 }, { unique: true });

export const User = mongoose.model<IUser>("User", userSchema);
