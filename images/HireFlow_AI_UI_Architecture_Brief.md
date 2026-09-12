# HireFlow AI — UI, Brand & Architecture Brief for Antigravity

> Paste this whole file as the first message/context to Antigravity before asking it to scaffold anything. It has three parts: (1) exact design tokens, (2) pixel-level breakdown of every reference screen, (3) how this plugs into the MERN+TS backend/frontend architecture already defined for the project. Do not let the agent invent its own color palette, spacing, or component shapes — everything below is taken directly from the reference screenshots and brand sheet.

---

## 0. What we're building

**HireFlow AI** — an AI-powered ATS / recruitment + HR-document platform (India-first SaaS, 10–300 employee companies). Two reference product screenshots were provided under two working names ("Hirslams" for the marketing site, "Hirestream." for the app) — **treat both as the same product, rename all visible text to "HireFlow AI"** in the actual build. Copy the *layout, spacing, color usage and component shapes exactly*; only the wordmark/logo and copy change.

Two surfaces to build:
1. **Marketing / landing page** (reference: hero screenshot)
2. **Product dashboard app** (reference: sidebar dashboard + candidate summary modal)

---

## 1. Design Tokens (exact — do not approximate)

### 1.1 Color palette (source: Brand Guideline sheet)

| Token | Hex | Usage |
|---|---|---|
| `--color-primary` | `#77A719` | Primary brand green (darker/olive) — icons, active nav highlight text, links |
| `--color-primary-bright` | `#95CC29` | Lime/brighter green — primary CTA buttons, progress bars, active states, badges |
| `--color-primary-tint` | `#E7F2D2` | Pale green tint — active sidebar item background, chip/tag backgrounds, hover states |
| `--color-ink` | `#0A0A0A` | Near-black — all body text, dark buttons (Log In, Watch Demo), headings |
| `--color-slate` | `#F3F4F6` | Neutral background/secondary surface (page background, muted card fill, disabled states) |

**Note on `#F3F4F6`:** the swatch on the brand sheet renders visually as a muted slate-blue, but the printed hex label is `#F3F4F6`. Use the **printed hex** (`#F3F4F6`, a light neutral gray) as source of truth for actual page backgrounds — that's what's used behind the dashboard screenshots. Do not use a blue-gray value anywhere.

