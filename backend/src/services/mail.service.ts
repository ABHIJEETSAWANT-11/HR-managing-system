import nodemailer from "nodemailer";

/**
 * Section 4 — real email sending. If SMTP credentials are absent the caller gets
 * { sent: false, skipped: true } and logs the mail object instead — the offer
 * flow NEVER fabricates a "sent" claim it didn't actually perform.
 */
export interface OfferEmailInput {
  to: string;
  candidateName: string;
  jobTitle: string;
  companyName: string;
  portalUrl: string;
  ctc?: number | null;
  expiryDate?: Date | null;
}

export interface MailResult {
  sent: boolean;
  skipped?: boolean;
  reason?: string;
  messageId?: string;
  accepted?: string[];
  logged?: unknown;
}

export function smtpConfigured(): boolean {
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

export async function sendOfferEmail(input: OfferEmailInput): Promise<MailResult> {
  if (!smtpConfigured()) {
    const logged = { to: input.to, subject: offerSubject(input), portalUrl: input.portalUrl };
    console.log("[MAIL:SKIPPED — SMTP not configured]", JSON.stringify(logged));
    return { sent: false, skipped: true, reason: "SMTP_USER/SMTP_PASS not configured", logged };
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT || 587) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });

  const ctcLine = input.ctc ? `<li>Total compensation: <strong>₹${input.ctc.toLocaleString("en-IN")} per annum</strong></li>` : "";
  const expiryLine = input.expiryDate ? `<li>Please respond by: <strong>${new Date(input.expiryDate).toDateString()}</strong></li>` : "";

  const html = `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#111">
    <h2 style="color:#1f2937">Congratulations, ${escapeHtml(input.candidateName)}! 🎉</h2>
    <p><strong>${escapeHtml(input.companyName)}</strong> is delighted to offer you the position of
       <strong>${escapeHtml(input.jobTitle)}</strong>.</p>
    <ul>${ctcLine}${expiryLine}</ul>
    <p>Review and respond to your offer here:</p>
    <p><a href="${input.portalUrl}" style="background:#95CC29;color:#111;padding:10px 22px;border-radius:999px;text-decoration:none;font-weight:bold">View Your Offer</a></p>
    <p style="font-size:12px;color:#6B7280">If the button doesn't work, copy this link into your browser:<br/>${input.portalUrl}</p>
    <p style="font-size:12px;color:#6B7280">— ${escapeHtml(input.companyName)} Hiring Team (via HireFlow AI)</p>
  </div>`;

  const info = await transporter.sendMail({
    from: process.env.EMAIL_FROM || process.env.SMTP_USER,
    to: input.to,
    subject: offerSubject(input),
    html,
  });

  return { sent: true, messageId: info.messageId, accepted: (info.accepted as string[]) || [] };
}

function offerSubject(input: OfferEmailInput): string {
  return `Your offer from ${input.companyName} — ${input.jobTitle}`;
}

function escapeHtml(s: string): string {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}
