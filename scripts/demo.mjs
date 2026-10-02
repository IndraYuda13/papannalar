// Explicit loopback-only demo adapter. Never connects to a production database.
import { spawn, execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { createRequire } from "node:module";
import { randomBytes } from "node:crypto";
import { SAMPLE_ID } from "./sample-data.mjs";
const require = createRequire(import.meta.url),
  root = process.cwd();
const psql =
  process.env.PSQL_BIN ??
  (process.platform === "win32"
    ? "C:\\Program Files\\PostgreSQL\\17\\bin\\psql.exe"
    : "psql");
const env = {
  ...process.env,
  PSQL_BIN: psql,
  TEST_DATABASE_URL: "postgresql://postgres@127.0.0.1:55432/pn_m01c_test",
  APP_ORIGIN: "http://127.0.0.1:3100",
  NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54325",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "local-test-publishable-key",
  PAIRING_SECRET: randomBytes(32).toString("hex"),
  PAPANNALAR_LOCAL_ADAPTER: "1",
  ...(process.argv.includes("--video")
    ? {
        SAMPLE_ENABLED: "true",
        SAMPLE_TEACHER_ID: SAMPLE_ID,
        SAMPLE_TEACHER_EMAIL: "recording@qa.invalid",
        SAMPLE_TEACHER_PASSWORD: "local-recording-test-password-only-2026",
        SAMPLE_ACCESS_CODE: "",
      }
    : {}),
};
const cluster = resolve(root, ".local/m01c-pg"),
  pgctl =
    process.platform === "win32"
      ? resolve(dirname(psql), "pg_ctl.exe")
      : "pg_ctl";
let ownCluster = false;
const children = [];
const run = (file, args) =>
  execFileSync(file, args, { env, stdio: "inherit", windowsHide: true });
function cleanup() {
  for (const child of children) child.kill();
  if (ownCluster) {
    try {
      run(pgctl, ["-D", cluster, "-m", "fast", "stop"]);
    } catch {}
  }
}
process.on("SIGINT", () => {
  cleanup();
  process.exit(0);
});
process.on("SIGTERM", () => {
  cleanup();
  process.exit(0);
});
try {
  try {
    execFileSync(
      psql,
      [env.TEST_DATABASE_URL, "-X", "-qAt", "-c", "select 1"],
      { env, stdio: "ignore", windowsHide: true },
    );
  } catch {
    if (!existsSync(resolve(cluster, "PG_VERSION")))
      throw new Error(
        "Start isolated PostgreSQL on port 55432, database pn_m01c_test. No database is created or replaced automatically.",
      );
    run(pgctl, [
      "-D",
      cluster,
      "-l",
      resolve(root, ".local/demo-postgres.log"),
      "-o",
      "-p 55432 -h 127.0.0.1",
      "-w",
      "start",
    ]);
    ownCluster = true;
  }
  run(process.execPath, ["scripts/test-db.mjs", "prepare"]);
  if (process.argv.includes("--video"))
    run(process.execPath, ["scripts/seed-local-recording.mjs"]);
  const developing = process.argv.includes("--dev");
  if (developing) run(process.execPath, ["scripts/prepare-assets.mjs"]);
  if (!developing && !existsSync(".next/BUILD_ID")) {
    run(process.execPath, ["scripts/prepare-assets.mjs"]);
    run(process.execPath, [require.resolve("next/dist/bin/next"), "build"]);
    run(process.execPath, ["scripts/build-offline.mjs"]);
  }
  for (const args of [
    ["tests/harness/provider.mjs"],
    [
      require.resolve("next/dist/bin/next"),
      developing ? "dev" : "start",
      "--hostname",
      "127.0.0.1",
      "--port",
      "3100",
    ],
  ]) {
    const child = spawn(process.execPath, args, {
      env,
      stdio: "inherit",
      windowsHide: true,
    });
    children.push(child);
    child.on("exit", (code) => {
      if (code) {
        cleanup();
        process.exit(code);
      }
    });
  }
  console.log(
    process.argv.includes("--video")
      ? "Rekaman lokal: http://127.0.0.1:3100/masuk → Coba dengan data contoh → /guru | papan /layar. PostgreSQL nyata; Auth/Realtimenya provider uji loopback. Ctrl+C untuk berhenti."
      : "Demo adapter lokal: http://127.0.0.1:3100/demo | papan: http://127.0.0.1:3100/layar | Ctrl+C untuk berhenti. Auth/email/WebSocket live tidak dipakai.",
  );
  if (process.argv.includes("--smoke")) {
    let ready = false;
    for (let i = 0; i < 40; i++) {
      try {
        const response = await fetch("http://127.0.0.1:3100/demo");
        if (
          response.ok &&
          (await response.text()).includes("Masuk demo lokal")
        ) {
          ready = true;
          break;
        }
      } catch {}
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    if (!ready) throw new Error("Demo route did not become ready");
    console.log(
      "PASS demo launcher /demo HTTP 200 with explicit local provider label",
    );
    cleanup();
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : "Local demo failed");
  cleanup();
  process.exitCode = 1;
}
