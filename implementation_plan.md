# HireFlow AI — Full-Stack Implementation Plan

> **Stack decisions locked (confirmed by user):**
> MERN + TypeScript · Custom JWT auth · Google Gemini AI · MongoDB · Puppeteer PDF · In-process queue (p-limit) · React + Vite + shadcn/ui · Render + Vercel + Atlas · #F3F4F6 background · Typed-name e-signature · Full PRD Must-Have MVP

---

## Overview

**HireFlow AI** is an India-first, AI-powered ATS + HR document platform for 10–300 employee companies. The first commercial build covers the entire must-have MVP loop:

```
Org Setup → Jobs → Candidate Applications → Resume Parsing (Gemini) →
Candidate Fit Score → Hiring Pipeline → Interviews → Offer Letters →
Approval Workflow → Candidate Offer Portal → Acceptance
```

Two surfaces: **(1) Marketing Landing Page** and **(2) Product App (dashboard + all modules)**. Both share the same exact brand tokens.

---

## Confirmed Decisions

| Decision | Choice |
|---|---|
| Backend | Node.js + Express 5 + TypeScript |
| Frontend | React + Vite + TypeScript + Tailwind CSS + shadcn/ui |
| Database | MongoDB (Mongoose) |
| Auth | Custom JWT (access 15min / refresh 7d) + Google OAuth (Passport.js) |
| AI Provider | Google Gemini API (`@google/genai`) |
| PDF Generation | Puppeteer (server-side HTML → PDF) |
| Queue | In-process async + `p-limit` (no Redis for MVP) |
| File Storage | Cloudinary (logos, avatars, photos) + Cloudinary `raw` (resume files) |
| E-Signature | Typed full name + timestamp + IP record |
| Deployment | Render (backend) + Vercel (frontend) + MongoDB Atlas |
| Background | `#F3F4F6` (light neutral gray as confirmed from dashboard screenshots) |

---

## Design Tokens (Locked — No Deviation Allowed)

```css
--color-primary:        #77A719   /* olive green — icons, active nav text */
--color-primary-bright: #95CC29   /* lime green — CTA buttons, progress bars */
--color-primary-tint:   #E7F2D2   /* pale green — active sidebar bg, skill tags */
--color-ink:            #0A0A0A   /* near-black — headings, dark buttons */
--color-slate:          #F3F4F6   /* light gray — page background */
/* Supporting: white #FFFFFF cards, border #E5E7EB, muted text #6B7280 */
```

**Typography:** `Inter` (Google Fonts) — Semi Bold / Medium / Regular only.  
**Radii:** cards 16–20px · buttons + pills `border-radius: 9999px` · avatars circular  
**Component library:** `shadcn/ui` primitives restyled with the above tokens.

---

## Repository Structure

