import { readFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { sql, literal, databaseUrl } from "../tests/harness/postgres.mjs";
import {
  verifyDiagnosticDatabase,
  writeDiagnostic,
} from "./learning-diagnostics.mjs";
verifyDiagnosticDatabase();
const text = await readFile("supabase/tests/group-board.sql", "utf8");
const setup = text.slice(
  0,
  text.indexOf(
    "set local role authenticated;set local request.jwt.claims",
    text.indexOf("insert into receipt select 'board-binding'"),
  ),
);
// Unique fixture IDs, retained as inspectable synthetic concurrency evidence.
const fixture = setup
  .replaceAll("a1", "c1")
  .replaceAll("a2", "c2")
  .replaceAll("a3", "c3")
  .replaceAll("a4", "c4")
  .replaceAll("a5", "c5")
  .replaceAll("a6", "c6")
  .replaceAll("a7", "c7");
sql(fixture + "commit;");
const binding = JSON.parse(
  sql(
    "select jsonb_build_object('presentationId',p.id,'channelEpoch',p.channel_epoch,'assignmentId',a.id,'revision',1,'taskEpoch','c4000000-0000-4000-8000-000000000001') from pn_private.presentations p join public.group_assignments a on a.run_id=p.session_id where p.id='c7000000-0000-4000-8000-000000000001'",
  ),
);
async function attempt(requestId) {
  const input = { ...binding, action: "next", skip: true, requestId };
  const query = `begin;set local role authenticated;set local request.jwt.claims=${literal(JSON.stringify({ sub: "c1000000-0000-4000-8000-000000000003", is_anonymous: true }))}; select public.group_board_action(${literal(JSON.stringify(input))});commit;`;
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.env.PSQL_BIN ?? "psql",
      [databaseUrl, "-X", "-qAt", "-v", "ON_ERROR_STOP=1"],
      { stdio: ["pipe", "pipe", "pipe"] },
    );
    let out = "",
      err = "";
    child.stdout.on("data", (b) => (out += b));
    child.stderr.on("data", (b) => (err += b));
    child.on("exit", (code) =>
      code ? reject(new Error(err)) : resolve(JSON.parse(out.trim())),
    );
    child.stdin.end(query);
  });
}
const responses = await Promise.all([
  attempt("c8000000-0000-4000-8000-000000000001"),
  attempt("c8000000-0000-4000-8000-000000000002"),
]);
if (
  responses.filter((r) => r.error === "CONFLICT").length !== 1 ||
  responses.filter((r) => r.position === 1 && r.revision === 2).length !== 1
)
  throw new Error("concurrent board CAS failed");
const final = sql(
  `select position||':'||revision from pn_private.group_board_progress where assignment_id='${binding.assignmentId}'`,
);
if (final !== "1:2") throw new Error("double advancement");
const report = {
  verification_status: "VERIFIED",
  claims:
    "two distinct simultaneous Next actions at same revision produce one receipt and one conflict",
  final,
  results: responses.map((r) => r.error ?? "accepted"),
};
await writeDiagnostic("learning-concurrency.json", report);
console.log(JSON.stringify(report));
