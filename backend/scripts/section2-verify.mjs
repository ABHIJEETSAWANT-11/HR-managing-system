// Section 2 verify: generate a REAL resume PDF, upload it, check extraction + AI structuring state.
const BASE = "http://127.0.0.1:5000";
const run = Date.now().toString(36);

// Minimal but valid single-page PDF with real resume content (hand-built; xref offsets computed below).
function buildResumePdf() {
  const contentLines = [
    "BT /F1 16 Tf 50 770 Td (Rohan Deshpande) Tj ET",
    "BT /F1 10 Tf 50 750 Td (Email: rohan.deshpande@example.com  Phone: +91 98200 11223  Pune, India) Tj ET",
    "BT /F1 12 Tf 50 720 Td (SKILLS) Tj ET",
    "BT /F1 10 Tf 50 705 Td (JavaScript, TypeScript, React, Node.js, Express, MongoDB, Redis, Docker, AWS) Tj ET",
    "BT /F1 12 Tf 50 680 Td (EXPERIENCE) Tj ET",
    "BT /F1 10 Tf 50 665 Td (Senior Software Engineer, Infosys, Jan 2021 - Present) Tj ET",
    "BT /F1 10 Tf 50 650 Td (Built React and Node.js microservices on AWS; cut API latency 40 percent.) Tj ET",
    "BT /F1 10 Tf 50 635 Td (Software Engineer, TCS, Jul 2018 - Dec 2020) Tj ET",
    "BT /F1 10 Tf 50 620 Td (REST APIs in Express with MongoDB; total 7 years of experience.) Tj ET",
    "BT /F1 12 Tf 50 595 Td (EDUCATION) Tj ET",
    "BT /F1 10 Tf 50 580 Td (B.E. Computer Engineering, Pune University, 2018, First Class) Tj ET",
    "BT /F1 12 Tf 50 555 Td (CERTIFICATIONS) Tj ET",
    "BT /F1 10 Tf 50 540 Td (AWS Certified Developer - Associate, Amazon Web Services, 2022) Tj ET",
    "BT /F1 12 Tf 50 515 Td (LANGUAGES) Tj ET",
    "BT /F1 10 Tf 50 500 Td (English, Marathi, Hindi) Tj ET",
  ];
  const stream = contentLines.join("\n");
  const objs = [];
  objs[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  objs[2] = "<< /Type /Pages /Kids [3 0 R] /Count 1 >>";
  objs[3] = "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>";
  objs[4] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
  objs[5] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";

  let pdf = "%PDF-1.4\n";
  const xref = [0];
  for (let i = 1; i <= 5; i++) {
    xref[i] = pdf.length;
    pdf += `${i} 0 obj\n${objs[i]}\nendobj\n`;
  }
  const xrefStart = pdf.length;
  pdf += `xref\n0 6\n0000000000 65535 f \n`;
  for (let i = 1; i <= 5; i++) pdf += String(xref[i]).padStart(10, "0") + " 00000 n \n";
  pdf += `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
  return Buffer.from(pdf, "latin1");
}

(async () => {
  const login = await fetch(BASE + "/api/v1/auth/login", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "fresh.tester+20260914@hireflow-test.com", password: "Fresh-Test-2026!z" }),
  });
  const token = (await login.json()).data.token;

  const candRes = await fetch(BASE + "/api/v1/candidates", {
    method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
    body: JSON.stringify({ fullName: "Rohan Deshpande " + run, email: `rohan.${run}@test.com`, source: "manual" }),
  });
  const candJson = await candRes.json();
  const candidateId = candJson.data?.candidate?._id || candJson.data?._id;
  console.log("CANDIDATE status=" + candRes.status + " id=" + (candidateId ? "yes" : JSON.stringify(candJson).slice(0, 150)));
  if (!candidateId) process.exit(1);

  const form = new FormData();
  form.append("candidateId", candidateId);
  form.append("file", new Blob([buildResumePdf()], { type: "application/pdf" }), "rohan-resume.pdf");

  const up = await fetch(BASE + "/api/v1/resumes/upload", {
    method: "POST", headers: { Authorization: "Bearer " + token }, body: form,
  });
  const uj = await up.json();
  const resumeId = uj.data?.resume?._id;
  console.log("UPLOAD status=" + up.status + " resumeId=" + (resumeId || "MISSING " + JSON.stringify(uj).slice(0, 200)));

  // Small delay in case parsing is async-ish
  await new Promise((r) => setTimeout(r, 1500));

  const list = await fetch(BASE + "/api/v1/resumes?candidateId=" + candidateId, { headers: { Authorization: "Bearer " + token } });
  const lj = await list.json();
  const resumes = lj.data?.resumes || lj.data || [];
  const r = Array.isArray(resumes) ? resumes.find((x) => x._id === resumeId) || resumes[0] : null;
  if (!r) { console.log("LIST status=" + list.status + " body=" + JSON.stringify(lj).slice(0, 300)); process.exit(1); }

  const textLen = (r.parsedText || "").length;
  console.log("PARSE: status=" + r.parsingStatus + " parsedTextLen=" + textLen);
  console.log("TEXT_HEAD: " + JSON.stringify((r.parsedText || "").slice(0, 120)));
  console.log("HAS_KEY_TOKENS: React=" + (r.parsedText || "").includes("React") + " Infosys=" + (r.parsedText || "").includes("Infosys") + " years7=" + (r.parsedText || "").includes("7 years"));
  console.log("AI: parsingError=" + JSON.stringify(r.parsingError || null));
  console.log("AI: parsedDataPresent=" + !!r.parsedData + " confidence=" + JSON.stringify(r.parsedConfidence ?? r.parsingConfidence ?? null));

  const back = await fetch(BASE + "/api/v1/candidates/" + candidateId, { headers: { Authorization: "Bearer " + token } });
  const bj = await back.json();
  const c = bj.data?.candidate || bj.data || {};
  console.log("CANDIDATE_AFTER: skills=" + JSON.stringify((c.skills || []).slice(0, 9)) + " workHistory=" + (c.workHistory || []).length + " totalExperienceYears=" + (c.totalExperienceYears ?? null));
})().catch((e) => { console.log("VERIFY_CRASH: " + e.message); process.exit(1); });