```
HireFlow AI/
├── backend/
│   ├── src/
│   │   ├── server.ts               # DB connect → cron → listen
│   │   ├── app.ts                  # Middleware stack + route mounts
│   │   ├── config/
│   │   │   ├── env.ts              # Zod-validated env (crash on bad config)
│   │   │   ├── db.ts               # mongoose.connect
│   │   │   ├── passport.ts         # Google OAuth strategy
│   │   │   └── cloudinary.ts       # Cloudinary SDK init
│   │   ├── middleware/
│   │   │   ├── requireAuth.ts      # JWT verify → req.user
│   │   │   ├── validate.ts         # Zod schema factory
│   │   │   ├── roleGuard.ts        # Role enforcement
│   │   │   ├── tenantGuard.ts      # Org-level tenant isolation
│   │   │   └── errorHandler.ts     # Central error → standard JSON
│   │   ├── modules/
│   │   │   ├── auth/               # login, register, refresh, logout, Google OAuth
│   │   │   ├── organizations/      # org CRUD, settings, logo upload
│   │   │   ├── users/              # invite, roles, department management
│   │   │   ├── departments/        # department CRUD
│   │   │   ├── jobs/               # job CRUD, public job page, AI JD generator
│   │   │   ├── job-requirements/   # mandatory/preferred requirements
│   │   │   ├── candidates/         # profile CRUD, filters, comparison
│   │   │   ├── applications/       # pipeline stage management
│   │   │   ├── resumes/            # upload (Cloudinary raw), parse (Gemini)
│   │   │   ├── scores/             # candidate fit score calculation
│   │   │   ├── interviews/         # scheduling, scorecards, feedback
│   │   │   ├── offers/             # offer CRUD, approval workflow, versioning
│   │   │   ├── offer-portal/       # public candidate offer portal (no auth)
│   │   │   ├── templates/          # email + offer letter templates
│   │   │   ├── notifications/      # in-app notification management
│   │   │   ├── communications/     # email send + history
│   │   │   ├── reports/            # aggregation endpoints
│   │   │   ├── uploads/            # signed Cloudinary upload endpoint
│   │   │   └── audit/              # audit log reads
│   │   ├── services/
│   │   │   ├── email.service.ts    # Nodemailer (SMTP/Resend)
│   │   │   ├── gemini.service.ts   # Google Gemini wrapper
│   │   │   ├── cloudinary.service.ts # Upload/delete helpers
│   │   │   ├── pdf.service.ts      # Puppeteer HTML→PDF
│   │   │   ├── score.service.ts    # Candidate fit score algorithm
│   │   │   ├── resume-parser.service.ts # Gemini-powered resume extraction
│   │   │   └── cron.service.ts     # Offer expiry + reminder jobs
│   │   ├── sockets/
│   │   │   └── index.ts            # Socket.io JWT auth + notification rooms
│   │   ├── utils/
│   │   │   ├── jwt.ts              # signAccess, signRefresh, verify
│   │   │   ├── ownershipCheck.ts   # assertOwnership helper
│   │   │   ├── tenantCheck.ts      # assertBelongsToOrg helper
│   │   │   ├── tokenCompare.ts     # crypto.timingSafeEqual wrapper
│   │   │   ├── encryption.ts       # AES-256-GCM
│   │   │   └── pagination.ts       # Pagination helper
│   │   └── types/
│   │       ├── express.d.ts        # req.user, req.org augmentation
│   │       └── index.ts            # Shared type definitions
│   ├── postman/
│   ├── .env.example
│   ├── .gitignore
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx                 # Route definitions + layout
│   │   ├── lib/
│   │   │   ├── env.ts              # VITE_* Zod validation
│   │   │   ├── utils.ts            # shadcn/ui cn() utility
│   │   │   └── api/
│   │   │       ├── client.ts       # Axios + interceptors
│   │   │       └── refreshClient.ts
│   │   ├── auth/
│   │   │   ├── AuthProvider.tsx
│   │   │   └── tokenStore.ts
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── Sidebar.tsx     # Exact reference sidebar
│   │   │   │   ├── TopBar.tsx      # Greeting + notification buttons
│   │   │   │   └── AppShell.tsx    # Sidebar + TopBar + <Outlet>
│   │   │   ├── ui/                 # shadcn/ui components (auto-generated)
│   │   │   ├── shared/
│   │   │   │   ├── DashboardCard.tsx    # Reusable card with header+tabs+body
│   │   │   │   ├── RequireAuth.tsx
│   │   │   │   ├── RequireRole.tsx
│   │   │   │   ├── ErrorBoundary.tsx
│   │   │   │   ├── FullPageSpinner.tsx
│   │   │   │   ├── AvatarStack.tsx      # Overlapping avatar circles
│   │   │   │   ├── SkillTag.tsx         # Pale-green skill pill
│   │   │   │   ├── StatusBadge.tsx      # Pipeline stage badges
│   │   │   │   └── CandidateSummaryModal.tsx
│   │   ├── features/
│   │   │   ├── dashboard/          # Overview page (§3 reference)
│   │   │   ├── jobs/               # Job list, create, detail, public preview
│   │   │   ├── candidates/         # Pipeline view, profile, comparison
│   │   │   ├── applications/       # Kanban pipeline board
│   │   │   ├── interviews/         # Calendar, scorecard
│   │   │   ├── offers/             # Builder, approval, version history
│   │   │   ├── offer-portal/       # Public candidate portal (unauthenticated route)
│   │   │   ├── templates/          # Email + offer templates
│   │   │   ├── reports/            # Charts + tables
│   │   │   ├── settings/           # Org, users, roles, pipeline config
│   │   │   └── notifications/      # Notification center
│   │   ├── pages/
│   │   │   ├── marketing/          # Landing page (§2 reference)
│   │   │   │   └── LandingPage.tsx
│   │   │   ├── auth/
│   │   │   └── onboarding/
│   │   └── styles/
│   │       └── globals.css         # Tailwind base + CSS custom properties
│   ├── .env.example
│   ├── .gitignore
│   ├── tailwind.config.ts          # Exact brand tokens
│   ├── components.json             # shadcn/ui config
│   └── package.json
│
└── docs/
    ├── PROJECT_BLUEPRINT.md
    ├── BACKEND_PLANNING.md
    └── API_DOCS.md
```

---

## Mongoose Data Models (17 Collections)

### 1. Organization
```typescript
{
  name, logoUrl, logoClouldinaryId, industry, size, website,
  address, country, timezone, currency, dateFormat,
  isActive, plan, dataRetentionMonths,
  createdAt, updatedAt
}
```

