// Section 5.3 verify: full portal lifecycle against real data, plus security checks.
const BASE = process.env.VERIFY_BASE || "http://127.0.0.1:5000";
const run = Date.now().toString(36);
const j = async (r) => ({ status: r.status, body: await r.json().catch(() => ({})) });

(async () => {
  // --- setup: real offer through the full chain (recruiter side, authenticated)
  let token;
  {
    const email = process.env.VERIFY_EMAIL || ("s5." + Date.now().toString(36) + "@test.com");
    const password = process.env.VERIFY_PASS || "Section5-2026!z";
    const reg = await fetch(BASE + "/api/v1/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orgName: "S5 Verify Org", userName: "S5 Verifier", email, password }) });
    const regBody = await reg.json();
    token = regBody?.data?.token || (await (await fetch(BASE + "/api/v1/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) })).json())?.data?.token;
    if (!token) { console.log("SEED_FAIL " + JSON.stringify(regBody).slice(0, 200)); process.exit(1); }
  }
  const H = { "Content-Type": "application/json", Authorization: "Bearer " + token };
  const users = (await (await fetch(BASE + "/api/v1/users", { headers: H })).json()).data;
  const managerId = (Array.isArray(users) ? users : users.users)[0]._id;
  const cand = (await (await fetch(BASE + "/api/v1/candidates", { method: "POST", headers: H, body: JSON.stringify({ fullName: "Portal Cand " + run, email: `portal.${run}@test.com`, source: "manual" }) })).json()).data.candidate;
  const job = (await (await fetch(BASE + "/api/v1/jobs", { method: "POST", headers: H, body: JSON.stringify({ title: "Portal Job " + run, vacancies: 1, status: "open" }) })).json()).data.job;
  const app = (await (await fetch(BASE + "/api/v1/applications", { method: "POST", headers: H, body: JSON.stringify({ candidateId: cand._id, jobId: job._id }) })).json()).data.application;
  const oc = await j(await fetch(BASE + "/api/v1/offers", { method: "POST", headers: H, body: JSON.stringify({
    applicationId: app._id, candidateId: cand._id, jobId: job._id,
    salaryStructure: { annualCTC: 1500000, basicSalary: 600000, hra: 300000, specialAllowance: 300000, variablePay: 300000 },
    joiningDate: new Date(Date.now() + 30 * 864e5).toISOString(), reportingManagerId: managerId,
    workLocation: "Pune Office", validUntil: new Date(Date.now() + 7 * 864e5).toISOString(),
  }) }));
  const offerId = oc.body?.data?.offer?._id;
  console.log("SETUP: offer=" + (offerId || "FAIL " + JSON.stringify(oc.body).slice(0, 150)));
  await fetch(BASE + `/api/v1/offers/${offerId}/submit`, { method: "POST", headers: H });
  for (let i = 0; i < 3; i++) await fetch(BASE + `/api/v1/offers/${offerId}/approve`, { method: "POST", headers: H, body: JSON.stringify({ decision: "approve", comments: "ok" }) });
  const send = await j(await fetch(BASE + `/api/v1/offers/${offerId}/send`, { method: "POST", headers: H }));
  const portalToken = send.body?.data?.offer?.portalToken;
  console.log("SETUP: sent=" + (send.status === 200) + " tokenLen=" + (portalToken || "").length);

  // --- 1. PUBLIC VIEW (no auth header at all)
  const view = await j(await fetch(`${BASE}/api/v1/portal/offers/${portalToken}`));
  const v = view.body?.data?.offer;
  console.log(`\nVIEW status=${view.status} candidateName=${JSON.stringify(v?.candidateName)} jobTitle=${JSON.stringify(v?.jobTitle)} company=${JSON.stringify(v?.companyName)} ctc=${v?.salarySummary?.annualCTC} status=${view.body?.data?.offer?.status}`);
  console.log("VIEW leak check: has orgId=" + ("organizationId" in (v || {})) + " has email=" + JSON.stringify(v).includes("@") + " has annexure=" + JSON.stringify(v).includes("basicSalary"));

  // --- 2. accept with typed name (no auth header)
  const acc = await j(await fetch(`${BASE}/api/v1/portal/offers/${portalToken}/accept`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fullName: "Portal Cand " + run }) }));
  console.log(`\nACCEPT status=${acc.status} signedAs=${JSON.stringify(acc.body?.data?.signedAs)} ip=${JSON.stringify(acc.body?.data?.ip)} at=${acc.body?.data?.acceptedAt}`);

  // --- 3. double-decide guard
  const again = await j(await fetch(`${BASE}/api/v1/portal/offers/${portalToken}/accept`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fullName: "Portal Cand " + run }) }));
  console.log(`ACCEPT-AGAIN status=${again.status} msg=${JSON.stringify(again.body?.error?.message)}`);

  // --- 4. query still records after decision? (should be allowed; doesn't change status)
  const q = await j(await fetch(`${BASE}/api/v1/portal/offers/${portalToken}/query`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: "When will I receive the formal appointment letter?" }) }));
  console.log(`QUERY status=${q.status} body=${JSON.stringify(q.body?.data).slice(0, 90)}`);

  // --- 5. invalid tokens: generic, no enumeration hints
  const bad1 = await j(await fetch(`${BASE}/api/v1/portal/offers/${"a".repeat(64)}`));
  const bad2 = await j(await fetch(`${BASE}/api/v1/portal/offers/not-a-token`));
  console.log(`\nINVALID status=${bad1.status}/${bad2.status} sameMsg=${bad1.body?.error?.message === bad2.body?.error?.message} msg=${JSON.stringify(bad1.body?.error?.message)}`);

  // --- 6. tenancy isolation: another org's recruiter must NOT see this offer via portal-tokenless paths
  const reg = await j(await fetch(BASE + "/api/v1/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orgName: "Portal Probe Org " + run, userName: "Probe", email: `probe.${run}@test.com`, password: "Probe-2026!x" }) }));
  const probeToken = reg.body?.data?.token;
  const cross = await j(await fetch(BASE + `/api/v1/offers/${offerId}`, { headers: { Authorization: "Bearer " + probeToken } }));
  console.log(`CROSS-ORG GET offer status=${cross.status} (404 expected)`);
  const crossScore = await j(await fetch(BASE + `/api/v1/applications/${app._id}/score`, { headers: { Authorization: "Bearer " + probeToken } }));
  console.log(`CROSS-ORG GET score status=${crossScore.status} (404 expected)`);
})().catch((e) => { console.log("S5_CRASH: " + e.message); process.exit(1); });
