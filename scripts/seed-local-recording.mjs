// Test/local launcher only. The Postgres helper refuses hosted databases.
import { sql, literal } from "../tests/harness/postgres.mjs";
import { SAMPLE_ID, sampleSeedSql } from "./sample-data.mjs";
sql(
  `insert into auth.users(id,email,is_anonymous) values(${literal(SAMPLE_ID)}::uuid,'recording@qa.invalid',false) on conflict(id) do nothing`,
);
if (
  sql(
    `select exists(select 1 from pn_private.sample_accounts where owner_id=${literal(SAMPLE_ID)}::uuid)`,
  ) !== "t"
)
  sql(sampleSeedSql(SAMPLE_ID));
console.log(
  "Persistent recording account available in isolated local PostgreSQL. Existing dataset preserved.",
);