### 2. User
```typescript
{
  organizationId, name, email, passwordHash?,
  googleId?, avatarUrl?,
  role: enum[super_admin, org_admin, recruiter, hiring_manager,
             interviewer, finance_approver, hr_head],
  departmentId?,
  status: enum[invited, active, disabled],
  lastLogin, inviteToken?, inviteExpiry?,
  failedLoginAttempts, lockUntil?,
  refreshTokens: [{ tokenHash, createdAt, expiresAt, userAgent, ip }],
  createdAt, updatedAt
}
```

### 3. Department
```typescript
{
  organizationId, name, headUserId?, isArchived, createdAt
}
```

### 4. Job
```typescript
{
  organizationId, title, departmentId, hiringManagerId, recruiterId,
  employmentType, workplaceType, location, vacancies,
  minExperience, maxExperience, minSalary, maxSalary, currency,
  deadline, description, responsibilities,
  status: enum[draft, awaiting_approval, open, paused, closed, filled, archived],
  publicSlug,  // for public job page URL
  screeningQuestions: [{ question, required }],
  createdAt, updatedAt
}
```

### 5. JobRequirement
```typescript
{
  jobId, type: enum[mandatory, preferred, optional, disqualifying],
  name, description, weight?, isActive, createdAt
}
```

### 6. Candidate
```typescript
{
  organizationId, fullName, email, phone, currentCity, preferredLocation,
  currentCompany, currentDesignation, totalExperienceYears,
  currentSalary, expectedSalary, noticePeriodDays,
  skills: [string], education: [...], certifications: [...],
  workHistory: [...], projects: [...], languages: [...],
  linkedinUrl?, githubUrl?, portfolioUrl?, photoUrl?, photoCloudinaryId?,
  source: enum[public_application, manual, resume_upload, bulk_upload,
               referral, agency, email_import],
  tags: [string], isDeleted, deletedAt?,
  createdAt, updatedAt
}
```

### 7. Resume
```typescript
{
  candidateId, fileUrl, fileCloudinaryId, originalFilename,
  fileType: enum[pdf, doc, docx],
  parsedText?, parsedData: { /* structured extraction */ },
  parsingStatus: enum[pending, processing, completed, failed],
  parsingConfidence: { overall, perField: Map<string, number> },
  resumeQualityScore?,
  uploadedAt, parsedAt?
}
```

### 8. CandidateApplication
```typescript
{
  organizationId, candidateId, jobId,
  pipelineStage: string,  // configurable, default set per org
  fitScore?, eligibilityStatus?,
  recruiterOwnerId?,
  screeningAnswers: [...],
  isDeleted, status: enum[active, withdrawn, rejected, duplicate],
  applicationDate, lastActivityAt, createdAt, updatedAt
}
```

### 9. CandidateScore
```typescript
{
  applicationId, overallScore,
  breakdown: {
    mandatorySkills: { score, weight, details },
    relevantExperience: { score, weight, details },
    roleIndustrySimilarity: { score, weight, details },
    preferredSkills: { score, weight, details },
    educationCertifications: { score, weight, details },
    projectRelevance: { score, weight, details },
    availability: { score, weight, details }
  },
  eligibilityChecks: [{ requirementId, status, notes }],
  explanation: { strengths, missing, gaps, unavailableInfo },
  scoringConfigSnapshot: { /* weights at time of scoring */ },
  geminiModelVersion, isOverridden, overrideReason?, overriddenBy?,
  createdAt
}
```

### 10. PipelineConfig
```typescript
{
  organizationId,
  stages: [{ id, name, color, order, requiredActions?, autoEmailTemplateId? }],
  isDefault, createdAt, updatedAt
}
```

### 11. Interview
```typescript
{
  organizationId, applicationId, candidateId, jobId,
  type: enum[hr_screening, technical, assignment_review,
             managerial, cultural, final],
  interviewerIds: [UserId],
  scheduledAt, durationMinutes,
  meetingLink?, location?, instructions?,
  status: enum[scheduled, ongoing, completed, cancelled, rescheduled],
  cancelReason?, rescheduledFrom?,
  createdAt, updatedAt
}
```

### 12. InterviewScorecard
```typescript
{
  interviewId, interviewerId, applicationId,
  competencies: [{ name, description, rating: 1-5, notes }],
  overallRating,
  recommendation: enum[strong_hire, hire, neutral, do_not_hire, strong_do_not_hire],
  generalNotes?,
  isSubmitted, submittedAt?,
  createdAt, updatedAt
}
```

