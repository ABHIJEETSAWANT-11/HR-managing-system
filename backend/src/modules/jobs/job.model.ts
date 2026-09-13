import mongoose, { Schema, Document, Types } from "mongoose";

export interface IJob extends Document {
  organizationId: Types.ObjectId;
  title: string;
  departmentId?: Types.ObjectId;
  hiringManagerId?: Types.ObjectId;
  recruiterId?: Types.ObjectId;
  employmentType: "full_time" | "part_time" | "contract" | "internship" | "freelance";
  workplaceType: "onsite" | "remote" | "hybrid";
  location?: string;
  vacancies: number;
  minExperience?: number;
  maxExperience?: number;
  minSalary?: number;
  maxSalary?: number;
  currency: string;
  deadline?: Date;
  description?: string;
  responsibilities?: string;
  status: "draft" | "awaiting_approval" | "open" | "paused" | "closed" | "filled" | "archived";
  publicSlug: string;
  screeningQuestions: { question: string; required: boolean }[];
  requirements: { name: string; type: "mandatory" | "preferred"; category: "skill" | "experience" | "education" | "other" }[];
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const jobSchema = new Schema<IJob>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    title: { type: String, required: true, trim: true },
    departmentId: { type: Schema.Types.ObjectId, ref: "Department" },
    hiringManagerId: { type: Schema.Types.ObjectId, ref: "User" },
    recruiterId: { type: Schema.Types.ObjectId, ref: "User" },
    employmentType: {
      type: String,
      enum: ["full_time", "part_time", "contract", "internship", "freelance"],
      default: "full_time",
    },
    workplaceType: { type: String, enum: ["onsite", "remote", "hybrid"], default: "onsite" },
    location: { type: String },
    vacancies: { type: Number, required: true, min: 1, default: 1 },
    minExperience: { type: Number },
    maxExperience: { type: Number },
    minSalary: { type: Number },
    maxSalary: { type: Number },
    currency: { type: String, default: "INR" },
    deadline: { type: Date },
    description: { type: String },
    responsibilities: { type: String },
    status: {
      type: String,
      enum: ["draft", "awaiting_approval", "open", "paused", "closed", "filled", "archived"],
      default: "draft",
    },
    publicSlug: { type: String, unique: true, sparse: true },
    screeningQuestions: [{ question: String, required: Boolean }],
    requirements: {
      type: [
        {
          name: { type: String, required: true, trim: true },
          type: { type: String, enum: ["mandatory", "preferred"], required: true },
          category: { type: String, enum: ["skill", "experience", "education", "other"], default: "skill" },
        },
      ],
      default: [],
    },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

jobSchema.index({ organizationId: 1, status: 1 });
jobSchema.index({ publicSlug: 1 });

export const Job = mongoose.model<IJob>("Job", jobSchema);
