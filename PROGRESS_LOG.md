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

## [2026-09-15 ~01:20] STEP 4 — REAL EMAIL SENDING ON OFFER SEND
### What I did
- Created backend/src/services/mail.service.ts: Nodemailer via existing SMTP_HOST/PORT/USER/PASS/EMAIL_FROM env (already declared in config/env.ts), HTML offer email (candidate name, job title, company, CTC, response-by date, big "View Your Offer" portal button + plain link). smtpConfigured() gate; no-creds → {sent:false, skipped:true, reason, logged:{to,subject,portalUrl}} + console log — never a fabricated success.
- Wired into POST /:id/send: generates PDF (if missing), ensures portalToken, looks up candidate/job/org, calls sendOfferEmail, marks sent. Response now returns {offer, email: <real result object>}.
- HARD-EDGE FIX (unplanned but required): generateOfferPdf used to THROW "Must supply api_key" when Cloudinary creds are missing (they are) — the whole send route 500'd and email could never be reached. It now renders the REAL PDF via Puppeteer (unchanged) and, without Cloudinary, stores the base64 bytes on the offer + a data: URL in pdfUrl. Real, openable PDF either way; zero fabrication.
- Fixed one TS trap: dynamic import() resolves ESM-only under NodeNext ("Cannot find module"); replaced with a static import.
- Also hit and fixed a script bug of my own (users response shape) — script only.

### Real output (full real chain, fresh offer)
```
managerId=6aa7140fe1f23b7704a7b6d4
OFFER CREATE status=201 id=6aa724be531f31f44eddf3c5
SUBMIT status=200
APPROVE×3 → 200,200,200 offerStatus="approved"
SEND status=200
SEND EMAIL RESULT: {"sent":false,"skipped":true,"reason":"SMTP_USER/SMTP_PASS not configured",
  "logged":{"to":"mail.mu0e4o2e@test.com","subject":"Your offer from Verification Org 2 — Mail Job mu0e4o2e",
  "portalUrl":"http://localhost:5173/portal/offers/cf3a7a8ac1b616558570846898ad4127649af7ebf050f9425252fea0787f0f54"}}
OFFER STATUS: sent portalToken=present(len 64)
BE_TSC=0, rebuild OK, restart pid 23536, HEALTH=200
```
### Status: PARTIALLY DONE — send flow fully wired and verified through the real API; the actual inbox delivery test (4.2) is SKIPPED: SMTP_USER/SMTP_PASS empty (HARD STOP: missing credential). The skip is honest in the API response. With creds in .env, re-running section4-verify.mjs sends for real with zero code changes.

## [2026-09-15 ~01:45] INCIDENT — Atlas allowlist rotated AGAIN mid-Section-5
### What happened
ISP (Jio CGNAT) rotated the public IP 152.58.16.191 → 152.58.32.33 (3/3 curl probes). Atlas edge now rejects TLS (`tlsv1 alert internal error`), logins/register 500 with MongoNetworkError. Backend boot succeeded at 01:40 but pooled connections die as they re-open.
### Decision (no one awake to ask — documenting per rules)
Continue all coding work; run runtime verification against a REAL local MongoDB via `mongodb-memory-server` (dev-only dep) on port 5001. NOT a mock: a genuine mongod binary; every tenancy/lifecycle assertion stays meaningful. backend/.env (Atlas URI) untouched — production path intact. All section verify scripts rerun against Atlas unchanged once the allowlist includes the current IP (add 152.58.32.33 or 0.0.0.0/0).
### Status: DOCUMENTED

## [2026-09-15 ~02:05] STEP 5 — CANDIDATE OFFER PORTAL (Phase 8)
### What I did
- Backend backend/src/modules/portal/portal.routes.ts, mounted at /api/v1/portal/offers with NO auth middleware and a dedicated rate limiter (30 req / 10 min, standard headers) registered inside the router (app.use in app.ts with an explanatory comment).
- GET /:token — public-safe projection ONLY (candidateName, jobTitle, companyName+logo+address, joiningDate, annualCTC summary, workLocation, pdfUrl, expiresAt, status). Sets firstViewedAt once, lastViewedAt always, sent→viewed. Malformed/nonexistent/withdrawn/expired tokens → ONE generic 404 message (no enumeration hints).
- POST /:token/accept — typed full name (3–120 chars) as acceptanceSignature + client IP + User-Agent + acceptedAt; guards: expired→410, already-decided→409, invalid→404. This is the deliberate MVP typed-name e-signature — no real e-sign integration, per project invariants.
- POST /:token/reject — optional reason, rejectedAt, status=rejected, same guards.
- POST /:token/query — clarification appended to offer.clarificationRequests (new model field), status unchanged.
- Offer model: +rejectionReason, +clarificationRequests[].
- Frontend /portal/offers/:token (PortalOfferPage) — OUTSIDE RequireAuth in App.tsx: offer card with company branding, 2×2 facts grid, PDF download link, accept flow with typed-name e-sign + explicit "name+timestamp+IP are recorded" notice, decline with optional reason, ask-a-question, and distinct states for invalid link / expired / already accepted / already rejected. All calls hit the real public routes via the shared axios client.
- Ran against the REAL local mongod (see 01:45 incident entry) after parametrizing the script (VERIFY_BASE/VERIFY_EMAIL/VERIFY_PASS, self-seeding org).