### 13. Offer
```typescript
{
  organizationId, applicationId, candidateId, jobId, templateId?,
  version: number,  // increment on each edit
  status: enum[draft, awaiting_approval, changes_requested, approved,
               sent, viewed, accepted, rejected, expired, withdrawn, revised],
  joiningDate, reportingManagerId, workLocation,
  probationPeriodDays, noticePeriodDays, validUntil,
  salaryStructure: {
    annualCTC, basicSalary, hra, specialAllowance, variablePay,
    performanceBonus, joiningBonus, employerPF, gratuity, insurance,
    esop?, otherBenefits: [...],
    monthlyGross  // auto-calculated
  },
  specialConditions?,
  pdfUrl?, pdfCloudinaryId?,
  sentAt?, firstViewedAt?, lastViewedAt?, acceptedAt?, rejectedAt?,
  acceptanceSignature?, acceptanceIp?, acceptanceUserAgent?,
  previousVersions: [OfferSnapshot],
  createdBy, createdAt, updatedAt
}
```

### 14. OfferApproval
```typescript
{
  offerId, organizationId,
  approvalConfig: [{ level, approverId, role }],
  approvals: [{
    level, approverId, status, comments, decidedAt, offerVersion
  }],
  currentLevel, overallStatus,
  createdAt, updatedAt
}
```

### 15. DocumentTemplate
```typescript
{
  organizationId, type: enum[offer_letter, email, interview_scorecard, salary],
  name, htmlContent, variables: [string],
  version, isDefault, isActive,
  createdBy, createdAt, updatedAt
}
```

### 16. Communication
```typescript
{
  organizationId, candidateId, applicationId?,
  channel: enum[email, in_app],
  senderId, recipientEmail,
  subject, htmlContent, textContent,
  deliveryStatus, openedAt?, repliedAt?,
  templateId?,
  sentAt, createdAt
}
```

### 17. AuditLog
```typescript
{
  organizationId, userId,
  action: string,  // e.g. "OFFER_APPROVED", "CANDIDATE_STAGE_CHANGED"
  entityType, entityId,
  previousValue?, newValue?,
  ipAddress?, userAgent?,
  createdAt  // TTL index: keep 2 years
}
```

### 18. Notification
```typescript
{
  organizationId, userId,
  type: string,  // e.g. "INTERVIEW_SCHEDULED"
  title, message,
  link?,
  isRead, readAt?,
  relatedEntityType?, relatedEntityId?,
  createdAt  // TTL index: auto-delete after 90 days
}
```

---

## Backend Module Map (API Routes)

### Auth (`/api/v1/auth`)
| Method | Route | Description |
|---|---|---|
| POST | `/register` | Create user + org |
| POST | `/login` | Email/password login |
| POST | `/refresh` | Rotate refresh token |
| POST | `/logout` | Clear refresh token |
| GET | `/google` | Google OAuth initiate |
| GET | `/google/callback` | Google OAuth callback |
| POST | `/forgot-password` | Send reset email |
| POST | `/reset-password` | Set new password with token |
| POST | `/invite/accept` | Accept team invitation |

### Organizations (`/api/v1/organizations`)
| Method | Route | Description |
|---|---|---|
| GET | `/me` | Get current org |
| PATCH | `/me` | Update org settings |
| POST | `/me/logo` | Upload logo (Cloudinary signed) |
| GET | `/me/pipeline-config` | Get pipeline stages |
| PUT | `/me/pipeline-config` | Save pipeline config |
| GET | `/me/scoring-config` | Get scoring weights |
| PUT | `/me/scoring-config` | Update scoring weights |

### Users (`/api/v1/users`)
| Method | Route | Description |
|---|---|---|
| GET | `/me` | Get own profile |
| PATCH | `/me` | Update own profile |
| GET | `/` | List org users |
| POST | `/invite` | Invite user by email |
| PATCH | `/:id/role` | Change user role |
| PATCH | `/:id/disable` | Disable user |
| DELETE | `/:id` | Remove user |
| GET | `/me/export` | GDPR export |

### Departments (`/api/v1/departments`)
Standard CRUD + archive.

### Jobs (`/api/v1/jobs`)
| Method | Route | Description |
|---|---|---|
| GET | `/` | List jobs (paginated, filtered) |
| POST | `/` | Create job |
| GET | `/:id` | Get job detail |
| PATCH | `/:id` | Edit job |
| PATCH | `/:id/status` | Change job status |
| DELETE | `/:id` | Archive job |
| POST | `/:id/requirements` | Add requirements |
| GET | `/:id/analytics` | Job analytics |
| POST | `/ai/generate-jd` | Gemini JD generation |

### Public Job (`/api/v1/public/jobs`)
| Method | Route | Description |
|---|---|---|
| GET | `/:slug` | Public job page data |
| POST | `/:slug/apply` | Submit application + resume |

