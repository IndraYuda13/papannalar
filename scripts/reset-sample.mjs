// Explicit operator reset of synthetic library data, never a runtime endpoint.
import { execFileSync } from "node:child_process";
import { sampleSeedSql } from "./sample-data.mjs";
const target = process.argv.find((v) => v.startsWith("--target="))?.slice(9);
const confirm = process.argv.find((v) => v.startsWith("--confirm="))?.slice(10);
const url = process.env.SAMPLE_DATABASE_URL,
  owner = process.env.SAMPLE_TEACHER_ID;
if (
  !url ||
  !owner ||
  !target ||
  new URL(url).hostname !== target ||
  confirm !== owner ||
  !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(
    owner,
  )
)
  throw new Error(
    "Set sample operator env, exact --target=<database host>, and --confirm=<sample teacher UUID>. Back up first.",
  );
// Guard and delete share one transaction. Active recording or real data refuses all changes.
const seed = sampleSeedSql(owner)
  .replace(/^begin;\n/, "")
  .replace(/commit;$/, "");
const query = `begin;
do $$begin
 perform 1 from pn_private.sample_accounts where owner_id='${owner}' for update;
 if not found then raise exception 'Not a registered sample account';end if;
 if exists(select 1 from pn_private.sample_accounts where owner_id='${owner}' and lease_until>now())
 or exists(select 1 from public.library_runs where owner_id='${owner}' and status='active')
 or exists(select 1 from pn_private.presentations where owner_id='${owner}' and not revoked and expires_at>now()) then raise exception 'Recording still active';end if;
 if exists(select 1 from public.library_runs where owner_id='${owner}' and not synthetic) then raise exception 'Non-synthetic history present';end if;
end$$;
delete from pn_private.presentations where owner_id='${owner}' and session_id in(select id from public.library_runs where owner_id='${owner}' and synthetic);
delete from public.library_responses where run_id in(select id from public.library_runs where owner_id='${owner}' and synthetic);
delete from public.library_runs where owner_id='${owner}' and synthetic;
delete from public.question_versions where set_id in(select id from public.question_sets where owner_id='${owner}' and source='teacher');
delete from public.question_sets where owner_id='${owner}' and source='teacher';
${seed}
commit;`;
try {
  execFileSync(
    process.env.PSQL_BIN ?? "psql",
    [url, "-X", "-q", "-v", "ON_ERROR_STOP=1"],
    { input: query, stdio: ["pipe", "ignore", "pipe"], windowsHide: true },
  );
} catch {
  throw new Error(
    "Reset refused or failed. End all sample sessions, close recording tabs, wait for lease expiry, and check database/backup. Credentials omitted.",
  );
}
console.log(
  "Sample collections/assessment results restored. Classes, stable student IDs, local names, other accounts and system collections preserved.",
);