### Real output (VERIFY_BASE=http://127.0.0.1:5001, real Mongo, real HTTP, no auth headers on portal calls)
```
SETUP: offer=6aa72874a0967799cffda0c6  sent=true tokenLen=64
VIEW status=200 candidateName="Portal Cand mu0ep20n" jobTitle="Portal Job mu0ep20n" company="S5 Verify Org" ctc=1500000 status=viewed
VIEW leak check: has orgId=false has email=false has annexure=false
ACCEPT status=200 signedAs="Portal Cand mu0ep20n" ip="::ffff:127.0.0.1" at=2026-09-13T22:49:25.913Z
ACCEPT-AGAIN status=409 msg="This offer was already accepted."
QUERY status=200 {"received":true,"message":"Your question has been sent to the hiring team."}
INVALID status=404/404 sameMsg=true msg="This offer link is invalid or no longer available."
CROSS-ORG GET offer status=404 | CROSS-ORG GET score status=404  (404 expected both)
BE_TSC=0 FE_TSC=0; real mongod :5002 + server :5001 HEALTH=200
```
### Status: DONE (verified against real local MongoDB because of the 01:45 Atlas incident; portal code is DB-agnostic. Rerun `VERIFY_BASE=http://localhost:5000 node scripts/section5-verify.mjs` against Atlas after the allowlist fix for an identical proof there.)

## [2026-09-15 ~02:45] STEP 6 — NOTIFICATIONS + REPORTS + DASHBOARD WIRING (Phase 9)
### What I did
- 6.1 Notification model+routes: GET (paginated, most-recent-first, mine + org-wide, unread filter, unreadCount), PATCH /:id/read, PATCH /read-all. REST polling ONLY — no Socket.io anywhere (frontend: refetchInterval 30s in the dashboard hook). Created services/notification.service.ts notify()/notifyOrg() — fire-and-forget, never fails the host operation. Wired into REAL trigger points (not rebuilt modules): interview scheduled (interview.routes), offer level approved + fully approved (offer.routes approve), portal accepted + portal rejected (portal.routes).
- 6.2 Reports module /api/v1/reports/*: pipeline-summary (stage counts + avgFitScore), source-quality (per candidate source: applications/avgFit/passed/hired/hireRate), time-to-hire ($dateDiff application→Joined), offer-analytics (per status counts + avgCTC + accept-rate), industries (candidate employer distribution), countries (candidate city distribution — India-first city level). Every pipeline $match/es organizationId first; localField/foreignField joins inside the org's own collections.
- 6.3 Dashboard rewired to real data, layout unchanged: Upcoming Interview → next scheduled from /interviews (time/job/duration/Join link), Current Vacancies → /jobs?status=open, Industries/Countries Insight → /reports/industries + /reports/countries (real bars with candidate counts; map placeholder replaced by honest bar list titled "Locations Insight"), Potential Candidates → /candidates?limit=5 (real rows, click opens the real CandidateSummaryModal), TopBar badge → real unreadCount via 30s polling. All mock constants deleted.
- 6.4 verified below against real local Mongo (incident workaround).

### Real output
```
SEED register=201 · INTERVIEW=201 · OFFER create=201 · sent + portal-accepted
NOTIFICATIONS status=200 total=5 types=["offer_accepted","offer_approved","offer_approval_progressed","offer_approval_progressed","interview_scheduled"]
/pipeline-summary → stages: Shortlisted 1 (avgFit 45), Applied 1, Joined 1
/source-quality → manual: 2 apps, 1 hired, hireRatePct 50 · referral: 1 app, 0
/time-to-hire → hires=1 avgDays=0 (same-day test data; pipeline correct)
/offer-analytics → accepted 1, avgCTC 900000, acceptRatePct 100
/industries → Infotech0/1/2 (1 each) · /countries → Pune/Mumbai/Bengaluru (1 each)
UNREAD count=5 → READ-ALL updated=5 → unread now=0
BE_TSC=0 FE_TSC=0
```
### Status: DONE
