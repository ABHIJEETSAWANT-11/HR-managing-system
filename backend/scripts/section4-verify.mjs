// Section 4 verify: offer create→approve×3→send; capture the real email result.
const BASE = "http://127.0.0.1:5000";
const run = Date.now().toString(36);
const j = async (r) => { const t = await r.json(); return { status: r.status, body: t }; };

(async () => {
  const login = await fetch(BASE + "/api/v1/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: "fresh.tester+20260914@hireflow-test.com", password: "Fresh-Test-2026!z" }) });
  const token = (await login.json()).data.token;
  const H = { "Content-Type": "application/json", Authorization: "Bearer " + token };

  const usersData = (await (await fetch(BASE + "/api/v1/users", { headers: H })).json()).data;
  const users = Array.isArray(usersData) ? usersData : usersData?.users || [];
  const managerId = users[0]?._id;
  console.log("managerId=" + (managerId || "NONE"));
  const cand = (await (await fetch(BASE + "/api/v1/candidates", { method: "POST", headers: H, body: JSON.stringify({ fullName: "Mail Cand " + run, email: `mail.${run}@test.com`, source: "manual" }) })).json()).data.candidate;
  const job = (await (await fetch(BASE + "/api/v1/jobs", { method: "POST", headers: H, body: JSON.stringify({ title: "Mail Job " + run, vacancies: 1, status: "open" }) })).json()).data.job;
  const app = (await (await fetch(BASE + "/api/v1/applications", { method: "POST", headers: H, body: JSON.stringify({ candidateId: cand._id, jobId: job._id }) })).json()).data.application;

  const oc = await j(await fetch(BASE + "/api/v1/offers", { method: "POST", headers: H, body: JSON.stringify({
    applicationId: app._id, candidateId: cand._id, jobId: job._id,
    salaryStructure: { annualCTC: 1200000, basicSalary: 480000, hra: 240000, specialAllowance: 240000, variablePay: 240000 },
    joiningDate: new Date(Date.now() + 30 * 864e5).toISOString(),
    reportingManagerId: managerId,
    workLocation: "Pune Office",
    validUntil: new Date(Date.now() + 7 * 864e5).toISOString(),
  }) }));
  const offerId = oc.body?.data?.offer?._id || oc.body?.data?._id;
  console.log("OFFER CREATE status=" + oc.status + " id=" + (offerId || JSON.stringify(oc.body).slice(0, 200)));
  if (!offerId) process.exit(1);

  const sub = await j(await fetch(BASE + `/api/v1/offers/${offerId}/submit`, { method: "POST", headers: H }));
  console.log("SUBMIT status=" + sub.status);

  for (const decision of ["approve", "approve", "approve"]) {
    const raw = await fetch(BASE + `/api/v1/offers/${offerId}/approve`, { method: "POST", headers: H, body: JSON.stringify({ decision, comments: "ok" }) });
    const a = { status: raw.status, body: await raw.json().catch(() => ({})) };
    console.log("APPROVE(" + decision + ") status=" + a.status + " offerStatus=" + JSON.stringify(a.body?.data?.offer?.status ?? a.body?.error?.message ?? "").slice(0, 60));
    if (a.status >= 300) process.exit(1);
  }

  const send = await j(await fetch(BASE + `/api/v1/offers/${offerId}/send`, { method: "POST", headers: H }));
  console.log("SEND status=" + send.status);
  console.log("SEND EMAIL RESULT: " + JSON.stringify(send.body?.data?.email));
  console.log("OFFER STATUS: " + send.body?.data?.offer?.status + " portalToken=" + (send.body?.data?.offer?.portalToken ? "present(len " + send.body.data.offer.portalToken.length + ")" : "MISSING"));
})().catch((e) => { console.log("S4_CRASH: " + e.message); process.exit(1); });
