import puppeteer from "puppeteer";
import cloudinary from "../config/cloudinary";
import { DocumentTemplate } from "../modules/templates/document-template.model";
import { Offer } from "../modules/offers/offer.model";
import { Candidate } from "../modules/candidates/candidate.model";
import { Job } from "../modules/jobs/job.model";
import { Organization } from "../modules/organizations/organization.model";
import { User } from "../modules/users/user.model";

/**
 * PDF service: renders an Offer Letter PDF from a DocumentTemplate's HTML,
 * substituting {{variableName}} placeholders with real offer/candidate/job/org data,
 * then uploads the buffer to Cloudinary as a raw resource.
 */

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatINR(amount: number | undefined | null): string {
  if (amount === undefined || amount === null || Number.isNaN(amount)) return "—";
  return "₹" + amount.toLocaleString("en-IN");
}

function formatDate(value: Date | string | undefined | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
}

function buildVariableMap(offer: any, candidate: any, job: any, org: any, manager: any): Record<string, string> {
  const s = offer.salaryStructure || {};
  const annexureRows: [string, string][] = [
    ["Basic Salary", formatINR(s.basicSalary)],
    ["House Rent Allowance (HRA)", formatINR(s.hra)],
    ["Special Allowance", formatINR(s.specialAllowance)],
    ["Variable Pay", formatINR(s.variablePay)],
    ["Performance Bonus", formatINR(s.performanceBonus)],
    ["Joining Bonus", formatINR(s.joiningBonus)],
    ["Employer PF Contribution", formatINR(s.employerPF)],
    ["Gratuity Provision", formatINR(s.gratuity)],
    ["Insurance", formatINR(s.insurance)],
  ];

  const annexureRowsHtml = annexureRows
    .filter(([, v]) => v !== "—")
    .map(
      ([k, v]) =>
        `<tr><td style="padding:8px 12px;border:1px solid #E5E7EB;">${escapeHtml(k)}</td>` +
        `<td style="padding:8px 12px;border:1px solid #E5E7EB;text-align:right;font-weight:600;">${v}</td></tr>`
    )
    .join("");

  return {
    // Company / branding
    company_name: escapeHtml(org?.name ?? ""),
    company_address: escapeHtml(org?.address ?? ""),
    company_logo: escapeHtml(org?.logoUrl ?? ""),
    // Candidate
    candidate_name: escapeHtml(candidate?.fullName ?? ""),
    candidate_address: escapeHtml((candidate?.currentCity ?? "") + (candidate?.currentCountry ? ", " + candidate.currentCountry : "")),
    candidate_email: escapeHtml(candidate?.email ?? ""),
    // Job
    job_title: escapeHtml(job?.title ?? ""),
    department_name: escapeHtml((job as any)?.departmentId?.name ?? ""),
    employment_type: escapeHtml(String(job?.employmentType ?? "").replace("_", "-")),
    work_location: escapeHtml(offer?.workLocation ?? job?.location ?? ""),
    // Offer core
    joining_date: formatDate(offer?.joiningDate),
    reporting_manager: escapeHtml(manager?.name ?? ""),
    probation_period: offer?.probationPeriodDays ? `${offer.probationPeriodDays} days` : "—",
    notice_period: offer?.noticePeriodDays ? `${offer.noticePeriodDays} days` : "—",
    offer_expiry: formatDate(offer?.validUntil),
    annual_ctc: formatINR(s.annualCTC),
    monthly_gross: formatINR(s.monthlyGross),
    document_id: escapeHtml(offer?.documentId ?? `HIRE-${String(offer?._id ?? "").slice(-8).toUpperCase()}`),
    // Blocks
    salary_annexure_table: annexureRowsHtml,
    special_conditions: escapeHtml(offer?.specialConditions ?? "None."),
  };
}

/** Replace every {{variable}} in the HTML; unknown variables render as empty string. */
function substituteVariables(html: string, vars: Record<string, string>): string {
  return html.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, name: string) => vars[name] ?? "");
}

