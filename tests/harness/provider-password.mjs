import {
  randomBytes,
  randomUUID,
  scryptSync,
  timingSafeEqual,
  createHash,
} from "node:crypto";
import { sql, literal } from "./postgres.mjs";
export const digest = (v) => createHash("sha256").update(v).digest("hex");
export function internalTestAuth(env = process.env) {
  try {
    const app = new URL(env.PUBLIC_APP_ORIGIN || env.APP_ORIGIN || "invalid:");
    const db = new URL(env.TEST_DATABASE_URL || "invalid:");
    return (
      env.PAPANNALAR_INTERNAL_TEST_AUTH === "1" &&
      ["localhost", "127.0.0.1"].includes(app.hostname) &&
      ["localhost", "127.0.0.1"].includes(db.hostname) &&
      !!db.port &&
      db.port !== "55432" &&
      /^\/pn_m01c_[a-z0-9_]+$/.test(db.pathname)
    );
  } catch {
    return false;
  }
}
export function passwordRate(email, ip) {
  for (const [key, max] of [
    ["email:" + digest(email), 15],
    ["ip:" + digest(ip), 100],
  ]) {
    const count = Number(
      sql(
        `insert into pn_private.password_limits values(${literal(key)},now(),1) on conflict(bucket) do update set attempts=case when password_limits.started_at<now()-interval '1 minute' then 1 else password_limits.attempts+1 end,started_at=case when password_limits.started_at<now()-interval '1 minute' then now() else password_limits.started_at end returning attempts`,
      ),
    );
    if (count > max) throw new Error("RATE_LIMITED");
  }
}
export function credentials(input) {
  const email =
      typeof input.email === "string" ? input.email.trim().toLowerCase() : "",
    password = input.password;
  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    email.length > 254 ||
    typeof password !== "string" ||
    password.length < 8 ||
    password.trim().length === 0 ||
    password.length > 128
  )
    throw new Error("AUTH_FAILED");
  return { email, password };
}
const hash = (password, salt) =>
  scryptSync(password, Buffer.from(salt, "hex"), 64, {
    N: 16384,
    r: 8,
    p: 1,
    maxmem: 64 * 1024 * 1024,
  });
export function publicUser(row) {
  return {
    id: row.id,
    email: row.email,
    is_anonymous: row.is_anonymous,
    aud: "authenticated",
    role: "authenticated",
    app_metadata: { provider: "email" },
    user_metadata: {},
    email_confirmed_at: null,
  };
}
export function registerPassword(input) {
  const { email, password } = credentials(input),
    salt = randomBytes(32).toString("hex"),
    passwordHash = hash(password, salt).toString("hex"),
    id = randomUUID();
  let result;
  try {
    result = sql(
      `begin;select pg_advisory_xact_lock(hashtext('pn-password'),hashtext(${literal(email)}));insert into auth.users(id,email,is_anonymous) select ${literal(id)},${literal(email)},false where not exists(select 1 from auth.users where lower(btrim(email))=${literal(email)});insert into pn_private.password_credentials select ${literal(id)},${literal(email)},${literal(salt)},${literal(passwordHash)},now() where exists(select 1 from auth.users where id=${literal(id)});select jsonb_build_object('id',id,'email',email,'is_anonymous',false) from auth.users where id=${literal(id)};commit;`,
    );
  } catch {
    throw new Error("AUTH_FAILED");
  }
  if (!result.split("\n").some((x) => x.startsWith("{")))
    throw new Error("AUTH_FAILED");
  return publicUser(
    JSON.parse(
      result
        .split("\n")
        .filter((x) => x.startsWith("{"))
        .at(-1),
    ),
  );
}
export function loginPassword(input) {
  const { email, password } = credentials(input);
  const raw = sql(
    `select jsonb_build_object('id',u.id,'email',u.email,'is_anonymous',u.is_anonymous,'salt',c.salt,'hash',c.password_hash) from pn_private.password_credentials c join auth.users u on u.id=c.user_id where c.email=${literal(email)} and not u.is_anonymous`,
  );
  const row = raw ? JSON.parse(raw) : null;
  const actual = hash(password, row?.salt ?? "00".repeat(32));
  const expected = Buffer.from(row?.hash ?? "00".repeat(64), "hex");
  if (!timingSafeEqual(actual, expected) || !row)
    throw new Error("AUTH_FAILED");
  return publicUser(row);
}
export function enrollPassword(user, password) {
  if (!user || user.is_anonymous || !user.email) throw new Error("AUTH_FAILED");
  credentials({ email: user.email, password });
  const salt = randomBytes(32).toString("hex"),
    h = hash(password, salt).toString("hex");
  try {
    const enrolled = sql(
      `insert into pn_private.password_credentials(user_id,email,salt,password_hash) select ${literal(user.id)},${literal(user.email.trim().toLowerCase())},${literal(salt)},${literal(h)} where (select count(*) from auth.users where lower(btrim(email))=${literal(user.email.trim().toLowerCase())})=1 returning user_id`,
    );
    if (!enrolled) throw new Error("AUTH_FAILED");
  } catch {
    throw new Error("AUTH_FAILED");
  }
  return user;
}
export function saveToken(token, user, seconds, sessionId, kind) {
  sql(
    `insert into pn_private.password_sessions values(${literal(digest(token))},${literal(user.id)},now()+interval '${seconds} seconds',${literal(sessionId)},${literal(kind)})`,
  );
}
export function readToken(token, kind = "access") {
  if (!token) return null;
  const row = sql(
    `select jsonb_build_object('id',u.id,'email',u.email,'is_anonymous',u.is_anonymous) from pn_private.password_sessions s join auth.users u on u.id=s.user_id where s.token_hash=${literal(digest(token))} and s.expires_at>now() and s.kind=${literal(kind)}`,
  );
  return row ? publicUser(JSON.parse(row)) : null;
}
export function revokeToken(token, all = false) {
  if (!token) return;
  sql(
    all
      ? `delete from pn_private.password_sessions where user_id=(select user_id from pn_private.password_sessions where token_hash=${literal(digest(token))})`
      : `delete from pn_private.password_sessions where session_id=(select session_id from pn_private.password_sessions where token_hash=${literal(digest(token))})`,
  );
}