### Candidates (`/api/v1/candidates`)
| Method | Route | Description |
|---|---|---|
| GET | `/` | List + filter + sort candidates |
| POST | `/` | Create candidate manually |
| GET | `/:id` | Get candidate profile |
| PATCH | `/:id` | Edit candidate |
| DELETE | `/:id` | Soft delete |
| GET | `/:id/export` | Export candidate data |
| POST | `/compare` | Compare up to 5 candidates |
| POST | `/detect-duplicates` | Check for duplicates |
| POST | `/merge` | Merge two candidate profiles |

### Resumes (`/api/v1/resumes`)
| Method | Route | Description |
|---|---|---|
| POST | `/upload` | Single resume upload (Cloudinary) |
| POST | `/bulk-upload` | Bulk resume queue |
| POST | `/:id/parse` | Parse/reparse resume (Gemini) |
| PATCH | `/:id/parsed-data` | Manual correction of parsed data |
| GET | `/:id/parse-status` | Parsing status polling |

### Applications (`/api/v1/applications`)
| Method | Route | Description |
|---|---|---|
| GET | `/` | List applications (by job/stage) |
| POST | `/` | Create application link (candidate ↔ job) |
| GET | `/:id` | Get application |
| PATCH | `/:id/stage` | Move pipeline stage |
| POST | `/:id/notes` | Add note |
| GET | `/:id/score` | Get fit score |
| POST | `/:id/score/generate` | Trigger AI score calculation |
| POST | `/:id/score/override` | Override AI score |

### Interviews (`/api/v1/interviews`)
| Method | Route | Description |
|---|---|---|
| GET | `/` | List interviews |
| POST | `/` | Schedule interview |
| GET | `/:id` | Interview detail |
| PATCH | `/:id` | Edit/reschedule |
| DELETE | `/:id` | Cancel |
| POST | `/:id/scorecards` | Submit scorecard |
| GET | `/:id/scorecards` | Get all scorecards (after submission gate) |
| POST | `/:id/summary` | Gemini feedback summary |

### Offers (`/api/v1/offers`)
| Method | Route | Description |
|---|---|---|
| GET | `/` | List offers |
| POST | `/` | Create offer |
| GET | `/:id` | Offer detail |
| PATCH | `/:id` | Edit offer (pre-approval) |
| POST | `/:id/submit` | Submit for approval |
| POST | `/:id/approve` | Approve/reject/request-changes |
| POST | `/:id/send` | Generate PDF + send to candidate |
| POST | `/:id/withdraw` | Withdraw offer |
| GET | `/:id/pdf` | Download offer PDF |
| GET | `/:id/history` | Version history |

### Candidate Offer Portal (`/api/v1/portal/offers`) — no auth required
| Method | Route | Description |
|---|---|---|
| GET | `/:token` | View offer (validates signed token) |
| POST | `/:token/accept` | Accept offer (typed signature + IP) |
| POST | `/:token/reject` | Reject offer |
| POST | `/:token/query` | Send clarification request |

### Templates (`/api/v1/templates`)
Standard CRUD for offer letter + email templates.

### Reports (`/api/v1/reports`)
| Method | Route | Description |
|---|---|---|
| GET | `/pipeline-summary` | Candidates by stage |
| GET | `/source-quality` | Applications by source |
| GET | `/time-to-hire` | Time metrics |
| GET | `/offer-analytics` | Offer funnel |
| GET | `/recruiter-performance` | Per-recruiter stats |
| GET | `/industries` | Industry distribution (dashboard widget) |
| GET | `/countries` | Country distribution (dashboard widget) |

### Uploads (`/api/v1/uploads`)
| Method | Route | Description |
|---|---|---|
| POST | `/sign` | Get Cloudinary signed upload params |

### Notifications (`/api/v1/notifications`)
| Method | Route | Description |
|---|---|---|
| GET | `/` | List my notifications |
| PATCH | `/:id/read` | Mark as read |
| PATCH | `/read-all` | Mark all read |

### Audit (`/api/v1/audit`)
| Method | Route | Description |
|---|---|---|
| GET | `/` | Query audit logs (admin only) |

### Health
| Method | Route | Description |
|---|---|---|
| GET | `/health` | Liveness check |
| GET | `/ready` | Readiness (DB connected) |

---

## AI Integration Points (Gemini)

### 1. Job Description Generation
**Trigger:** `POST /api/v1/jobs/ai/generate-jd`  
**Input:** title, industry, experience, skills, location, type  
**Output:** structured JSON `{ description, responsibilities, requirements }`  
**Label:** "AI-generated draft — review before publishing"

