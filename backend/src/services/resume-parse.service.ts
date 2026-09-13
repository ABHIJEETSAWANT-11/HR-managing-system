import { z } from "zod";

/**
 * Section 2 — Gemini resume structuring service.
 * Extraction ONLY: the prompt forbids inference. Output is Zod-validated before
 * it ever touches the database. The numeric Candidate Fit Score is NEVER computed
 * here (Section 3's score.service.ts owns that, deterministically).
 */

// Zod schema per the master prompt's exact shape. Coerce numbers defensively;
// default missing arrays/objects so a partial extraction still validates.
export const resumeDataSchema = z.object({
  skills: z.array(z.string().trim().min(1)).max(100).default([]),
  education: z
    .array(
      z.object({
        degree: z.string().trim().default(""),
        institution: z.string().trim().default(""),
        year: z.string().trim().optional(),
        grade: z.string().trim().optional(),
      })
    )
    .max(20)
    .default([]),
  certifications: z
    .array(
      z.object({
        name: z.string().trim().default(""),
        issuer: z.string().trim().default(""),
        year: z.string().trim().optional(),
      })
    )
    .max(20)
    .default([]),
  workHistory: z
    .array(
      z.object({
        company: z.string().trim().default(""),
        title: z.string().trim().default(""),
        startDate: z.string().trim().default(""),
        endDate: z.string().trim().default(""),
        description: z.string().trim().optional(),
      })
    )
    .max(20)
    .default([]),
  projects: z
    .array(
      z.object({
        name: z.string().trim().default(""),
        description: z.string().trim().default(""),
        techStack: z.string().trim().default(""),
      })
    )
    .max(20)
    .default([]),
  languages: z.array(z.string().trim().min(1)).max(30).default([]),
  totalExperienceYears: z.coerce.number().min(0).max(60).nullable().default(null),
});

export type ResumeData = z.infer<typeof resumeDataSchema>;

export type FieldConfidence = Record<string, "high" | "medium" | "low" | "not_detected">;

const EXTRACTION_PROMPT = (text: string) => `Extract ONLY what is explicitly present in this resume text into this exact JSON schema:
{"skills": string[], "education": [{"degree": string, "institution": string, "year": string, "grade": string}], "certifications": [{"name": string, "issuer": string, "year": string}], "workHistory": [{"company": string, "title": string, "startDate": string, "endDate": string, "description": string}], "projects": [{"name": string, "description": string, "techStack": string}], "languages": string[], "totalExperienceYears": number|null}
Do not infer, guess, or add anything not explicitly stated in the text. Omit a field's entry rather than inventing one. Use empty arrays when a category is absent. Return ONLY valid JSON, no markdown fences, no commentary.

RESUME TEXT:
${text.slice(0, 15000)}`;

export interface GeminiParseResult {
  ok: boolean;
  data?: ResumeData;
  raw?: string;
  error?: string;
  skipped?: boolean;
  model?: string;
}

/** Calls Gemini via the SAME lazy-import pattern as jobs' generate-jd (single shared SDK/client shape). */
export async function parseResumeWithGemini(parsedText: string): Promise<GeminiParseResult> {
  if (!process.env.GEMINI_API_KEY) {
    return { ok: false, skipped: true, error: "GEMINI_API_KEY not configured" };
  }
  try {
    const { GoogleGenAI } = await import("@google/genai");
    const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";

    const response = await genAI.models.generateContent({
      model,
      contents: [{ role: "user", parts: [{ text: EXTRACTION_PROMPT(parsedText) }] }],
    });
    const rawText = response.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    const cleaned = rawText.replace(/```json\n?|\n?```/g, "").trim();

    let json: unknown;
    try {
      json = JSON.parse(cleaned);
    } catch {
      return { ok: false, raw: rawText.slice(0, 8000), error: "Gemini returned non-JSON output", model };
    }

    const validated = resumeDataSchema.safeParse(json);
    if (!validated.success) {
      return {
        ok: false,
        raw: rawText.slice(0, 8000),
        error: "Schema validation failed: " + validated.error.issues.slice(0, 5).map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
        model,
      };
    }
    return { ok: true, data: validated.data, raw: rawText.slice(0, 8000), model };
  } catch (err: any) {
    return { ok: false, error: "Gemini call failed: " + String(err?.message || err).slice(0, 300) };
  }
}

/** Case-insensitive substring presence of the field's key tokens in the source text. */
function containsAny(haystack: string, needles: string[]): boolean {
  return needles.filter((n) => n && haystack.toLowerCase().includes(n.toLowerCase())).length > 0;
}

/**
 * Per-field confidence via substring/fuzzy match against parsedText (2.3).
 * Deliberately simple: high = exact substring hit for the primary value,
 * medium = partial hit (any of the value's words), low/not_detected otherwise.
 */
export function computeFieldConfidence(data: ResumeData, parsedText: string): FieldConfidence {
  const conf: FieldConfidence = {};
  const words = (s: string) => s.split(/[^A-Za-z0-9+#.]+/).filter((w) => w.length > 2);

  const fields: [string, boolean, string[]][] = [
    ["skills", data.skills.length > 0, data.skills.slice(0, 20)],
    ["education", data.education.length > 0, data.education.flatMap((e) => [e.degree, e.institution])],
    ["certifications", data.certifications.length > 0, data.certifications.map((c) => c.name)],
    ["workHistory", data.workHistory.length > 0, data.workHistory.flatMap((w) => [w.company, w.title])],
    ["projects", data.projects.length > 0, data.projects.map((p) => p.name)],
    ["languages", data.languages.length > 0, data.languages],
    ["totalExperienceYears", data.totalExperienceYears != null, [String(data.totalExperienceYears ?? "")]],
  ];

  for (const [field, present, tokens] of fields) {
    if (!present || tokens.length === 0) {
      conf[field] = "not_detected";
      continue;
    }
    const exact = tokens.some((t) => t && parsedText.toLowerCase().includes(t.toLowerCase()));
    const partial = containsAny(parsedText, tokens.flatMap((t) => words(t)));
    conf[field] = exact ? "high" : partial ? "medium" : "low";
  }
  return conf;
}

export function overallConfidenceScore(conf: FieldConfidence): number {
  const values = Object.values(conf);
  if (values.length === 0) return 0;
  const points = { high: 1, medium: 0.6, low: 0.3, not_detected: 0 } as const;
  return Math.round((values.reduce((s, v) => s + points[v], 0) / values.length) * 100);
}
