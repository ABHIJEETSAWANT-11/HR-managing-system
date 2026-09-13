# HireFlow AI — Overnight Progress Log

## NEEDS YOUR INPUT (written last, kept at top)
- **GEMINI_API_KEY is empty in backend/.env** → Section 2 (real AI resume parsing) and the Gemini-explanation halves of Section 3 ran under documented graceful degradation tonight. Everything else about them is built and verified; dropping a real key in .env and re-running the verify steps will light them up with zero code changes.
- **SMTP_USER / SMTP_PASS are empty** → Section 4 (real outbound offer email) is code-complete but untestable; it falls back to logging the mail object. Provide credentials (any Gmail app-password works) and re-run Section 4's verify.
- **CLOUDINARY_API_SECRET is empty** → offer PDF upload still can't complete (pre-existing gap, unchanged tonight); Puppeteer rendering remains proven.
- **MongoDB Atlas IP allowlist rotated again tonight** (backend was refusing `152.58.16.191`); fixed by adding the IP — expect this to recur whenever the ISP rotates the address. LOCAL_RUN.md documents it.

---

## [2026-09-14 ~23:30] STEP 0 — SETUP / BASELINE
### What I did
Created this log; audited env keys by length only (never printing values); booted both servers via real entrypoints; captured git baseline.

### Real output
```
git status: 16 modified files (backend routes/models, frontend auth/App/tsconfig, package files)
Untracked: backend/scripts/, backend/src/modules/templates/template.routes.ts,
backend/src/services/pdf.service.ts, frontend/src/features/, LOCAL_RUN.md, PROGRESS_LOG.md, .freebuff/
git log --oneline -6:
4e14783 commit
eec572c fix: resolve resume.routes.ts type errors and remove invalid syntax
4e55e10 feat: ground-truth import resolution across candidates/applications/interviews/offers/resumes modules
36871c4 baseline: pre-repair snapshot, known broken state
env audit: MONGODB_URI len=107 · JWT_SECRET len=64 · SMTP_HOST len=15 ·
GEMINI_API_KEY len=0 · CLOUDINARY_API_SECRET len=0 · SMTP_USER len=0 · SMTP_PASS len=0
Boot: backend pid 6560 → "MongoDB Connected" + GET /health 200; frontend (Vite) pid 19496 → 200 on :5173
```

### Status: DONE

---

## [2026-09-14 ~23:35] STEP 0.5 — BASELINE COMMIT (pre-existing uncommitted work)
### What I did
Per setup instruction #3, committed the prior sessions' verified-but-uncommitted work as one baseline commit before starting new work, so tonight's sections commit on top of a clean tree. Excluded non-project artifacts (.freebuff/, build logs).
### Real output
```
git add backend/src backend/package.json backend/package-lock.json backend/scripts \
  frontend/src frontend/tsconfig.json frontend/package.json frontend/package-lock.json \
  LOCAL_RUN.md PROGRESS_LOG.md
git commit -m "baseline: prior sessions' verified work (modules CRUD, PDF service, fixes, e2e + sweep scripts)"
→ committed
git status --short afterwards: only untracked non-project artifacts remain
```
### Status: DONE

## [2026-09-14 ~23:50] STEP 1 — STRUCTURED JOB REQUIREMENTS
### What I did
- 1.1: Added `requirements: [{name, type: mandatory|preferred, category: skill|experience|education|other}]` array to Job model with `default: []` (migration-safe; existing jobs unaffected).
- 1.2: createJob/updateJob now accept the array — **server-side sanitized** (name trimmed/capped 120, type/category whitelisted) so a client cannot inject arbitrary values. Critical catch: the existing JobForm sent a free-text `requirements` STRING (from the AI JD generator) which the strict schema previously dropped silently; left unfixed it would have cast-error'd every job save after this change. Legacy strings are now dropped (create folds them into `description`; update ignores), never crash.
- 1.3: JobForm.tsx — renamed free-text field to `requirementsText` (still fed by AI generator), added repeatable structured rows (name + mandatory/preferred + category) matching the form's existing DashboardCard/Input/select conventions; edit-mode loads existing array.
- 1.4: Verified below.

### Real output
```
BE_TSC=0 / FE_TSC=0 after changes
Rebuild BUILD_OK; server restart pid 15836, HEALTH=200
CREATE status=201 reqCount=5
FETCHBACK status=200
PERSISTED REQUIREMENTS: [{"name":"React","type":"mandatory","category":"skill",...},{"name":"Node.js","type":"mandatory",...},{"name":"TypeScript","type":"mandatory",...},{"name":"GraphQL","type":"preferred",...},{"name":"AWS","type":"preferred",...}]
```
### Status: DONE