### 2. Resume Parsing
**Trigger:** after file upload (async, in-process queue)  
**Input:** resume text extracted from PDF/DOC (via `pdf-parse` / `mammoth`)  
**Output:** structured JSON candidate profile fields with confidence scores  
**Prompt:** strict extraction-only, zero inference, structured JSON schema output  
**Label:** parsing confidence badge per field

### 3. Candidate Fit Score Explanation
**Trigger:** after rule-based score is calculated  
**Input:** score breakdown + candidate profile + job requirements  
**Output:** `{ strengths[], missing[], gaps[], unavailableInfo[], summary }`  
**Note:** The **numeric score is calculated by application logic (deterministic)**; Gemini only provides the human-readable explanation.

### 4. Interview Feedback Summary
**Trigger:** `POST /api/v1/interviews/:id/summary` (after all scorecards submitted)  
**Input:** all scorecard competencies + ratings + notes  
**Output:** paragraph summary + overall recommendation  
**Label:** "AI-generated summary — original feedback always visible"

### 5. Email Drafting
**Trigger:** user requests AI draft in communication compose  
**Input:** template type + context variables  
**Output:** editable draft  
**Label:** "AI-generated draft"

### Score Calculation Algorithm (deterministic, NOT AI)
```typescript
// Weights (org-configurable, defaults):
const weights = {
  mandatorySkills: 0.30,
  relevantExperience: 0.25,
  roleIndustrySimilarity: 0.15,
  preferredSkills: 0.10,
  educationCertifications: 0.10,
  projectRelevance: 0.05,
  availability: 0.05,
};

// Mandatory gate: if ANY mandatory requirement = FAILED → eligibility = FAILED
// Score is still calculated but marked with a FAILED eligibility badge.
```

---

## Frontend Architecture

### Route Map
```
/                          → LandingPage (marketing, unauthenticated)
/login                     → LoginPage
/register                  → RegisterPage
/auth/google/callback      → OAuthCallback
/invite/accept/:token      → InviteAccept
/onboarding                → OrgSetup wizard
/app                       → AppShell (RequireAuth wrapper)
  /app/dashboard           → Overview (§3 reference screenshot)
  /app/jobs                → Job list
  /app/jobs/new            → Create job
  /app/jobs/:id            → Job detail
  /app/jobs/:id/edit       → Edit job
  /app/candidates          → Candidate list
  /app/candidates/:id      → Candidate profile
  /app/pipeline/:jobId     → Kanban pipeline
  /app/interviews          → Interview calendar
  /app/offers              → Offer list
  /app/offers/new          → Offer builder
  /app/offers/:id          → Offer detail
  /app/templates           → Templates manager
  /app/reports             → Reports
  /app/settings/*          → Settings sub-routes
/portal/offers/:token      → CandidateOfferPortal (unauthenticated, public)
/jobs/:slug                → PublicJobPage (unauthenticated)
```

### TanStack Query Key Convention
```typescript
// Jobs
['jobs', { orgId, filters }]
['job', jobId]

// Candidates
['candidates', { orgId, filters }]
['candidate', candidateId]

// Applications (pipeline)
['applications', { jobId, stage }]

// Interviews
['interviews', { orgId, dateRange }]

// Offers
['offers', { orgId, status }]
['offer', offerId]

// Dashboard widgets
['dashboard', 'upcoming-interview']
['dashboard', 'current-vacancies']
['dashboard', 'industries-insight']
['dashboard', 'countries-insight']
['dashboard', 'potential-candidates']
```

### Tailwind Config (excerpt)
```typescript
// tailwind.config.ts
export default {
  theme: {
    extend: {
      colors: {
        primary: '#77A719',
        'primary-bright': '#95CC29',
        'primary-tint': '#E7F2D2',
        ink: '#0A0A0A',
        slate: '#F3F4F6',
        border: '#E5E7EB',
        muted: '#6B7280',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      borderRadius: {
        card: '1.25rem',   // 20px
        pill: '9999px',
      },
    },
  },
}
```

---

## Security Architecture

### Middleware Order (app.ts)
1. Sentry request handler
2. `helmet()` — security headers
3. `cors()` — explicit origin list from `CORS_ORIGINS` env
4. `express.json({ limit: '10kb' })`
5. `express-mongo-sanitize()` — NoSQL injection prevention
6. `morgan('dev')` — dev only
7. Global rate limit (`100 req/min/IP` on `/api`)
8. Auth rate limit (`10 req/min/IP` on `/api/v1/auth`)
9. Routes
10. Sentry error handler
11. Central `errorHandler`

