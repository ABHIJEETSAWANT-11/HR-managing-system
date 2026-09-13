/**
 * Phase 1 end-to-end live test: templates CRUD, applications + stage route,
 * candidates CRUD, and the real offer PDF pipeline (create -> submit -> approve x3 -> send -> pdf).
 * Uses the login credentials from the Part 0 boot test. Run: node scripts/phase1-e2e-test.mjs
 */
const BASE = "http://127.0.0.1:5000/api/v1";
const EMAIL = "verification.bot+20260913@hireflow-test.com";
const PASSWORD = "Vf-Test-2026!x";

let passCount = 0;
let failCount = 0;

function log(title, status, body) {
  const ok = status >= 200 && status < 300;
  if (ok) passCount++; else failCount++;
  console.log(`\n=== ${title} -> HTTP ${status} ${ok ? "OK" : "FAIL"} ===`);
  console.log(typeof body === "string" ? body : JSON.stringify(body));
}

async function req(method, path, { token, body } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let parsed;
  const text = await res.text();
  try { parsed = JSON.parse(text); } catch { parsed = text.slice(0, 200); }
  return { status: res.status, body: parsed };
}

async function main() {
  // 0. login
  const login = await req("POST", "/auth/login", { body: { email: EMAIL, password: PASSWORD } });
  log("LOGIN", login.status, { success: login.body.success, role: login.body.data?.user?.role });
  const token = login.body.data.token;
  const userId = login.body.data.user.id;

  // 1. TEMPLATES CRUD
  const t1 = await req("POST", "/templates", {
    token,
    body: {
      type: "offer_letter",
      name: "E2E Test Template",
      htmlContent: "<p>Dear {{candidate_name}}, welcome to {{company_name}} as {{job_title}}.</p>",
      variables: ["candidate_name", "company_name", "job_title"],
    },
  });
  log("TEMPLATES: create", t1.status, t1.body);
  const templateId = t1.body.data?.template?._id;

  const t2 = await req("GET", "/templates", { token });
  log("TEMPLATES: list", t2.status, { success: t2.body.success, total: t2.body.data?.total, names: t2.body.data?.templates?.map((t) => t.name) });

  const t3 = await req("GET", `/templates/${templateId}`, { token });
  log("TEMPLATES: get by id", t3.status, { success: t3.body.success, name: t3.body.data?.template?.name });

  const t4 = await req("PATCH", `/templates/${templateId}`, { token, body: { name: "E2E Test Template v2" } });
  log("TEMPLATES: patch", t4.status, { success: t4.body.success, name: t4.body.data?.template?.name });

  const t5 = await req("PATCH", `/applications/000000000000000000000000/stage`, { token, body: { pipelineStage: "Hired" } });
  log("APPLICATIONS: stage with INVALID stage (expect 400)", t5.status, t5.body);

  const t6 = await req("DELETE", `/templates/${templateId}`, { token });
  log("TEMPLATES: soft delete", t6.status, { success: t6.body.success, isActive: t6.body.data?.template?.isActive });

  const t7 = await req("GET", "/templates", { token });
  log("TEMPLATES: list after delete (template should be gone)", t7.status, { total: t7.body.data?.total });

  // 2. JOB
  const j1 = await req("POST", "/jobs", {
    token,
    body: { title: "Senior Backend Engineer (E2E)", employmentType: "full_time", location: "Pune, India", vacancies: 2, status: "open" },
  });
  log("JOBS: create", j1.status, { success: j1.body.success, id: j1.body.data?.job?._id ?? j1.body.data?._id });
  const jobId = j1.body.data?.job?._id ?? j1.body.data?._id;

  // 3. CANDIDATE
  const c1 = await req("POST", "/candidates", {
    token,
    body: {
      fullName: "Riya Sharma (E2E)",
      email: `riya.sharma.e2e+${Date.now()}@hireflow-test.com`,
      phone: "+91 98765 43210",
      currentCity: "Pune",
      currentCountry: "India",
      currentDesignation: "Backend Developer",
      totalExperienceYears: 4,
      skills: ["Node.js", "MongoDB", "TypeScript"],
      workHistory: [{ company: "TechCorp", title: "SDE", startDate: "2022-01", endDate: "2026-08" }],
    },
  });
  log("CANDIDATES: create", c1.status, { success: c1.body.success, id: c1.body.data?.candidate?._id });
  const candidateId = c1.body.data?.candidate?._id;

  const c2 = await req("GET", "/candidates", { token, });
  log("CANDIDATES: list", c2.status, { success: c2.body.success, total: c2.body.data?.total, first: c2.body.data?.candidates?.[0]?.fullName });

  const c3 = await req("GET", `/candidates/${candidateId}`, { token });
  log("CANDIDATES: get by id", c3.status, { success: c3.body.success, name: c3.body.data?.candidate?.fullName });

  const c4 = await req("PATCH", `/candidates/${candidateId}`, { token, body: { currentDesignation: "Senior Backend Developer" } });
  log("CANDIDATES: patch", c4.status, { success: c4.body.success, designation: c4.body.data?.candidate?.currentDesignation });

  // 4. APPLICATION
  const a1 = await req("POST", "/applications", { token, body: { jobId, candidateId } });
  log("APPLICATIONS: create", a1.status, { success: a1.body.success, id: a1.body.data?.application?._id, stage: a1.body.data?.application?.pipelineStage });
  const applicationId = a1.body.data?.application?._id;

  const a2 = await req("GET", "/applications?jobId=" + jobId, { token });
  log("APPLICATIONS: list (filtered by job)", a2.status, { success: a2.body.success, total: a2.body.data?.total });

  const a3 = await req("PATCH", `/applications/${applicationId}/stage`, { token, body: { pipelineStage: "Shortlisted" } });
  log("APPLICATIONS: stage -> Shortlisted", a3.status, { success: a3.body.success, newStage: a3.body.data?.application?.pipelineStage });

  // 5. OFFER -> PDF PIPELINE
  const offerBody = {
    applicationId, jobId, candidateId,
    joiningDate: "2026-11-02",
    reportingManagerId: userId,
    workLocation: "Pune HQ",
    probationPeriodDays: 90,
    noticePeriodDays: 60,
    validUntil: "2026-10-03",
    salaryStructure: { annualCTC: 1800000, basicSalary: 720000, hra: 360000, specialAllowance: 432000, variablePay: 180000, employerPF: 108000 },
  };
  const o1 = await req("POST", "/offers", { token, body: offerBody });
  log("OFFERS: create", o1.status, { success: o1.body.success, id: o1.body.data?.offer?._id, status: o1.body.data?.offer?.status });
  const offerId = o1.body.data?.offer?._id;

  const o2 = await req("POST", `/offers/${offerId}/submit`, { token });
  log("OFFERS: submit for approval", o2.status, { success: o2.body.success, status: o2.body.data?.offer?.status });

  const o3 = await req("POST", `/offers/${offerId}/approve`, { token, body: { decision: "approve", comments: "HM sign-off (e2e)" } });
  log("OFFERS: approve level 1 (hiring_manager)", o3.status, { currentLevel: o3.body.data?.approval?.currentLevel, overall: o3.body.data?.approval?.overallStatus });

  const o4 = await req("POST", `/offers/${offerId}/approve`, { token, body: { decision: "approve", comments: "Finance ok (e2e)" } });
  log("OFFERS: approve level 2 (finance)", o4.status, { currentLevel: o4.body.data?.approval?.currentLevel, overall: o4.body.data?.approval?.overallStatus });

  const o5 = await req("POST", `/offers/${offerId}/approve`, { token, body: { decision: "approve", comments: "HR head final (e2e)" } });
  log("OFFERS: approve level 3 (hr_head) -> approved", o5.status, { offerStatus: o5.body.data?.offer?.status, overall: o5.body.data?.approval?.overallStatus });

  const o6 = await req("POST", `/offers/${offerId}/send`, { token });
  log("OFFERS: send (triggers real PDF generation)", o6.status, {
    success: o6.body.success,
    status: o6.body.data?.offer?.status,
    pdfUrl: o6.body.data?.offer?.pdfUrl,
    error: o6.body.error,
  });
  const pdfUrl = o6.body.data?.offer?.pdfUrl;

  if (pdfUrl) {
    const pdfRes = await fetch(pdfUrl);
    const buf = Buffer.from(await pdfRes.arrayBuffer());
    log("CLOUDINARY: fetch generated PDF", pdfRes.status, {
      contentType: pdfRes.headers.get("content-type"),
      sizeBytes: buf.length,
      isRealPdf: buf.subarray(0, 4).toString("ascii") === "%PDF",
      header: buf.subarray(0, 8).toString("ascii"),
    });
    console.log("\nPDF_URL_FOR_MANUAL_OPEN:", pdfUrl);
  }

  const o7 = await req("GET", `/offers/${offerId}/pdf`, { token, });
  log("OFFERS: GET /:id/pdf (expects redirect)", o7.status, typeof o7.body === "string" ? o7.body : { redirected: o7.status });

  console.log(`\n########## E2E RESULT: ${passCount} passed, ${failCount} failed ##########`);
  if (failCount > 0) process.exitCode = 1;
}

main().catch((e) => {
  console.error("E2E SCRIPT CRASH:", e);
  process.exitCode = 1;
});
