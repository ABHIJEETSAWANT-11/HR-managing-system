// Boots a REAL mongod (mongodb-memory-server) + the REAL compiled backend on :5001.
// Dev/verification only — backend/.env and the Atlas path stay untouched.
const { MongoMemoryServer } = require("mongodb-memory-server");
const { spawn } = require("child_process");
const path = require("path");

(async () => {
  console.log("[local-mongo] starting in-memory mongod…");
  const mongod = await MongoMemoryServer.create({ instance: { port: 5002, ip: "127.0.0.1" } });
  const uri = mongod.getUri("hireflow");
  console.log("[local-mongo] mongod ready at", uri.replace(/\/\/.*@/, "//REDACTED@"));

  const env = { ...process.env, PORT: "5001", MONGODB_URI: uri, NODE_ENV: "development" };
  const child = spawn(process.execPath, [path.join(__dirname, "..", "dist", "server.js")], {
    env, cwd: path.join(__dirname, ".."), stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout.on("data", (d) => process.stdout.write("[server] " + d));
  child.stderr.on("data", (d) => process.stderr.write("[server:err] " + d));
  child.on("exit", (code) => { console.log("[local-mongo] server exited", code); process.exit(code); });

  const shutdown = async () => { try { child.kill(); } catch {} try { await mongod.stop(); } catch {} process.exit(0); };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
})();
