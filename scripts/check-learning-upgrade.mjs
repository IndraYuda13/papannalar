import { readFile, readdir } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import {
  verifyDiagnosticDatabase,
  writeDiagnostic,
} from "./learning-diagnostics.mjs";
const url = verifyDiagnosticDatabase();
const name =
  process.env.PNL_UPGRADE_DATABASE ?? `pn_m01c_learning_upgrade_${Date.now()}`;
if (!/^pn_m01c_learning_upgrade_[a-z0-9_]+$/.test(name))
  throw new Error("Invalid isolated upgrade name");
const admin = url.toString();
const run = (dsn, input) =>
  execFileSync(
    process.env.PSQL_BIN ?? "psql",
    [dsn, "-X", "-qAt", "-v", "ON_ERROR_STOP=1"],
    { input, encoding: "utf8" },
  );
if (
  run(
    admin,
    `select count(*) from pg_database where datname='${name}'`,
  ).trim() !== "0"
)
  throw new Error("Upgrade evidence database already exists; do not erase it");
run(admin, `create database ${name}`);
url.pathname = `/${name}`;
const dsn = url.toString();
run(dsn, await readFile("tests/harness/bootstrap.sql", "utf8"));
const LEARNING_BASE = "202610130042_learning_groups.sql";
// Migrations that must run AFTER the predecessor fixture (library.sql). They are applied in
// order at the end of the run, because every one of them depends on learning_groups, which
// the fixture does not provide. `> LEARNING_BASE` is a strict pathname comparison and
// therefore excludes learning_groups itself, which is applied explicitly below: it uses
// plain `create function`, so applying it twice would fail rather than no-op.
const learnedAfterFixture = (await readdir("supabase/migrations"))
  .filter((file) => /^\d+_[a-z_]+\.sql$/.test(file) && file > LEARNING_BASE)
  .sort();
for (const file of (await readdir("supabase/migrations")).sort()) {
  if (!/^\d+_[a-z_]+\.sql$/.test(file) || file >= LEARNING_BASE) continue;
  run(dsn, await readFile(`supabase/migrations/${file}`, "utf8"));
}
let fixture = await readFile("supabase/tests/library.sql", "utf8");
fixture = fixture.replace(/rollback;\s*$/, "commit;");
run(dsn, fixture);
const before = run(
  dsn,
  "select count(*) from public.library_runs;select count(*) from public.library_responses;select count(*) from public.question_versions;",
);
run(dsn, await readFile(`supabase/migrations/${LEARNING_BASE}`, "utf8"));
for (const file of learnedAfterFixture) {
  run(dsn, await readFile(`supabase/migrations/${file}`, "utf8"));
}
const after = run(
  dsn,
  "select count(*) from public.library_runs;select count(*) from public.library_responses;select count(*) from public.question_versions;",
);
if (before !== after) throw new Error("Upgrade lost predecessor data");
const history = run(
  dsn,
  "select count(*) from public.library_response_history where source='legacy-import'",
).trim();
if (history !== "1")
  throw new Error("Legacy response history baseline missing");
const result = {
  status: "VERIFIED",
  database: name,
  port: Number(url.port),
  before: before.trim(),
  after: after.trim(),
  legacyHistory: Number(history),
};
await writeDiagnostic("learning-upgrade.json", result);
console.log(JSON.stringify(result));
