// Explicit operator command. Credentials never printed or written by this tool.
import { execFileSync } from "node:child_process";
import { sampleSeedSql } from "./sample-data.mjs";
const target = process.argv.find((v) => v.startsWith("--target="))?.slice(9),
  url = process.env.SAMPLE_DATABASE_URL,
  owner = process.env.SAMPLE_TEACHER_ID;
if (!url || !owner || !target || new URL(url).hostname !== target)
  throw new Error(
    "Set SAMPLE_DATABASE_URL, SAMPLE_TEACHER_ID and --target=<exact database host>. Run after backup/migration/RLS review.",
  );
if (
  !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(
    owner,
  )
)
  throw new Error("Invalid sample owner");
try {
  execFileSync(
    process.env.PSQL_BIN ?? "psql",
    [url, "-X", "-q", "-v", "ON_ERROR_STOP=1"],
    {
      input: sampleSeedSql(owner),
      stdio: ["pipe", "ignore", "pipe"],
      windowsHide: true,
    },
  );
} catch {
  throw new Error(
    "Seed rejected. Check database/migrations and recording lease; credentials are omitted.",
  );
}
console.log(
  "Sample dataset seeded idempotently. Existing results preserved. No local student names created on server.",
);