### Multi-Tenancy Isolation
Every Mongoose query that touches org-specific data **must** include `organizationId: req.user.organizationId`. A `tenantGuard` middleware attaches the org to `req.org` and a `assertBelongsToOrg()` utility validates nested resource ownership. No cross-org data leakage is possible by design.

### Sensitive Data Access Matrix
| Data | Roles with access |
|---|---|
| Salary / CTC | org_admin, finance_approver, hr_head, recruiter (own offers) |
| Offer PDF | org_admin, hr_head, recruiter (assigned), candidate (own portal) |
| Audit logs | org_admin, hr_head |
| Candidate identity docs | org_admin, recruiter (assigned) |
| Interview scorecards | Interviewer sees own only until submitted; hiring_manager + org_admin after |

---

## Key Component Specifications

### `<DashboardCard>` (reusable shell for all §3 cards)
```tsx
interface DashboardCardProps {
  icon: LucideIcon;
  title: string;
  menu?: React.ReactNode;         // "..." overflow dropdown
  tabs?: { label: string; value: string }[];  // Companies / Candidates toggles
  activeTab?: string;
  onTabChange?: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}
```

### `<CandidateSummaryModal>` (§4 reference popup)
Props: `candidateId`, `applicationId`, `isOpen`, `onClose`  
Sections: identity block → "View documents" button → About → Professional Skills → Work Experiences  
Data: fetched via `useCandidate(candidateId)` + `useResume(candidateId)` TanStack Query hooks

### `<Sidebar>` (exact §3.1 reference)
- Fixed, 240px wide, white bg
- Collapsible with `<<` button → icon-only mode (64px)
- User card with avatar, name, role, "..." menu
- Nav sections: "Main Menu" and "Recruitment"
- Active state: `bg-primary-tint rounded-pill text-primary font-semibold`
- Bottom: Settings, Help & Support

### `<LandingPage>` (§2 reference)
- Sticky white header: logo + nav + "Log In" dark pill
- Hero: grid pattern bg + green radial blur + floating cards (absolutely positioned)
- 5 floating card types: 2× candidate cards (top), 1× job listing card (center), 2× cursor bubble cards (bottom)
- CTA row: "Get Started" (lime) + "Watch Demo" (dark, play icon)
- Trusted-by logo strip (grayscale)

---

## Environment Variables

### Backend `.env.example`
```env
NODE_ENV=development
PORT=5000

MONGODB_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/hireflow

JWT_ACCESS_SECRET=replace_with_64_char_hex
JWT_REFRESH_SECRET=replace_with_different_64_char_hex
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:5000/api/v1/auth/google/callback

CLIENT_URL=http://localhost:5173
CORS_ORIGINS=http://localhost:5173

ENCRYPTION_KEY=replace_with_64_char_hex

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

SMTP_HOST=smtp.resend.com
SMTP_PORT=465
SMTP_USER=resend
SMTP_PASS=your_smtp_api_key
EMAIL_FROM=noreply@hireflow.ai

GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.0-flash

SENTRY_DSN=https://your_sentry_dsn_here
```

### Frontend `.env.example`
```env
VITE_API_BASE_URL=http://localhost:5000
VITE_ENABLE_REAL_TIME=true
```

---

## Build Phases (Execution Order)

### Phase 0 — Project Scaffold & Config (Day 1)
- Init monorepo: `backend/` + `frontend/` with TypeScript strict
- Tailwind config with exact brand tokens
- shadcn/ui init + restyle with brand colors
- `src/config/env.ts` Zod validation (backend + frontend)
- MongoDB connection + base middleware stack
- `.gitignore` + `.cursorignore` + `.env.example` files
- CI baseline (typecheck + audit)

### Phase 1 — Auth + Org + Users (Days 2–4)
- Register + Login + JWT rotation + Google OAuth
- Organization CRUD + logo upload (Cloudinary)
- User invite workflow (email link, accept, role assignment)
- Department management
- `<AuthProvider>`, token store, `<RequireAuth>`, `<RequireRole>`
- Login, Register, InviteAccept, OrgSetup pages

### Phase 2 — App Shell + Dashboard UI (Days 5–7)
- `<Sidebar>` — exact reference, collapsible, active states
- `<TopBar>` — greeting, notification + message buttons
- `<AppShell>` — layout wrapper
- `<DashboardCard>` — reusable card component
- Overview Dashboard page with all 4 card sections (mock data first)
- `<CandidateSummaryModal>` — exact reference popup

### Phase 3 — Jobs Module (Days 8–10)
- Job CRUD + requirements management
- AI job description generator (Gemini)
- Job status workflow
- Public job page (`/jobs/:slug`) — unauthenticated
- Job list + detail screens

