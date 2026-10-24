import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
const cwd = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../apps/mobile",
);
const child = spawn(
  process.execPath,
  [path.join(cwd, "node_modules/expo/bin/cli"), "start", "--lan"],
  { cwd, stdio: "inherit", windowsHide: true },
);
child.on("exit", (code) => process.exit(code || 0));
process.on('SIGINT',()=>{child.kill();process.exit(0)});
process.on('SIGTERM',()=>{child.kill();process.exit(0)});