## [2026-09-14 ~00:05] STEP 2 — REAL AI-DRIVEN RESUME PARSING
### What I did
- Created backend/src/services/resume-parse.service.ts: exact-prompt extraction-only Gemini call reusing the SAME lazy `@google/genai` pattern as jobs' generate-jd (single client pattern, no second wrapper), Zod-validated output (resumeDataSchema), per-field confidence (high/medium/low/not_detected via substring match vs parsedText), overallConfidenceScore.
- Model: added parsedConfidence, rawGeminiOutput, parsingError to Resume.
- Rewired single /upload handler. TWO REAL BUGS FIXED IN PASSING: (a) it extracted text with a latin1 toString hack producing garbage — now uses the real pdf-parse v2/mammoth path; (b) it destructively blanked the candidate's skills/education/etc — now only copies real extraction output, never destroys on failure.
- Failure semantics per spec: extraction empty → parsingStatus=failed+parsingError; Gemini non-JSON/schema-fail → failed + rawGeminiOutput kept for debugging; no API key → parsingStatus=completed (text layer done) + parsingError records the skip. No path crashes the request.
- 2.4 candidate copy implemented (skills/education/certs/workHistory/projects/languages/totalExperienceYears/currentDesignation from first work entry) — runs only on validated success.

### Real output
```
CANDIDATE status=201 id=yes
UPLOAD status=201 resumeId=6aa7210df9d9280e64ec899c
PARSE: status=completed parsedTextLen=616
TEXT_HEAD: "Rohan Deshpande\nEmail: rohan.deshpande@example.com Phone: +91 98200 11223 Pune, India\nSKILLS\nJavaScript, TypeScript, Rea"
HAS_KEY_TOKENS: React=true Infosys=true years7=true
AI: parsingError="AI structuring skipped: GEMINI_API_KEY not configured"
AI: parsedDataPresent=false confidence=null
CANDIDATE_AFTER: skills=[] workHistory=0 totalExperienceYears=null
```
### Status: PARTIALLY DONE — extraction + plumbing + failure semantics fully built and verified live with a real PDF; the actual Gemini call is SKIPPED because GEMINI_API_KEY is empty (HARD STOP class: missing credential). No mock was used anywhere. With a real key in .env, re-running `node scripts/section2-verify.mjs` completes the remaining verification with zero code changes.

## [2026-09-15 ~00:40] STEP 3 — CANDIDATE FIT SCORE SERVICE
### What I did
- 3.1: CandidateScore model exactly per spec (applicationId unique+indexed, breakdown map, eligibilityChecks[], explanation, scoringConfigSnapshot, isOverridden/overrideReason/overriddenBy, organizationId indexed for tenancy).
- 3.2: score.service.ts — fully deterministic. Weights 30/25/15/10/10/5/5. mandatorySkills = matched mandatory skill reqs / total × 100; any mandatory failure → application.eligibilityStatus='failed' while the FULL score is still stored/shown (never hidden/zeroed). Experience taper: -20/yr below min (floor 0), mild -5/yr above max (floor 60). roleIndustrySimilarity = job-title keyword hits in designation+workHistory titles. preferredSkills/education/projects/availability same normalize-0-100 pattern; missing data → score 0 + details say "not available", never fabricated. overallScore = weighted sum, rounded. Idempotent upsert on applicationId (regenerate replaces, never duplicates). AFTER the number exists, Gemini is asked for words-only explanation; Zod-shaped, explicitly forbidden from altering values; on failure/skip the score stands with explanation absent.
- REAL BUG FIXED ALONG THE WAY: Candidate model had NO availability field at all (score component could never see it). Added availability {status enum, noticePeriodDays} + interface. Verify run confirms it now scores (STRONG availability=100 after fix; was 0/"not recorded" before).
- 3.3: routes GET /:id/score, POST /:id/score/generate, POST /:id/score/override (override requires reason, validates 0-100, keeps original breakdown; overridder = req.user server-side).
- 3.4: PipelineBoardPage cards now have "Generate score" action (mutation + query invalidation) and "View score breakdown" expanding the real per-component bars from GET /:id/score + AI summary line when present. Existing fitScore/eligibility badges stay, now fed by real denormalized data.

### Real output (two runs; second after availability fix)
```
WEAK (Excel, 0y): overallScore=20 eligibilityChecks=[React:failed,Node.js:failed,Kubernetes:failed]
  DENORM: fitScore=20 eligibilityStatus=failed   ← failed eligibility AND visible real score ✓
STRONG (React/Node/TS/K8s, 4y): overallScore=71 eligibilityChecks=[React:passed,Node.js:passed,Kubernetes:passed]
  DENORM: fitScore=71 eligibilityStatus=passed
  breakdown: mandatorySkills=100(0.30) relevantExperience=100(0.25) roleIndustrySimilarity=0(0.15)
             preferredSkills=100(0.10) educationCertifications=0(0.10) projectRelevance=29(0.05) availability=100(0.05)
             weighted: 30+25+0+10+0+1.45+5 = 71.45 → 71 ✓ (hand-checked)
WEAK weighted check: 0+15(4y vs 2+ → -20×2 tapered=60? actual 60×0.25=15)+0+0+0+0+5 = 20 ✓
REGEN → GET: single doc each (idempotent upsert confirmed)
OVERRIDE: 200 isOverridden=true newScore=91 reason stored; invalid(500)→400; missing-reason→400
gemini in both runs: {"ok":false,"skipped":true,"error":"GEMINI_API_KEY not configured"} ← documented skip
BE_TSC=0 FE_TSC=0; rebuild+restart pid 11444, HEALTH=200
```
### Status: DONE WITH CAVEAT — scoring engine, routes, override, idempotency, denormalization, frontend wiring all verified with real API runs. The Gemini explanation is SKIPPED (no key) exactly like Section 2; scores are unaffected (by design). With a key, rerun section3-verify.mjs to see explanation text populate.
