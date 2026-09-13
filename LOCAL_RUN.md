# Run HireFlow AI locally (backend + frontend together)

## Prerequisites (one-time, already done on this machine)
- Node.js installed; `backend/node_modules` and `frontend/node_modules` installed.
- MongoDB Atlas cluster reachable. **The Atlas Network Access IP allowlist entry (e.g. 0.0.0.0/0 or your current IP) MUST stay active** — this is not a one-time fix. If your public IP changes, add the new one at Atlas → Network Access, or boot fails with `Could not connect to any servers in your MongoDB Atlas cluster`.

## Terminal 1 — backend
```bash
cd backend
npx tsc          # compile src/ → dist/ (run again after any backend change)
node dist/server.js
```
(Do NOT use `node start-server.js` — it skips the DB connection.)

Wait for:
```
MongoDB Connected: ac-...mongodb.net
Server running in development mode on port 5000
```
If port 5000 is taken by a stale process: `powershell "Get-NetTCPConnection -LocalPort 5000 -State Listen | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }"`

## Terminal 2 — frontend
```bash
cd frontend
npm run dev
```
Wait for:
```
VITE v8.3.0  ready in ... ms
➜  Local:   http://localhost:5173/
```

## Open in browser
**http://localhost:5173/** → redirects to `/login`.

Register a new organization at "Register your organization", or log in with an existing test user, e.g.:
- `smoke.tester+20260913@hireflow-test.com` / `Smoke-Test-2026!y`
- `verification.bot+20260913@hireflow-test.com` / `Vf-Test-2026!x`

## Config reference
- Backend port: `PORT` in `backend/.env` (currently 5000; note your shell may export `PORT=0` — that ambient value wins, so launch from a shell without it or override).
- CORS: `CORS_ORIGINS=http://localhost:5173` in `backend/.env` must list the exact Vite URL (already correct).
- Frontend API base: `VITE_API_BASE_URL` defaults to `http://localhost:5000` in `frontend/src/lib/env.ts` (already correct; override via `frontend/.env` if you change the backend port).

## Known gaps — features that will fail until YOU provide real values
| Variable in `backend/.env` | Status | What breaks without it |
|---|---|---|
| `CLOUDINARY_API_SECRET` | **EMPTY** | Offer "Generate PDF & send" and `GET /api/v1/offers/:id/pdf` fail with "Must supply api_key". PDF rendering itself works (proven); only the Cloudinary upload is blocked. |
| `GEMINI_API_KEY` | EMPTY | JD generation, resume AI parsing enrichment, fit-score explanation, feedback summaries, email drafting. Core flows work without it; AI-assist features don't. |
| `SMTP_USER` / `SMTP_PASS` | EMPTY | Actual email delivery on offer send / communications. The offer is still created and marked sent; no email arrives. |

## Quick health checks
- Backend: `curl http://localhost:5000/health` → `{"success":true,"message":"OK"}`
- Full E2E backend suite: `cd backend && node scripts/phase1-e2e-test.mjs`

## 2026-09-14 note — Atlas IP allowlist rotated again
On boot, backend failed with "Could not connect to any servers in your MongoDB Atlas cluster".
Diagnosis: TCP to `ac-yprqwxh-shard-00-01.iwnnkhh.mongodb.net:27017` **succeeds** (network path open),
but the MongoDB handshake is rejected → the cluster's Network Access IP allowlist no longer contains
the machine's current public IP. Fix: add the current IP at Atlas → Network Access (or keep 0.0.0.0/0
for this portfolio project). This has now broken twice — the allowlist is NOT a one-time fix.
Current public IP at time of failure: check with `curl https://api.ipify.org`.
