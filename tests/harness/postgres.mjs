import { execFileSync } from "node:child_process";

export const databaseUrl =
  process.env.TEST_DATABASE_URL ??
  "postgresql://postgres@127.0.0.1:55432/pn_m01c_test";
const parsed = new URL(databaseUrl);
// Loopback only, and only this project's isolated test databases. The default
// stays pn_m01c_test; audit/staging runs point TEST_DATABASE_URL at their own
// pn_m01c_* database so a parallel instance never writes the shared one.
if (
  !["127.0.0.1", "localhost"].includes(parsed.hostname) ||
  !/^\/pn_m01c_[a-z0-9_]+$/.test(parsed.pathname)
) {
  throw new Error(
    "Tests require an isolated loopback database named pn_m01c_<suffix>",
  );
}
export function sql(query) {
  return execFileSync(
    process.env.PSQL_BIN ?? "psql",
    [databaseUrl, "-X", "-qAt", "-v", "ON_ERROR_STOP=1"],
    {
      input: query,
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    },
  ).trim();
}
export const literal = (value) =>
  "'" + String(value).replaceAll("'", "''") + "'";
export function asUser(user, query) {
  const claims = JSON.stringify({
    sub: user.id,
    role: "authenticated",
    is_anonymous: user.is_anonymous,
  });
  const output = sql(
    `begin; set local role authenticated; set local request.jwt.claims = ${literal(claims)}; ${query}; commit;`,
  );
  return output ? JSON.parse(output) : null;
}
