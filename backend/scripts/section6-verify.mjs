// Section 6.4 verify: notification triggers + all report endpoints (real HTTP, local real-Mongo).
const BASE = process.env.VERIFY_BASE || "http://127.0.0.1:5001";
const j = async (r) => ({ status: r.status, body: await r.json().catch(() => ({})) });

(async () => {
  // seed org + data
  const email = "s6." + Date.now().toString(36) + "@test.com";
  const reg = await fetch(BASE + "/api/v1/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orgName: "S6 Reports Org", userName: "S6 Verifier", email, password: "Section6-2026!z" }) });
  const token = (await reg.json()).data.token;
  const H = { "Content-Type": "application/json", Authorization: "Bearer " + token };
  console.log("SEED register status=" + reg.status);

  const users = (await (await fetch(BASE + "/api/v1/users", { headers: H })).json()).data;
  const managerId = (Array.isArray(users) ? users : users.users)[0]._id;
  const job = (await (await fetch(BASE + "/api/v1/jobs", { method: "POST", headers: H, body: JSON.stringify({ title: "S6 Job A", vacancies: 2, status: "open", requirements: [{ name: "React", type: "mandatory", category: "skill" }] }) })).json()).data.job;
  const jobB = (await (await fetch(BASE + "/api/v1/jobs", { method: "POST", headers: H, body: JSON.stringify({ title: "S6 Job B", vacancies: 1, status: "open" }) })).json()).data.job;

  // 3 candidates w/ applications in different stages
  const stages = ["Applied", "Shortlisted", "Joined"];
  for (let i = 0; i < 3; i++) {
    const c = (await (await fetch(BASE + "/api/v1/candidates", { method: "POST", headers: H, body: JSON.stringify({ fullName: "S6 Cand " + i, email: `s6c${i}.${Date.now().toString(36)}@t.com`, source: i === 0 ? "referral" : "manual", currentCity: ["Pune", "Mumbai", "Bengaluru"][i], skills: ["React"], totalExperienceYears: 3 + i, workHistory: [{ company: "Infotech" + i, title: "Frontend Engineer", startDate: "2020", endDate: "2024" }], currentDesignation: "Frontend Engineer", availability: { status: "immediate" } }) })).json()).data.candidate;
    const a = (await (await fetch(BASE + "/api/v1/applications", { method: "POST", headers: H, body: JSON.stringify({ candidateId: c._id, jobId: i === 2 ? jobB._id : job._id }) })).json()).data.application;
    if (stages[i] !== "Applied") await fetch(BASE + `/api/v1/applications/${a._id}/stage`, { method: "PATCH", headers: H, body: JSON.stringify({ pipelineStage: stages[i] }) });
    if (i === 1) await fetch(BASE + `/api/v1/applications/${a._id}/score/generate`, { method: "POST", headers: H });
  }

  // notification trigger: interview scheduled
  const cands = (await (await fetch(BASE + "/api/v1/candidates", { headers: H })).json()).data;
  const cand0 = (Array.isArray(cands) ? cands : cands.candidates)[0];
  const app0 = (await (await fetch(BASE + `/api/v1/applications?candidateId=${cand0._id}`, { headers: H })).json()).data.applications[0];
  const iv = await j(await fetch(BASE + "/api/v1/interviews", { method: "POST", headers: H, body: JSON.stringify({ applicationId: app0._id, type: "technical", scheduledAt: new Date(Date.now() + 26 * 3600e3).toISOString(), durationMinutes: 45 }) }));
  console.log("INTERVIEW scheduled status=" + iv.status);

  // notification trigger: offer approved (submit + 3 approvals on a fresh offer)
  const oc = await j(await fetch(BASE + "/api/v1/offers", { method: "POST", headers: H, body: JSON.stringify({ applicationId: app0._id, candidateId: cand0._id, jobId: job._id, salaryStructure: { annualCTC: 900000, basicSalary: 360000, hra: 180000, specialAllowance: 180000, variablePay: 180000 }, joiningDate: new Date(Date.now() + 20 * 864e5).toISOString(), reportingManagerId: managerId, workLocation: "Pune", validUntil: new Date(Date.now() + 5 * 864e5).toISOString() }) }));
  const offerId = oc.body?.data?.offer?._id;
  console.log("OFFER create status=" + oc.status);
  await fetch(BASE + `/api/v1/offers/${offerId}/submit`, { method: "POST", headers: H });
  for (let i = 0; i < 3; i++) await fetch(BASE + `/api/v1/offers/${offerId}/approve`, { method: "POST", headers: H, body: JSON.stringify({ decision: "approve", comments: "ok" }) });
  const send = await j(await fetch(BASE + `/api/v1/offers/${offerId}/send`, { method: "POST", headers: H }));
  const portalToken = send.body?.data?.offer?.portalToken;
  await j(await fetch(`${BASE}/api/v1/portal/offers/${portalToken}/accept`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fullName: "S6 Cand 0" }) }));
  console.log("OFFER sent + portal-accepted");

  // notifications list — expect interview_scheduled + offer_approved + offer_accepted
  const notif = await j(await fetch(BASE + "/api/v1/notifications", { headers: H }));
  const types = (notif.body?.data?.notifications || []).map((n) => n.type);
  console.log("\nNOTIFICATIONS status=" + notif.status + " total=" + notif.body?.data?.total + " types=" + JSON.stringify(types));

  // reports
  for (const ep of ["pipeline-summary", "source-quality", "time-to-hire", "offer-analytics", "industries", "countries"]) {
    const r = await j(await fetch(`${BASE}/api/v1/reports/${ep}`, { headers: H }));
    console.log(`REPORT /${ep} status=${r.status} body=${JSON.stringify(r.body?.data).slice(0, 220)}`);
  }

  // unread + read-all
  const unread = await j(await fetch(BASE + "/api/v1/notifications?unread=true&limit=1", { headers: H }));
  console.log("\nUNREAD count=" + unread.body?.data?.unreadCount);
  const ra = await j(await fetch(BASE + "/api/v1/notifications/read-all", { method: "PATCH", headers: H }));
  const unread2 = await j(await fetch(BASE + "/api/v1/notifications?unread=true&limit=1", { headers: H }));
  console.log(`READ-ALL updated=${ra.body?.data?.updated} → unread now=${unread2.body?.data?.unreadCount}`);
})().catch((e) => { console.log("S6_CRASH: " + e.message); process.exit(1); });
