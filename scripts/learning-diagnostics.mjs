import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { execFileSync } from "node:child_process";
export function diagnosticDatabase(env = process.env) {
  const url = new URL(env.TEST_DATABASE_URL ?? "invalid:");
  if (
    url.protocol !== "postgresql:" ||
    !["127.0.0.1", "localhost"].includes(url.hostname) ||
    !url.port ||
    url.port === "55432" ||
    !/^\/pn_m01c_[a-z0-9_]+$/.test(url.pathname) ||
    url.search ||
    url.hash
  )
    throw new Error(
      "Explicit isolated loopback TEST_DATABASE_URL required; live port forbidden",
    );
  if (!/^[0-9]+$/.test(env.PNL_TEST_CLUSTER_ID ?? ""))
    throw new Error(
      "PNL_TEST_CLUSTER_ID must pin the independently verified isolated cluster",
    );
  return url;
}
export function verifyDiagnosticDatabase(env = process.env) {
  const url = diagnosticDatabase(env);
  const id = execFileSync(
    env.PSQL_BIN ?? "psql",
    [
      url.toString(),
      "-X",
      "-qAt",
      "-v",
      "ON_ERROR_STOP=1",
      "-c",
      "select system_identifier from pg_control_system()",
    ],
    { encoding: "utf8", timeout: 10000 },
  ).trim();
  if (id !== env.PNL_TEST_CLUSTER_ID)
    throw new Error("Test cluster identity mismatch");
  return url;
}
export async function writeDiagnostic(name, value, env = process.env) {
  if (!/^[a-z-]+\.json$/.test(name))
    throw new Error("Invalid evidence filename");
  const dir = resolve(
    env.PNL_EVIDENCE_DIR ?? join("artifacts", "qa", "learning"),
  );
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, name), JSON.stringify(value, null, 2));
}
