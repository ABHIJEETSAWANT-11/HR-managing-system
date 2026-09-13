import { CandidateScore } from "../modules/applications/candidate-score.model";
import { CandidateApplication } from "../modules/applications/application.model";
import { Candidate } from "../modules/candidates/candidate.model";
import { Job } from "../modules/jobs/job.model";

/**
 * Section 3.2 — DETERMINISTIC Candidate Fit Score service.
 * Plain TypeScript, no AI anywhere in the number. Gemini is called ONLY for the
 * human-language explanation AFTER the score exists, and is explicitly forbidden
 * from altering any value. Weights are the master-prompt contract.
 */

export const SCORE_WEIGHTS = {
  mandatorySkills: 0.3,
  relevantExperience: 0.25,
  roleIndustrySimilarity: 0.15,
  preferredSkills: 0.1,
  educationCertifications: 0.1,
  projectRelevance: 0.05,
  availability: 0.05,
} as const;

const norm = (s: string) => (s || "").toLowerCase().replace(/[^a-z0-9+#. ]/g, " ").replace(/\s+/g, " ").trim();

/** token-overlap match: requirement matches if its name (or its significant words) appear in the skill set */
function skillMatches(requirementName: string, candidateSkills: string[]): { matched: boolean; infoUnavailable: boolean } {
  const req = norm(requirementName);
  if (!req) return { matched: false, infoUnavailable: true };
  const skillsNorm = (candidateSkills || []).map(norm);
  if (skillsNorm.length === 0) return { matched: false, infoUnavailable: true };
  if (skillsNorm.some((s) => s === req || s.includes(req) || req.includes(s))) return { matched: true, infoUnavailable: false };
  // multi-word requirement ("Node.js"): every significant word must appear somewhere
  const words = req.split(" ").filter((w) => w.length > 1);
  if (words.length > 1 && words.every((w) => skillsNorm.some((s) => s.includes(w)))) return { matched: true, infoUnavailable: false };
  return { matched: false, infoUnavailable: false };
}

function experienceScore(cand: any, job: any): { score: number; details: string; unavailable: boolean } {
  const years = cand?.totalExperienceYears;
  const min = job?.minExperience;
  const max = job?.maxExperience;
  if (years == null || (min == null && max == null)) {
    return { score: 0, details: "Candidate experience or job range not available; component scored 0.", unavailable: true };
  }
  if (min != null && years < min) {
    const deficit = min - years;
    const score = Math.max(0, 100 - deficit * 20); // taper: -20 per missing year, floor 0
    return { score: Math.round(score), details: `${years} yrs vs required ${min}+ (${deficit} yr deficit, tapered).`, unavailable: false };
  }
  if (max != null && years > max) {
    const excess = years - max;
    const score = Math.max(60, 100 - excess * 5); // mild taper for overqualification, floor 60
    return { score: Math.round(score), details: `${years} yrs vs range ${min ?? 0}-${max} (overqualified taper).`, unavailable: false };
  }
  return { score: 100, details: `${years} yrs within range ${min ?? 0}-${max ?? "∞"}.`, unavailable: false };
}

function roleIndustryScore(cand: any, job: any): { score: number; details: string; unavailable: boolean } {
  const candTitle = norm(cand?.currentDesignation || "");
  const historyTitles = (cand?.workHistory || []).map((w: any) => norm(w.title)).filter(Boolean);
  const jobTitle = norm(job?.title || "");
  if ((!candTitle && historyTitles.length === 0) || !jobTitle) {
    return { score: 0, details: "Candidate titles or job title unavailable; component scored 0.", unavailable: true };
  }
  const jobWords = jobTitle.split(" ").filter((w) => w.length > 2);
  const allTitles = [candTitle, ...historyTitles];
  const hits = jobWords.filter((w) => allTitles.some((t) => t.includes(w))).length;
  const score = jobWords.length ? Math.round((hits / jobWords.length) * 100) : 0;
  return { score, details: `${hits}/${jobWords.length} job-title keywords found in candidate designation/work history.`, unavailable: false };
}

function educationScore(cand: any, job: any): { score: number; details: string; unavailable: boolean } {
  const eduReqs = (job?.requirements || []).filter((r: any) => r.category === "education");
  const hasEdu = (cand?.education || []).length > 0 || (cand?.certifications || []).length > 0;
  if (eduReqs.length === 0) {
    // no explicit education requirement: award on presence of any education/certs
    return { score: hasEdu ? 100 : 0, details: hasEdu ? "Education/certifications present." : "No education or certifications on record.", unavailable: !hasEdu };
  }
  if (!hasEdu) return { score: 0, details: "Job lists education requirements but candidate has none on record.", unavailable: true };
  const eduText = norm(JSON.stringify(cand?.education || []) + " " + JSON.stringify(cand?.certifications || []));
  const matched = eduReqs.filter((r: any) => eduText.includes(norm(r.name)) || norm(r.name).split(" ").filter((w) => w.length > 2).every((w) => eduText.includes(w))).length;
  return { score: Math.round((matched / eduReqs.length) * 100), details: `${matched}/${eduReqs.length} education/certification requirements matched.`, unavailable: false };
}

function projectScore(cand: any, job: any): { score: number; details: string; unavailable: boolean } {
  const projects = cand?.projects || [];
  const jobSkillWords = norm((job?.requirements || []).map((r: any) => r.name).join(" ") + " " + (job?.title || "")).split(" ").filter((w) => w.length > 2);
  if (projects.length === 0) return { score: 0, details: "No projects on candidate record; component scored 0.", unavailable: true };
  const projectText = norm(JSON.stringify(projects));
  const hits = jobSkillWords.filter((w) => projectText.includes(w)).length;
  const score = jobSkillWords.length ? Math.round((hits / jobSkillWords.length) * 100) : 0;
  return { score, details: `${hits}/${jobSkillWords.length} job keywords appear in candidate projects.`, unavailable: false };
}

function availabilityScore(cand: any): { score: number; details: string; unavailable: boolean } {
  const notice = cand?.availability?.noticePeriodDays;
  const status = cand?.availability?.status;
  if (notice == null && !status) {
    return { score: 0, details: "Availability not recorded; component scored 0.", unavailable: true };
  }
  if (status === "immediate") return { score: 100, details: "Candidate available immediately.", unavailable: false };
  if (notice != null) {
    // ≤30 days: full; taper 1pt/day beyond, floor 40
    const score = notice <= 30 ? 100 : Math.max(40, 100 - (notice - 30));
    return { score: Math.round(score), details: `Notice period ${notice} days.`, unavailable: false };
  }
  return { score: 60, details: `Availability status "${status}" without notice period; mid score.`, unavailable: false };
}

export interface GenerateScoreResult {
  scoreDoc: any;
  geminiExplanation: { ok: boolean; skipped?: boolean; error?: string };
}

export async function generateFitScore(orgId: any, applicationId: any): Promise<GenerateScoreResult> {
  const application = await CandidateApplication.findOne({ _id: applicationId, organizationId: orgId });
  if (!application) throw Object.assign(new Error("Application not found"), { status: 404 });

  const [candidate, job] = await Promise.all([
    Candidate.findOne({ _id: application.candidateId, organizationId: orgId }),
    Job.findOne({ _id: application.jobId, organizationId: orgId }),
  ]);
  if (!candidate || !job) throw Object.assign(new Error("Candidate or Job not found"), { status: 404 });

  const requirements = job.requirements || [];
  const mandatory = requirements.filter((r: any) => r.type === "mandatory");
  const preferred = requirements.filter((r: any) => r.type === "preferred");

  // eligibilityChecks: one per Section-1 requirement
  const eligibilityChecks = requirements.map((r: any, idx: number) => {
    if (r.category !== "skill") {
      // education/experience/other requirements checked in their components; skill array only covers skill reqs
      if (r.category === "education") {
        const eduText = norm(JSON.stringify(candidate.education || []) + " " + JSON.stringify(candidate.certifications || []));
        const matched = eduText.includes(norm(r.name));
        return { requirementId: `req-${idx}`, requirementName: r.name, type: r.type, status: matched ? "passed" : candidate.education?.length || candidate.certifications?.length ? "failed" : "info_unavailable" };
      }
      return { requirementId: `req-${idx}`, requirementName: r.name, type: r.type, status: "info_unavailable" as const };
    }
    const { matched, infoUnavailable } = skillMatches(r.name, candidate.skills || []);
    return { requirementId: `req-${idx}`, requirementName: r.name, type: r.type, status: infoUnavailable ? "info_unavailable" : matched ? "passed" : "failed" };
  });

  // mandatorySkills component
  const mandatorySkillReqs = mandatory.filter((r: any) => r.category === "skill");
  let mandatoryScore = 100;
  let mandatoryDetails = "No mandatory skill requirements defined; component full.";
  if (mandatorySkillReqs.length > 0) {
    const checks = eligibilityChecks.filter((c, idx) => mandatory[idx] !== undefined);
    const skillChecks = mandatorySkillReqs
      .map((r: any) => eligibilityChecks.find((c) => c.requirementName === r.name))
      .filter(Boolean) as any[];
    const passed = skillChecks.filter((c) => c.status === "passed").length;
    mandatoryScore = Math.round((passed / skillChecks.length) * 100);
    mandatoryDetails = `${passed}/${skillChecks.length} mandatory skills present.`;
    void checks;
  }

  const exp = experienceScore(candidate, job);
  const role = roleIndustryScore(candidate, job);
  const prefReqs = preferred.filter((r: any) => r.category === "skill");
  let prefScore = 100;
  let prefDetails = "No preferred skill requirements defined; component full.";
  if (prefReqs.length > 0) {
    const prefPassed = prefReqs.filter((r: any) => skillMatches(r.name, candidate.skills || []).matched).length;
    prefScore = Math.round((prefPassed / prefReqs.length) * 100);
    prefDetails = `${prefPassed}/${prefReqs.length} preferred skills present.`;
  }
  const edu = educationScore(candidate, job);
  const proj = projectScore(candidate, job);
  const avail = availabilityScore(candidate);

  const breakdown: Record<string, { score: number; weight: number; details: string }> = {
    mandatorySkills: { score: mandatoryScore, weight: SCORE_WEIGHTS.mandatorySkills, details: mandatoryDetails },
    relevantExperience: { score: exp.score, weight: SCORE_WEIGHTS.relevantExperience, details: exp.details },
    roleIndustrySimilarity: { score: role.score, weight: SCORE_WEIGHTS.roleIndustrySimilarity, details: role.details },
    preferredSkills: { score: prefScore, weight: SCORE_WEIGHTS.preferredSkills, details: prefDetails },
    educationCertifications: { score: edu.score, weight: SCORE_WEIGHTS.educationCertifications, details: edu.details },
    projectRelevance: { score: proj.score, weight: SCORE_WEIGHTS.projectRelevance, details: proj.details },
    availability: { score: avail.score, weight: SCORE_WEIGHTS.availability, details: avail.details },
  };

  const overallScore = Math.round(
    Object.values(breakdown).reduce((sum, c) => sum + c.score * c.weight, 0)
  );

  const anyMandatoryFailed =
    eligibilityChecks.some((c) => c.type === "mandatory" && c.status === "failed") || mandatoryScore < 100;

  // idempotent replace (3.3): upsert by applicationId — never duplicates
  const scoreDoc = await CandidateScore.findOneAndUpdate(
    { applicationId: application._id },
    {
      organizationId: orgId,
      applicationId: application._id,
      overallScore,
      breakdown,
      eligibilityChecks,
      scoringConfigSnapshot: { weights: SCORE_WEIGHTS, algorithm: "deterministic-v1", generatedAt: new Date().toISOString() },
      isOverridden: false,
      $unset: { overrideReason: "", overriddenBy: "", explanation: "" },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  // Denormalize onto the application. Mandatory failure → eligibility failed,
  // but the FULL score is still stored and shown — never hidden or zeroed.
  await CandidateApplication.updateOne(
    { _id: application._id },
    { $set: { fitScore: overallScore, eligibilityStatus: anyMandatoryFailed ? "failed" : "passed" } }
  );

  // Gemini explanation AFTER the number exists (never touches it)
  const geminiExplanation = await explainWithGemini(orgId, scoreDoc, candidate, job);

  return { scoreDoc, geminiExplanation };
}

async function explainWithGemini(orgId: any, scoreDoc: any, candidate: any, job: any) {
  if (!process.env.GEMINI_API_KEY) {
    return { ok: false, skipped: true, error: "GEMINI_API_KEY not configured" };
  }
  try {
    const { GoogleGenAI } = await import("@google/genai");
    const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";
    const prompt = `A deterministic algorithm scored this candidate against this job. Explain the result in words ONLY — do NOT alter, recompute, or second-guess any number.

Job: ${job.title}. Mandatory skills: ${(job.requirements || []).filter((r: any) => r.type === "mandatory").map((r: any) => r.name).join(", ") || "none"}. Preferred: ${(job.requirements || []).filter((r: any) => r.type === "preferred").map((r: any) => r.name).join(", ") || "none"}.
Candidate skills: ${(candidate.skills || []).join(", ") || "none recorded"}. Experience: ${candidate.totalExperienceYears ?? "unknown"} years.
Component scores: ${JSON.stringify(Object.fromEntries(Object.entries(scoreDoc.breakdown).map(([k, v]: [string, any]) => [k, v.score])))}. Overall: ${scoreDoc.overallScore}/100. Eligibility checks: ${JSON.stringify(scoreDoc.eligibilityChecks)}.

Return ONLY valid JSON: {"strengths": string[], "missing": string[], "gaps": string[], "unavailableInfo": string[], "summary": string}. Base every statement strictly on the data above.`;
    const response = await genAI.models.generateContent({ model, contents: [{ role: "user", parts: [{ text: prompt }] }] });
    const rawText = response.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    const cleaned = rawText.replace(/```json\n?|\n?```/g, "").trim();
    const parsed = JSON.parse(cleaned);
    const explanation = {
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths.map(String).slice(0, 10) : [],
      missing: Array.isArray(parsed.missing) ? parsed.missing.map(String).slice(0, 10) : [],
      gaps: Array.isArray(parsed.gaps) ? parsed.gaps.map(String).slice(0, 10) : [],
      unavailableInfo: Array.isArray(parsed.unavailableInfo) ? parsed.unavailableInfo.map(String).slice(0, 10) : [],
      summary: typeof parsed.summary === "string" ? parsed.summary.slice(0, 2000) : "",
    };
    await CandidateScore.updateOne({ _id: scoreDoc._id }, { $set: { explanation, geminiModelVersion: model } });
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: String(err?.message || err).slice(0, 300) };
  }
}
