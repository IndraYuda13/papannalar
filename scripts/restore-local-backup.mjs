import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { databaseUrl, sql } from "../tests/harness/postgres.mjs";

// Test-emulator backups only. The imported guard rejects remote/non-test DBs.
const backup = process.argv[2];
if (!backup)
  throw new Error("Usage: node scripts/restore-local-backup.mjs BACKUP");
const contents = await readFile(resolve(backup));
if (
  sql(
    "select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname not like 'pg_%' and n.nspname <> 'information_schema'",
  ) !== "0"
)
  throw new Error(
    "Restore requires an empty test database; nothing was changed",
  );

const executable = process.env.PG_RESTORE_BIN ?? "pg_restore";
const lines = execFileSync(executable, ["--list", resolve(backup)], {
  encoding: "utf8",
}).split(/\r?\n/);
const schemaData = lines.filter((line) =>
  /TABLE DATA pn_private sync_schemas /.test(line),
);
if (schemaData.length !== 1)
  throw new Error("Expected exactly one validator-schema data entry");
const ordered = lines.filter((line) => line !== schemaData[0]);
const firstData = ordered.findIndex((line) => / TABLE DATA /.test(line));
if (firstData < 0) throw new Error("Backup has no table data");
// CHECK functions read these rows. pg_dump cannot infer that data dependency.
// Keep every constraint, trigger, grant and RLS policy in the archive intact.
ordered.splice(firstData, 0, schemaData[0]);
await mkdir(".local", { recursive: true });
const scratch = await mkdtemp(".local/restore-");
const list = resolve(scratch, "ordered.list");
await writeFile(list, ordered.join("\n"));
sql(`do $$ begin
  if not exists(select from pg_roles where rolname='anon') then create role anon nologin; end if;
  if not exists(select from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
end $$;`);
execFileSync(
  executable,
  [
    "--exit-on-error",
    "--single-transaction",
    "--use-list",
    list,
    "--dbname",
    databaseUrl,
    resolve(backup),
  ],
  { stdio: "inherit" },
);
const result = {
  status: "PASS",
  scope:
    "isolated local PostgreSQL auth/realtime emulator, not hosted Supabase",
  backupSha256: createHash("sha256").update(contents).digest("hex"),
  migrations: Number(sql("select count(*) from pn_test.migrations")),
  validatorSchemas: Number(sql("select count(*) from pn_private.sync_schemas")),
  boardPackets: Number(sql("select count(*) from pn_private.board_packages")),
  invalidBoardPackets: Number(
    sql(
      "select count(*) from pn_private.board_packages where not pn_private.valid_board_packet(packet)",
    ),
  ),
  tablesWithoutRls: Number(
    sql(
      "select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','pn_private') and c.relkind='r' and not c.relrowsecurity",
    ),
  ),
};
if (result.invalidBoardPackets || result.tablesWithoutRls)
  throw new Error("Restored database failed the invariant audit");
await mkdir("artifacts/qa/M15", { recursive: true });
await writeFile(
  "artifacts/qa/M15/restore-success.json",
  JSON.stringify(result, null, 2) + "\n",
);
console.log(JSON.stringify(result, null, 2));
