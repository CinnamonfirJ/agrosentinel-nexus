import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import os from "node:os";
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
process.chdir(root);
const windows = process.platform === "win32";
const python = path.join(
  root,
  "backend",
  ".venv",
  windows ? "Scripts/python.exe" : "bin/python",
);
if (!existsSync(python)) {
  const result = spawnSync(
    windows ? "python" : "python3",
    ["-m", "venv", "backend/.venv"],
    { stdio: "inherit" },
  );
  if (result.status !== 0) process.exit(result.status || 1);
}
const check = spawnSync(
  python,
  ["-c", "import fastapi, uvicorn, langgraph, PIL, cryptography, psycopg, psycopg_pool, boto3, dotenv"],
  { stdio: "ignore" },
);
if (check.status !== 0) {
  const result = spawnSync(
    python,
    ["-m", "pip", "install", "-r", "backend/requirements.txt"],
    { stdio: "inherit" },
  );
  if (result.status !== 0) process.exit(result.status || 1);
}
const production = process.argv.includes("--production");
const children = [];
let stopping=false;
function run(command, args) {
  const child = spawn(command, args, {
    stdio: "inherit",
    cwd: root,
    windowsHide: true,
  });
  children.push(child);
  child.on("error", (e) => {
    console.error(e.message);
    stop(1);
  });
  child.on("exit", (code) => {
    if(!stopping)stop(code||1);
  });
  return child;
}
function stop(code = 0) {
  stopping=true;
  for (const child of children) child.kill();
  process.exit(code);
}
process.on("SIGINT", () => stop());
process.on("SIGTERM", () => stop());
run(python, [
  "-m",
  "uvicorn",
  "backend.main:app",
  "--host",
  "127.0.0.1",
  "--port",
  "8000",
]);
run(process.execPath, [
  path.join(root, "node_modules/next/dist/bin/next"),
  production ? "start" : "dev",
  "--hostname",
  "0.0.0.0",
  "--port",
  "3000",
]);
console.log("\nLaptop: http://localhost:3000\nPhones on the same Wi-Fi:");
for (const list of Object.values(os.networkInterfaces()))
  for (const address of list || [])
    if (address.family === "IPv4" && !address.internal)
      console.log("  http://" + address.address + ":3000");
console.log(
  "Configure server credentials in the root .env, restart, then create your app account at /login.\n",
);
