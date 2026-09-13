const BASE = "http://127.0.0.1:5000";
const results = [];
const log = (name, ok, detail) => { results.push({ name, ok, detail }); console.log((ok ? "PASS" : "FAIL") + " | " + name + " | " + detail); };

async function req(method, path, { token, body } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: "Bearer " + token } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch {}
  return { status: res.status, data };
}

(async () => {
  const run = Date.now().toString(36);
  // login with the verified test account
  const login = await req("POST", "/api/v1/auth/login", { body: { email: "fresh.tester+20260914@hireflow-test.com", password: "Fresh-Test-2026!z" } });
  log("auth/login", login.status === 200, `status=${login.status} role=${login.data?.data?.user?.role}`);
  const token = login.data?.data?.token;
  if (!token) { console.log("ABORT: no token"); process.exit(1); }

  // negative auth check
  const noAuth = await req("GET", "/api/v1/users");
  log("users without token rejected", noAuth.status === 401, `status=${noAuth.status}`);

  const jobs = await req("GET", "/api/v1/jobs", { token });
  log("GET /jobs", jobs.status === 200, `status=${jobs.status} total=${jobs.data?.data?.total}`);
  const jobC = await req("POST", "/api/v1/jobs", { token, body: { title: "Sweep QA Engineer " + run, vacancies: 1 } });
  const jobId = jobC.data?.data?.job?._id || jobC.data?.data?._id;
  log("POST /jobs", jobC.status === 201, `status=${jobC.status} id=${jobId ? "yes" : "missing"}`);

  const candC = await req("POST", "/api/v1/candidates", { token, body: { fullName: "Sweep Candidate " + run, email: `sweep.cand+${run}@test.com`, phone: "9000000009" } });
  const candId = candC.data?.data?.candidate?._id || candC.data?.data?._id;
  log("POST /candidates", candC.status === 201, `status=${candC.status} id=${candId ? "yes" : "missing"}`);
  const cands = await req("GET", "/api/v1/candidates", { token });
  log("GET /candidates", cands.status === 200, `status=${cands.status} total=${cands.data?.data?.total ?? cands.data?.data?.length}`);

  const appC = await req("POST", "/api/v1/applications", { token, body: { candidateId: candId, jobId } });
  const appId = appC.data?.data?.application?._id || appC.data?.data?._id;
  log("POST /applications", appC.status === 201, `status=${appC.status} id=${appId ? "yes" : "missing"}`);

  const stage = await req("PATCH", `/api/v1/applications/${appId}/stage`, { token, body: { pipelineStage: "Shortlisted" } });
  log("PATCH /applications/:id/stage", stage.status === 200, `status=${stage.status} newStage=${stage.data?.data?.newStage ?? stage.data?.data?.pipelineStage}`);
  const badStage = await req("PATCH", `/api/v1/applications/${appId}/stage`, { token, body: { pipelineStage: "Hacker Stage" } });
  log("invalid stage rejected", badStage.status === 400, `status=${badStage.status}`);

  // the previously-500 interviews module
  const ivList = await req("GET", "/api/v1/interviews", { token });
  log("GET /interviews (was 500)", ivList.status === 200, `status=${ivList.status}`);
  const ivC = await req("POST", "/api/v1/interviews", { token, body: { applicationId: appId, type: "technical", scheduledAt: "2026-09-20T10:30:00.000Z", durationMinutes: 60 } });
  const ivId = ivC.data?.data?.interview?._id || ivC.data?.data?._id;
  log("POST /interviews", ivC.status === 201, `status=${ivC.status} id=${ivId ? "yes" : "missing body=" + JSON.stringify(ivC.data?.error ?? ivC.data).slice(0, 120)}`);
  if (ivId) {
    const sc = await req("GET", `/api/v1/interviews/${ivId}/scorecards`, { token });
    log("GET /interviews/:id/scorecards", sc.status === 200, `status=${sc.status} body=${JSON.stringify(sc.data?.data).slice(0, 80)}`);
  }

  const users = await req("GET", "/api/v1/users", { token });
  log("GET /users", users.status === 200, `status=${users.status}`);

  const tpls = await req("GET", "/api/v1/templates", { token });
  log("GET /templates", tpls.status === 200, `status=${tpls.status} count=${tpls.data?.data?.length ?? tpls.data?.data?.total}`);

  const offers = await req("GET", "/api/v1/offers", { token });
  log("GET /offers", offers.status === 200, `status=${offers.status}`);

  const resumes = await req("GET", "/api/v1/resumes", { token });
  log("GET /resumes", resumes.status === 200, `status=${resumes.status}`);

  const failed = results.filter(r => !r.ok);
  console.log(`\nSWEEP SUMMARY: ${results.length - failed.length}/${results.length} passed` + (failed.length ? " — FAILURES: " + failed.map(f => f.name).join(", ") : ""));
})().catch(e => { console.log("SWEEP_CRASH: " + e.message); process.exit(1); });