Supporting neutrals (derived, used in screenshots, not on the brand sheet — infer from screens):
- White `#FFFFFF` — card surfaces, sidebar background
- Border/divider gray `#E5E7EB`
- Muted text gray `#6B7280` (secondary labels, timestamps, placeholder text)
- Dark teal accent `#0E4F45`-ish (the floating job-card and chat-bubble cards on the landing hero use a deep teal/forest green, distinct from the brand lime green — sample this from the hero image if pixel-exact match matters, it is NOT one of the 5 brand-sheet colors, it's a hero-only accent)

### 1.2 Typography
- **Font family:** `Inter` (Google Fonts) — the only typeface in the system.
- **Weights used:** Semi Bold (headings, names, nav-active item), Medium (buttons, labels, sub-headings), Regular (body copy, table cells).
- Landing page hero headline: very large, bold/Semi Bold, tight line-height, mixed black/gray text within the same heading (see §2).

### 1.3 Shape & spacing
- **Corner radius:** cards/panels ≈ 16–20px; buttons and pills are fully rounded (`border-radius: 999px`); avatar images circular; small icon-swatches (job/vacancy icons) ≈ 10–12px radius squares.
- **Buttons:** pill-shaped, two variants — dark (`bg: #0A0A0A`, `text: white`) and lime (`bg: #95CC29`, `text: #0A0A0A` or white).
- **Cards:** white background, subtle border or very soft shadow, generous internal padding (~20–24px).
- **Grid gaps:** ~16–20px between dashboard cards.

---

## 2. Screen 1 — Marketing Landing Page

**Header (sticky, white bg):**
- Left: logo mark (green rounded diamond/leaf icon) + wordmark "HireFlow AI", Semi Bold.
- Center nav (Medium weight, gray text): Home · Features · Pricing · Blog · Testimonials.
- Right: single dark pill button "Log In" (`#0A0A0A` bg, white text).

**Hero section:**
- Background: very light, near-white, with a faint square-grid pattern and a soft green radial-gradient blur behind the headline.
- Headline: huge, bold, multi-line, center-aligned, mixing solid black words with lighter gray words in the same sentence for emphasis (e.g., "Find Your Strategic ... Workforce Planning ... Partners From Today" — alternating black/gray line-by-line). Font: Inter Semi Bold, very large size (~64–80px desktop).
- Subheadline directly below: gray, Regular weight, 2 lines, centered, smaller (~18px).
- CTA row, centered: 
  - Lime pill button "Get Started" (`#95CC29` bg, dark text)
  - Dark pill button "Watch Demo" with a small play-triangle icon (`#0A0A0A` bg, white text)
- **Floating decorative cards overlapping the hero text** (absolute-positioned, scattered around the headline, each with subtle shadow, appearing above the text/background):
  - Top-left: white rounded card — small circular avatar photo, name (Semi Bold) + role (gray, small) on two lines, a "•••" menu icon top-right, below it a date row "Start May 12, 2025" plus three small colored social/app icons (Gmail, LinkedIn, Instagram) as circular badges.
  - Top-right: mirror version of the same card style, different person.
  - Center, overlapping the headline: a dark teal rounded card acting like a "job listing" preview — small "Microsoft" label, bold job title "Senior Product Designer", 2-line gray-on-teal description, two small pill tags ("Full-Time", "Senior Level"), then a white bottom section on the same card showing "$8,000/Month" and location text.
  - Bottom-left: a black rounded pill/chat-bubble shape containing a small avatar + name + role (e.g., "Vinco Marconzo / Human Resources"), with a small cursor/pointer arrow icon nearby (simulating a live cursor, like a collaborative product).
  - Bottom-right: same chat-bubble shape but in the dark teal color, different person, with its own cursor arrow.
- **Trusted-by strip** below the fold: a horizontal row of grayscale/monochrome brand logos (e.g., Miro, Stripe, Google, Adobe, Spotify and 2 more), evenly spaced, all rendered in muted gray to look like a "logo cloud" — this is a static placeholder row, swap with the client's actual customer/partner logos later.

**Build note:** the floating cards + cursor bubbles are the signature visual of this landing page — implement as absolutely-positioned elements within a relatively-positioned hero container, each with independent `top/left/right` offsets and slight rotation for the "scattered" look, exactly as scattered in the reference.

---

## 3. Screen 2 — Dashboard (Overview page)

**Overall layout:** fixed left sidebar + main content area on a light-gray (`#F3F4F6`) page background, each dashboard panel a white rounded card floating on top of that gray background.

### 3.1 Sidebar (white, ~230–260px wide, full height)
- Top: wordmark "HireFlow AI" + a small collapse-arrow icon button (top-right of sidebar).
- Below that, a "current user" card: circular avatar, name (Semi Bold, e.g. "Alex Holland"), role subtitle (gray, small, e.g. "Recruitment Specialist"), a small badge/icon on the avatar corner, and a "•••" menu icon.
- **"Main Menu" section label** (small, gray, uppercase-ish), then nav items each with an icon + label:
  - Overview *(active — has a pale-green `#E7F2D2` pill background behind it and green/dark text)*
  - Schedule
  - Ongoing Recruitment
  - Analytics
  - Reports
- **"Recruitment" section label**, then nav items:
  - Vacancies
  - Candidates
  - Interviews
  - Offers
- Pushed to the bottom of the sidebar: Settings, Help & Support (same icon+label row style, muted).

### 3.2 Top bar (inside main content, no separate header card)
- Left: greeting "Hello, {FirstName} 👋" (Semi Bold, large) with a subtext line below in gray ("Here's the current status for today.").
- Right: two white pill buttons with a subtle border — a bell icon "Notifications" with a small dark badge showing a count (e.g. "4"), and an envelope icon "Messages" with its own badge count (e.g. "2").

### 3.3 Content grid (below top bar)
**Row 1 — full width card: "Upcoming Interview"**
- Small header row: calendar/video icon + "Upcoming Interview" title, "•••" menu icon at far right.
- Body, single row: candidate avatar + name (Semi Bold) + role (gray) on the left; then columns for "Time" (e.g. "10:30 AM – 11:30 AM"), "Company" (small logo icon + name), "Attendees" (stacked overlapping avatar circles + "+2 peoples" text); on the far right two buttons — a white/outlined "View details" button and a filled lime-green "Join meeting" button.

**Row 2 — two-column split (~60/40):**
- **Left, "Current Vacancies" card:** header with title + "•••" menu. Body is a 2-column × 3-row grid of vacancy tiles; each tile = small colored square icon (company/source logo, different flat color per tile — blue, orange, purple, green, yellow, dark), job title (Semi Bold, e.g. "Marketing Specialist"), and a subtext row with a small tool icon + tool name + "X/Y recruited" count (gray, small). Below the grid: pagination dots (carousel indicator).
- **Right, "Industries Insight" card:** header with title + "•••" menu, and a 2-tab pill toggle ("Companies" / "Candidates") top-right of the card body. Body is a vertical list of horizontal bar rows: label on left (e.g. "Information Technology"), percentage on right (e.g. "30%"), and beneath each label a thin horizontal progress bar filled in green (`#95CC29`/`#77A719`) proportional to the percentage.

**Row 3 — two-column split (~60/40), same widths as Row 2:**
- **Left, "Potential Candidates" card:** header + "•••" menu. Body is a simple table with column headers "Name / Location / Preferred Job / Level" — each row: small avatar + candidate name, small flag emoji/icon + country + city, job title text, seniority level text (Junior/Mid/Senior).
- **Right, "Countries Insight" card:** same 2-tab toggle ("Companies"/"Candidates") as the Industries card, body is a simplified world map illustration (light-gray landmasses) with small green dot markers over countries that have activity.

**Build note on card chrome:** every card uses the identical header pattern — icon + title (left), "•••" overflow menu (right), sometimes a 2-tab toggle instead of/in addition to the menu. Reuse one `<DashboardCard>` component with a `header`, optional `tabs`, and `children` body slot.

---

## 4. Screen 3 — "Candidate Summary" Modal (popup)

Triggered from a candidate row/card; renders as a centered modal over a dimmed/blurred dashboard background.

- **Modal header:** small user icon + "Candidate Summary" title (left); "View details" link/button + a circular "×" close button (right).
- **Identity block:** large circular avatar centered, candidate full name (Semi Bold, large) centered below it, then a single line with role icon + job title and location pin icon + city/country, both centered.
- **Primary action:** full-width lime-green pill button "View documents" with a small chevron/dropdown caret — implies this opens a dropdown of document links (resume, ID, etc.) rather than navigating away.
- **"About" section:** section label ("About", gray, small, uppercase-ish) then a paragraph of bio text (Regular weight, gray-black), followed by two small pill/link chips with icons for external links (e.g. personal portfolio site, GitHub).
- **"Professional Skills" section:** section label, then a wrapped row of skill pill tags — pale-green background (`#E7F2D2`), dark text, rounded-full shape (e.g. Java, Python, C#, Spring Boot, Django, ASP.NET, MySQL, PostgreSQL, MongoDB, Git, JUnit, Pytest).
- **"Work Experiences" section:** section label, then a vertical timeline: each entry has a small square company-logo icon on the left with a thin connecting vertical line to the next entry, and on the right the job title (Semi Bold), a date range + duration (gray, small), and location (gray, small). Multiple roles at the same company are grouped under one company logo/line.

This modal should be built as a reusable `<CandidateSummaryModal>` fed by a single candidate object — it maps 1:1 onto the `Candidate` + `Resume` entities already defined in the backend data model (see §5).

---

## 5. How this maps onto the existing technical architecture

This UI sits on top of the MERN + TypeScript blueprint and the HireFlow AI PRD already provided. Key wiring notes for Antigravity:

- **Frontend stack:** React + Vite + TypeScript + Tailwind CSS. Define the tokens in §1 as Tailwind theme extensions (`colors.primary`, `colors['primary-bright']`, `colors['primary-tint']`, `colors.ink`, `colors.slate`) plus `fontFamily.sans = ['Inter', 'sans-serif']` — never hardcode hex values inline in components.
- **Component library:** shadcn/ui as the base (per blueprint §7), restyled with the tokens above — buttons, dialogs (for the modal), tabs (for the "Companies/Candidates" toggles), and progress bars (for Industries Insight) all map to existing shadcn primitives.
- **Data sources for each dashboard card:**
  - "Upcoming Interview" → `Interview` entity (next upcoming record for the logged-in user).
  - "Current Vacancies" → `Job` entities with status = Open, plus a computed `recruited / vacancies` count.
  - "Industries Insight" / "Countries Insight" → aggregation endpoints over `Job`/`Candidate` grouped by industry/country (simple MongoDB aggregation pipeline per blueprint §22 AI-layer guidance — deterministic aggregation, not LLM-generated).
  - "Potential Candidates" → `Candidate` + `CandidateApplication` join, filtered/sorted by fit score per PRD §11.27–11.28.
  - "Candidate Summary" modal → `Candidate` + `Resume` (parsed skills/work history) + `CandidateScore` (for the fit-score explanation elsewhere in the app, not shown in this modal).
- **Images/files via Cloudinary:** since Abhi is using Cloudinary for storage, replace every S3 reference in the blueprint's file-handling sections with Cloudinary equivalents:
  - Company logos, user avatars, candidate profile photos → upload via Cloudinary unsigned/signed upload widget or server-side `cloudinary.uploader.upload()`, store the returned `secure_url` (+ `public_id` for later deletion/transformation) on the relevant Mongoose document (`Organization.logoUrl`, `User.avatarUrl`, `Candidate.photoUrl`).
  - Resume files (PDF/DOC/DOCX) → also fine to store on Cloudinary as `resource_type: 'raw'`, but keep parsed text in Mongo as today; do not rely on Cloudinary for anything requiring server-side parsing — download/stream the raw file server-side for the resume-parsing pipeline.
  - Never expose the Cloudinary API secret client-side; use a signed-upload endpoint (`POST /api/v1/uploads/sign`) that returns a short-lived signature, per the existing "sensitive third-party tokens encrypted with AES-256-GCM" rule in the blueprint if you ever store Cloudinary API credentials in the DB (you likely won't — they belong in env vars only, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`).
- **Auth/session UI:** the sidebar user card and top-bar greeting read from the `AuthProvider` context already specified in the blueprint (`useAuth()` → `user.name`, `user.role`).

---

## 6. Instructions to give Antigravity, in order

1. Set up the Tailwind theme with the exact tokens in §1 before writing a single component.
2. Build the shared shell first: `<Sidebar>`, `<TopBar>`, `<DashboardCard>` — these are reused everywhere.
3. Build the Overview page (§3) using dummy/mock data matching the entity shapes in §5.
4. Build `<CandidateSummaryModal>` (§4) as a standalone component, wire it to open from a candidate row.
5. Build the marketing landing page (§2) as a separate route, reusing the same color tokens and button components.
6. Only after all four are visually matching the references, wire real API calls per §5's data-source mapping.
7. Wire Cloudinary uploads last, behind a signed-upload endpoint, per §5.

Do not deviate from the hex values, corner radii, or card layout order specified above — these came directly from client-approved reference screenshots.
