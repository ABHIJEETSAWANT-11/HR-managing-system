import mongoose, { Schema, Document } from "mongoose";

export interface ICandidate extends Document {
  organizationId: mongoose.Types.ObjectId;
  fullName: string;
  email?: string;
  phone?: string;
  currentCity?: string;
  preferredLocation?: string;
  currentCompany?: string;
  currentDesignation?: string;
  totalExperienceYears?: number;
  currentSalary?: number;
  expectedSalary?: number;
  noticePeriodDays?: number;
  skills: string[];
  education: { degree: string; institution: string; year?: string; grade?: string }[];
  certifications: { name: string; issuer: string; year?: string }[];
  workHistory: { company: string; title: string; startDate: string; endDate: string; description?: string }[];
  projects: { name: string; description: string; techStack: string }[];
  languages: string[];
  linkedinUrl?: string;
  githubUrl?: string;
  portfolioUrl?: string;
  photoUrl?: string;
  photoCloudinaryId?: string;
  source:
    | "public_application"
    | "manual"
    | "resume_upload"
    | "bulk_upload"
    | "referral"
    | "agency"
    | "email_import";
  tags: string[];
  availability?: { status?: "immediate" | "notice_period" | "passive" | "unavailable"; noticePeriodDays?: number };
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const candidateSchema = new Schema<ICandidate>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    fullName: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true, sparse: true, unique: true },
    phone: { type: String, trim: true },
    currentCity: { type: String, trim: true },
    preferredLocation: { type: String, trim: true },
    currentCompany: { type: String, trim: true },
    currentDesignation: { type: String, trim: true },
    totalExperienceYears: { type: Number },
    currentSalary: { type: Number },
    expectedSalary: { type: Number },
    noticePeriodDays: { type: Number },
    skills: [{ type: String, trim: true }],
    education: [
      {
        degree: { type: String, trim: true },
        institution: { type: String, trim: true },
        year: { type: String, trim: true },
        grade: { type: String, trim: true },
      },
    ],
    certifications: [
      {
        name: { type: String, trim: true },
        issuer: { type: String, trim: true },
        year: { type: String, trim: true },
      },
    ],
    workHistory: [
      {
        company: { type: String, trim: true },
        title: { type: String, trim: true },
        startDate: { type: String, trim: true },
        endDate: { type: String, trim: true },
        description: { type: String, trim: true },
      },
    ],
    projects: [
      {
        name: { type: String, trim: true },
        description: { type: String, trim: true },
        techStack: { type: [String], default: [] },
      },
    ],
    languages: [{ type: String, trim: true }],
    linkedinUrl: { type: String, trim: true, sparse: true },
    githubUrl: { type: String, trim: true, sparse: true },
    portfolioUrl: { type: String, trim: true, sparse: true },
    photoUrl: { type: String },
    photoCloudinaryId: { type: String },
    source: {
      type: String,
      enum: [
        "public_application",
        "manual",
        "resume_upload",
        "bulk_upload",
        "referral",
        "agency",
        "email_import",
      ],
      default: "manual",
    },
    tags: [{ type: String, trim: true }],
    availability: {
      status: { type: String, enum: ["immediate", "notice_period", "passive", "unavailable"], default: undefined },
      noticePeriodDays: { type: Number, min: 0 },
    },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
  },
  { timestamps: true }
);

candidateSchema.index({ organizationId: 1, isDeleted: 1 });
candidateSchema.index({ fullName: "text", skills: "text" }, { name: "candidate_text_search" });

export const Candidate = mongoose.model<ICandidate>("Candidate", candidateSchema);