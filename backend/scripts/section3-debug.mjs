const BASE = "http://127.0.0.1:5000";
const run = process.argv[2];
(async () => {
  const login = await fetch(BASE + "/api/v1/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: "fresh.tester+20260914@hireflow-test.com", password: "Fresh-Test-2026!z" }) });
  const token = (await login.json()).data.token;
  const list = await fetch(BASE + "/api/v1/applications", { headers: { Authorization: "Bearer " + token } });
  const lj = await list.json();
  const apps = lj.data?.applications || lj.data || [];
  const last = apps[0];
  if (!last) { console.log("no applications"); process.exit(0); }
  const s = await fetch(BASE + `/api/v1/applications/${last._id}/score`, { headers: { Authorization: "Bearer " + token } });
  const sj = await s.json();
  console.log(JSON.stringify(sj.data?.score?.breakdown ?? sj, null, 1).slice(0, 2200));
})();
