import { execFileSync } from "node:child_process";

export const databaseUrl =
  process.env.TEST_DATABASE_URL ??
  "postgresql://postgres@127.0.0.1:55432/pn_m01c_test";
const parsed = new URL(databaseUrl);
if (
  !["127.0.0.1", "localhost"].includes(parsed.hostname) ||
  parsed.pathname !== "/pn_m01c_test"
) {
  throw new Error(
    "Tests require an isolated loopback database named pn_m01c_test",
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