### Phase 4 — Candidates + Resume (Days 11–15)
- Candidate profile CRUD
- Single + bulk resume upload (Cloudinary `raw`)
- Resume text extraction (`pdf-parse` / `mammoth`)
- Gemini resume parsing → structured JSON
- Parsing review + manual correction UI
- Duplicate detection
- Candidate list with filters + sorting

### Phase 5 — Scoring + Pipeline (Days 16–19)
- Deterministic fit score calculation service
- Gemini explanation generation
- Score display with breakdown + eligibility checks
- Kanban pipeline board (drag-and-drop with `@dnd-kit/core`)
- Stage movement + notes + bulk operations
- Candidate comparison (up to 5 side-by-side)
- `CandidateSummaryModal` wired to real data

### Phase 6 — Interviews (Days 20–23)
- Interview scheduling + CRUD
- Interviewer scorecard submit
- Feedback privacy gate (see others only after own submission)
- Gemini feedback summary
- Interview calendar view

### Phase 7 — Offers + Approval (Days 24–29)
- Offer builder with salary structure calculator
- CTC validation (component totals must match)
- Offer letter template system with variable substitution
- Configurable approval workflow (sequential/parallel)
- Puppeteer PDF generation (offer letter + salary annexure)
- Offer version history
- Approval tracking + notifications

### Phase 8 — Candidate Offer Portal (Days 30–32)
- Secure signed token generation on offer send
- Public portal: view/download offer PDF
- Accept (typed name signature + IP record)
- Reject + query/clarification flow
- Offer tracking status updates (firstViewed, accepted timestamps)

### Phase 9 — Notifications + Comms + Reports (Days 33–36)
- In-app notification system (Socket.io rooms per user)
- Email communication history
- Email template composer
- Dashboard widgets wired to real API data
- Reports pages (pipeline, source, time-to-hire, offer funnel)

### Phase 10 — Audit + Settings + Polish (Days 37–40)
- Audit log display (admin)
- Settings: pipeline config, scoring weights, data retention
- Role-based permission enforcement verification
- Landing page final build (exact reference)
- Security checklist pass (npm audit, CSP, CORS, etc.)
- Postman collection

---

## Proposed Changes Summary

### [NEW] `backend/` — Express + TypeScript backend
All modules, services, middleware, models described above.

### [NEW] `frontend/` — React + Vite + Tailwind + shadcn/ui frontend
Full app shell, all feature modules, landing page, candidate portal.

### [NEW] `docs/PROJECT_BLUEPRINT.md`
Master reference blueprint committed to repo.

### [NEW] `docs/API_DOCS.md`
Full endpoint documentation per the blueprint template standard.

---

## Verification Plan

### Automated
- `npx tsc --noEmit` — both backend and frontend (strict mode, zero errors)
- `npm audit --audit-level=high` — no high/critical issues
- Postman collection run (all happy-path + error scenarios)

### Manual
- Walk the complete candidate journey: register org → create job → candidate applies → resume parsed → scored → pipeline moved → interview scheduled → offer created → approved → sent → candidate accepts
- Role isolation test: log in as each of the 7 roles, verify data access restrictions
- Cloudinary upload verify: logos, avatars, resumes all upload/retrieve correctly
- Gemini integration test: JD generation, resume parsing, score explanation
- PDF generation test: offer letter renders with branding, salary annexure correct
- Socket.io test: notification appears in-app when offer is approved

---

## Open Questions

> [!IMPORTANT]
> **Q1 — Google OAuth Redirect URI for Production:**  
> What will your production domain be? (e.g. `app.hireflow.ai`) — needed to configure `GOOGLE_CALLBACK_URL` and Vercel/Render env vars.

> [!IMPORTANT]
> **Q2 — Email Provider:**  
> The blueprint defaults to Resend/SMTP. Do you have a Resend account, or are you using another provider (SendGrid, AWS SES)? The `SMTP_*` env vars will need real values before email features work.

> [!NOTE]
> **Q3 — Gemini Model:**  
> Plan is to use `gemini-2.0-flash` (fast, cost-effective for structured extraction). If you prefer a different model (e.g. `gemini-2.5-pro` for higher accuracy on resume parsing), update `GEMINI_MODEL` in env. This can be changed at any time without code changes.

> [!NOTE]
> **Q4 — Company Logo / App Logo:**  
> Do you have a final HireFlow AI logo/icon SVG ready, or should we use the green leaf/diamond placeholder from the reference screenshot during the build?

> [!NOTE]
> **Q5 — Cloudinary Account:**  
> Do you already have a Cloudinary account set up? The `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` env vars are needed to test uploads. If not, the code will be ready but Cloudinary features won't function until credentials are added.
