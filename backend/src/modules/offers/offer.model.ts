import mongoose, { Schema, Document, Types } from "mongoose";

export interface IOffer extends Document {
  organizationId: Types.ObjectId;
  applicationId: Types.ObjectId;
  candidateId: Types.ObjectId;
  jobId: Types.ObjectId;
  templateId?: Types.ObjectId;
  version: number;
  status:
    | "draft"
    | "awaiting_approval"
    | "changes_requested"
    | "approved"
    | "sent"
    | "viewed"
    | "accepted"
    | "rejected"
    | "expired"
    | "withdrawn"
    | "revised";
  joiningDate: Date;
  reportingManagerId: Types.ObjectId;
  workLocation: string;
  probationPeriodDays?: number;
  noticePeriodDays?: number;
  validUntil: Date;
  salaryStructure: {
    annualCTC: number;
    basicSalary?: number;
    hra?: number;
    specialAllowance?: number;
    variablePay?: number;
    performanceBonus?: number;
    joiningBonus?: number;
    employerPF?: number;
    gratuity?: number;
    insurance?: number;
    esop?: string;
    otherBenefits?: string[];
    monthlyGross: number;
  };
  specialConditions?: string;
  pdfUrl?: string;
  pdfCloudinaryId?: string;
  pdfBufferBase64?: string;
  portalToken?: string;
  sentAt?: Date;
  firstViewedAt?: Date;
  lastViewedAt?: Date;
  acceptedAt?: Date;
  rejectedAt?: Date;
  acceptanceSignature?: string;
  acceptanceIp?: string;
  acceptanceUserAgent?: string;
  previousVersions: {
    version: number;
    snapshot: object;
    changedAt: Date;
    changedBy: Types.ObjectId;
  }[];
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const offerSchema = new Schema<IOffer>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    applicationId: {
      type: Schema.Types.ObjectId,
      ref: "CandidateApplication",
      required: true,
      index: true,
    },
    candidateId: {
      type: Schema.Types.ObjectId,
      ref: "Candidate",
      required: true,
    },
    jobId: {
      type: Schema.Types.ObjectId,
      ref: "Job",
      required: true,
    },
    templateId: {
      type: Schema.Types.ObjectId,
      ref: "DocumentTemplate",
    },
    version: {
      type: Number,
      default: 1,
    },
    status: {
      type: String,
      enum: [
        "draft",
        "awaiting_approval",
        "changes_requested",
        "approved",
        "sent",
        "viewed",
        "accepted",
        "rejected",
        "expired",
        "withdrawn",
        "revised",
      ],
      default: "draft",
    },
    joiningDate: {
      type: Date,
      required: true,
    },
    reportingManagerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    workLocation: {
      type: String,
      required: true,
    },
    probationPeriodDays: { type: Number },
    noticePeriodDays: { type: Number },
    validUntil: {
      type: Date,
      required: true,
    },
    salaryStructure: {
      annualCTC: {
        type: Number,
        required: true,
      },
      basicSalary: { type: Number },
      hra: { type: Number },
      specialAllowance: { type: Number },
      variablePay: { type: Number },
      performanceBonus: { type: Number },
      joiningBonus: { type: Number },
      employerPF: { type: Number },
      gratuity: { type: Number },
      insurance: { type: Number },
      esop: { type: String },
      otherBenefits: [{ type: String }],
      monthlyGross: {
        type: Number,
      },
    },
    specialConditions: { type: String },
    pdfUrl: { type: String },
    pdfCloudinaryId: { type: String },
    pdfBufferBase64: { type: String }, // full PDF bytes when Cloudinary is not configured (data: URL served instead)
    portalToken: { type: String },
    sentAt: { type: Date },
    firstViewedAt: { type: Date },
    lastViewedAt: { type: Date },
    acceptedAt: { type: Date },
    rejectedAt: { type: Date },
    acceptanceSignature: { type: String },
    acceptanceIp: { type: String },
    acceptanceUserAgent: { type: String },
    previousVersions: [
      {
        version: { type: Number },
        snapshot: { type: Schema.Types.Mixed },
        changedAt: { type: Date },
        changedBy: { type: Schema.Types.ObjectId },
      },
    ],
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

offerSchema.index({ organizationId: 1, applicationId: 1 });
offerSchema.index({ organizationId: 1, status: 1 });

export const Offer = mongoose.model<IOffer>("Offer", offerSchema);