/** Wrap raw template HTML in a complete branded document if it isn't already one. */
function buildFullHtml(innerHtml: string, vars: Record<string, string>): string {
  const isFullDocument = /<html[\s>]/i.test(innerHtml);
  const logoBlock = vars.company_logo
    ? `<img src="${vars.company_logo}" alt="logo" style="height:52px;object-fit:contain;" />`
    : "";
  if (isFullDocument) {
    // Inject page-number footer into a full custom document via body margin trick
    return innerHtml;
  }
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
  @page { margin: 48px 48px 64px 48px; }
  body { font-family: -apple-system, "Segoe UI", Roboto, Arial, sans-serif; color: #1F2937; font-size: 12.5px; line-height: 1.65; }
  .letterhead { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #95CC29; padding-bottom: 14px; margin-bottom: 26px; }
  .letterhead .org { font-size: 19px; font-weight: 700; }
  .letterhead .addr { font-size: 11px; color: #6B7280; margin-top: 2px; }
  h1 { font-size: 17px; margin: 0 0 4px 0; }
  .doc-id { font-size: 10.5px; color: #6B7280; }
  table { border-collapse: collapse; width: 100%; margin: 10px 0 18px 0; }
  .details td { padding: 5px 0; vertical-align: top; }
  .details td.label { color: #6B7280; width: 220px; }
  .annexure h2 { font-size: 13.5px; margin: 22px 0 4px 0; }
  .sign-area { margin-top: 52px; display: flex; justify-content: space-between; }
  .sign-line { border-top: 1px solid #9CA3AF; width: 220px; padding-top: 6px; font-size: 11px; color: #6B7280; }
  .footer { position: fixed; bottom: -34px; left: 0; right: 0; font-size: 10px; color: #9CA3AF; text-align: center; }
</style>
</head>
<body>
  <div class="letterhead">
    <div>
      ${logoBlock ? `<div style="margin-bottom:8px;">${logoBlock}</div>` : ""}
      <div class="org">${vars.company_name}</div>
      <div class="addr">${vars.company_address}</div>
    </div>
    <div style="text-align:right;">
      <h1>Offer of Employment</h1>
      <div class="doc-id">Document ID: ${vars.document_id}</div>
    </div>
  </div>

  <p>Dear ${vars.candidate_name},</p>

  ${innerHtml}

  <table class="details">
    <tr><td class="label">Position</td><td><strong>${vars.job_title}</strong> (${vars.employment_type})</td></tr>
    <tr><td class="label">Department</td><td>${vars.department_name || "—"}</td></tr>
    <tr><td class="label">Joining Date</td><td>${vars.joining_date}</td></tr>
    <tr><td class="label">Reporting Manager</td><td>${vars.reporting_manager || "—"}</td></tr>
    <tr><td class="label">Work Location</td><td>${vars.work_location || "—"}</td></tr>
    <tr><td class="label">Probation Period</td><td>${vars.probation_period}</td></tr>
    <tr><td class="label">Notice Period</td><td>${vars.notice_period}</td></tr>
    <tr><td class="label">Annual CTC</td><td><strong>${vars.annual_ctc}</strong></td></tr>
    <tr><td class="label">Offer Valid Until</td><td>${vars.offer_expiry}</td></tr>
  </table>

  <div class="annexure">
    <h2>Annexure A — Salary Structure</h2>
    <table>
      ${vars.salary_annexure_table}
      <tr>
        <td style="padding:8px 12px;border:1px solid #E5E7EB;font-weight:700;">Total Annual CTC</td>
        <td style="padding:8px 12px;border:1px solid #E5E7EB;text-align:right;font-weight:700;">${vars.annual_ctc}</td>
      </tr>
    </table>
  </div>

  <h2 style="font-size:13.5px;margin:22px 0 4px 0;">Special Conditions</h2>
  <p>${vars.special_conditions}</p>

  <div class="sign-area">
    <div>
      <p>Yours sincerely,</p>
      <p style="margin-top:28px;"><strong>Authorized Signatory</strong><br />${vars.company_name}</p>
      <div class="sign-line" style="margin-top:10px;">Signature</div>
    </div>
    <div style="text-align:right;">
      <p style="margin-top:28px;"><strong>${vars.candidate_name}</strong></p>
      <div class="sign-line" style="margin-left:auto;margin-top:10px;">Date &amp; Signature (acceptance via portal)</div>
    </div>
  </div>

  <div class="footer">Page <span class="pageNumber"></span> of <span class="totalPages"></span> &nbsp;·&nbsp; ${vars.company_name} &nbsp;·&nbsp; ${vars.document_id}</div>
</body>
</html>`;
}

/**
 * Find the org's active default offer_letter template; seed a sensible default if none exists.
 */
export async function ensureOfferLetterTemplate(organizationId: string) {
  const existing = await DocumentTemplate.findOne({
    organizationId,
    type: "offer_letter",
    isActive: true,
  }).sort({ isDefault: -1, version: -1 });
  if (existing) return existing;

  const seeded = await DocumentTemplate.create({
    organizationId,
    type: "offer_letter",
    name: "Default Offer Letter",
    isDefault: true,
    isActive: true,
    variables: [
      "candidate_name", "job_title", "department_name", "joining_date", "reporting_manager",
      "work_location", "annual_ctc", "offer_expiry", "company_name", "company_address",
      "company_logo", "document_id", "salary_annexure_table", "special_conditions",
    ],
    htmlContent: `<p>We are pleased to appoint you as <strong>{{job_title}}</strong> at {{company_name}}. Your employment will commence on {{joining_date}}, reporting to {{reporting_manager}} at {{work_location}}. Your total annual compensation will be {{annual_ctc}} as detailed in Annexure A. This offer stands valid until {{offer_expiry}}.</p><p>Special conditions: {{special_conditions}}</p>`,
  });
  return seeded;
}

/**
 * Render the offer letter to a PDF buffer via Puppeteer (no upload).
 */
export async function renderOfferPdf(offerId: string): Promise<Buffer> {
  const offer = await Offer.findById(offerId);
  if (!offer) throw new Error("Offer not found");

  const [candidate, job, org, manager] = await Promise.all([
    Candidate.findById(offer.candidateId),
    Job.findById(offer.jobId).populate("departmentId", "name"),
    Organization.findById(offer.organizationId),
    User.findById(offer.reportingManagerId),
  ]);

  const template = await ensureOfferLetterTemplate(String(offer.organizationId));

  const vars = buildVariableMap(offer, candidate, job, org, manager);
  const substituted = substituteVariables(template.htmlContent, vars);
  const fullHtml = buildFullHtml(substituted, vars);

  const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox"] });
  try {
    const page = await browser.newPage();
    await page.setContent(fullHtml, { waitUntil: "load" });
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: "<span></span>",
      footerTemplate:
        '<div style="width:100%;font-size:9px;color:#9CA3AF;text-align:center;">' +
        `Page <span class="pageNumber"></span> of <span class="totalPages"></span> · ${vars.company_name} · ${vars.document_id}` +
        "</div>",
      margin: { top: "48px", bottom: "64px", left: "48px", right: "48px" },
    });

    return Buffer.from(pdfBuffer);
  } finally {
    await browser.close();
  }
}

/**
 * Generate the offer PDF, upload to Cloudinary (raw), and persist pdfUrl/pdfCloudinaryId.
 * Cloudinary credentials missing → return a data: URL of the REAL rendered PDF bytes
 * (stored in Mongo) instead of throwing, so the offer flow still delivers a real,
 * openable PDF. Never fabricates a remote URL that doesn't exist.
 */
export async function generateOfferPdf(offerId: string): Promise<{ url: string; publicId: string }> {
  const offer = await Offer.findById(offerId);
  if (!offer) throw new Error("Offer not found");

  const pdfBuffer = await renderOfferPdf(offerId);

  const cloudinaryReady = !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);
  if (!cloudinaryReady) {
    const dataUrl = "data:application/pdf;base64," + pdfBuffer.toString("base64");
    offer.set("pdfBufferBase64", pdfBuffer.toString("base64"));
    offer.pdfUrl = dataUrl;
    offer.pdfCloudinaryId = "local:" + `offer_${String(offer._id)}_v${offer.version}`;
    await offer.save();
    return { url: dataUrl, publicId: offer.pdfCloudinaryId };
  }

  const publicId = `offer_letters/offer_${String(offer._id)}_v${offer.version}_${Date.now()}`;
  const result = await new Promise<any>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { resource_type: "raw", public_id: publicId, folder: "offer_letters", overwrite: true },
      (err, res) => (err ? reject(err) : resolve(res))
    );
    stream.end(pdfBuffer);
  });

  offer.pdfUrl = result.secure_url;
  offer.pdfCloudinaryId = result.public_id;
  await offer.save();

  return { url: result.secure_url, publicId: result.public_id };
}
