// Section 3.5 verify: under-qualified candidate → eligibility failed but real score; fully-qualified → high score.
const BASE = "http://127.0.0.1:5000";
const run = Date.now().toString(36);

(async () => {
  const login = await fetch(BASE + "/api/v1/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: "fresh.tester+20260914@hireflow-test.com", password: "Fresh-Test-2026!z" }) });
  const token = (await login.json()).data.token;
  const H = { "Content-Type": "application/json", Authorization: "Bearer " + token };

  // target job: 2 mandatory + 1 preferred + experience range
  const jobRes = await fetch(BASE + "/api/v1/jobs", { method: "POST", headers: H, body: JSON.stringify({
    title: "Scorer Bench Job " + run, vacancies: 1, status: "open", minExperience: 2, maxExperience: 6,
    requirements: [
      { name: "React", type: "mandatory", category: "skill" },
      { name: "Node.js", type: "mandatory", category: "skill" },
      { name: "Kubernetes", type: "preferred", category: "skill" },
    ],
  }) });
  const job = (await jobRes.json()).data.job;

  async function makeCandidate(name, skills, years, projCount) {
    const r = await fetch(BASE + "/api/v1/candidates", { method: "POST", headers: H, body: JSON.stringify({
      fullName: name, email: `${name.split(" ")[0].toLowerCase()}.${run}@test.com`, source: "manual",
      skills, totalExperienceYears: years,
      currentDesignation: skills.includes("React") ? "Frontend Engineer" : "Sales Executive",
      projects: Array.from({ length: projCount }, (_, i) => ({ name: `Proj ${i}`, description: "React Node.js dashboard", techStack: "React, Node.js" })),
      availability: { status: "immediate" },
    }) });
    const j = await r.json();
    const cand = j.data?.candidate || j.data;
    const a = await fetch(BASE + "/api/v1/applications", { method: "POST", headers: H, body: JSON.stringify({ candidateId: cand._id, jobId: job._id }) });
    const aj = await a.json();
    return aj.data?.application || aj.data;
  }

  const weak = await makeCandidate("Weak Cand " + run, ["Excel"], 0, 0);
  const strong = await makeCandidate("Strong Cand " + run, ["React", "Node.js", "TypeScript", "Kubernetes"], 4, 2);

  for (const [label, app] of [["WEAK", weak], ["STRONG", strong]]) {
    const g = await fetch(BASE + `/api/v1/applications/${app._id}/score/generate`, { method: "POST", headers: H });
    const gj = await g.json();
    if (g.status !== 200) { console.log(label + " GENERATE status=" + g.status + " body=" + JSON.stringify(gj).slice(0, 250)); continue; }
    const s = gj.data.score;
    console.log(`\n${label}: overallScore=${s.overallScore} gemini=${JSON.stringify(gj.data.geminiExplanation)}`);
    console.log(`${label} breakdown=` + JSON.stringify(Object.fromEntries(Object.entries(s.breakdown).map(([k, v]) => [k + "=" + v.score]))));
    console.log(`${label} eligibilityChecks=` + JSON.stringify(s.eligibilityChecks.map((c) => c.requirementName + ":" + c.status)));
    const a = await fetch(BASE + `/api/v1/applications/${app._id}`, { headers: H });
    const aj = await a.json();
    const appl = aj.data?.application || aj.data;
    console.log(`${label} DENORM: fitScore=${appl.fitScore} eligibilityStatus=${appl.eligibilityStatus}`);

    // idempotency: generate again, confirm no duplicate
    const g2 = await fetch(BASE + `/api/v1/applications/${app._id}/score/generate`, { method: "POST", headers: H });
    const get = await fetch(BASE + `/api/v1/applications/${app._id}/score`, { headers: H });
    console.log(`${label} REGEN status=${g2.status} GET status=${get.status} (single doc if idempotent)`);
  }

  // override path on the strong application
  const ov = await fetch(BASE + `/api/v1/applications/${strong._id}/score/override`, { method: "POST", headers: H, body: JSON.stringify({ overrideScore: 91, reason: "Panel interview impressed beyond resume signals" }) });
  const ovj = await ov.json();
  console.log(`\nOVERRIDE status=${ov.status} isOverridden=${ovj.data?.score?.isOverridden} newScore=${ovj.data?.score?.overallScore} reason=${JSON.stringify(ovj.data?.score?.overrideReason)}`);
  const bad = await fetch(BASE + `/api/v1/applications/${strong._id}/score/override`, { method: "POST", headers: H, body: JSON.stringify({ overrideScore: 500, reason: "x" }) });
  console.log("OVERRIDE invalid(500) rejected with status=" + bad.status);
  const nobad = await fetch(BASE + `/api/v1/applications/${strong._id}/score/override`, { method: "POST", headers: H, body: JSON.stringify({ overrideScore: 80 }) });
  console.log("OVERRIDE missing-reason rejected with status=" + nobad.status);
})().catch((e) => { console.log("S3_CRASH: " + e.message); process.exit(1); });
