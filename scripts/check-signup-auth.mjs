import { spawn } from "node:child_process";
import { once } from "node:events";
import { randomUUID, randomBytes } from "node:crypto";
import { sql, literal } from "../tests/harness/postgres.mjs";
import {
  verifyDiagnosticDatabase,
  writeDiagnostic,
} from "./learning-diagnostics.mjs";
import { providerOrigin } from "../tests/harness/ports.mjs";
verifyDiagnosticDatabase();
if (!process.env.PNL_PROVIDER_PORT || process.env.PNL_PROVIDER_PORT === "54325")
  throw new Error("Explicit nonlive provider port required");
let child;
let assertions = 0;
const ok = (condition, label) => {
  if (!condition) throw new Error(label);
  assertions++;
};
async function start() {
  child = spawn(process.execPath, ["tests/harness/provider.mjs"], {
    env: { ...process.env, PAPANNALAR_INTERNAL_TEST_AUTH: "0" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  await Promise.race([
    once(child.stdout, "data"),
    once(child, "exit").then(() => {
      throw new Error("Provider unavailable");
    }),
  ]);
}
async function stop() {
  if (child) {
    child.kill();
    await once(child, "exit");
    child = null;
  }
}
async function call(path, body, token, method = "POST") {
  const response = await fetch(providerOrigin + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: method === "GET" ? undefined : JSON.stringify(body),
  });
  return {
    status: response.status,
    data: await response.json().catch(() => null),
  };
}
const email = `signup-${randomUUID()}@qa.invalid`,
  password = randomBytes(24).toString("hex"),
  wrong = randomBytes(24).toString("hex");
try {
  await start();
  const { internalTestAuth } =
    await import("../tests/harness/provider-password.mjs");
  ok(
    !internalTestAuth({
      PAPANNALAR_INTERNAL_TEST_AUTH: "1",
      PUBLIC_APP_ORIGIN: "https://public.invalid",
      TEST_DATABASE_URL: process.env.TEST_DATABASE_URL,
    }),
    "public test flag failclosed",
  );
  const registered = await call("/auth/v1/signup", { email, password });
  ok(
    registered.status === 200 && !registered.data.user.is_anonymous,
    "registration",
  );
  const id = registered.data.user.id,
    token = registered.data.access_token;
  ok(registered.data.user.email_confirmed_at === null, "no false verification");
  const duplicate = await call("/auth/v1/signup", { email, password: wrong });
  ok(duplicate.status === 400, "duplicate rejected");
  const fail = await call("/auth/v1/token?grant_type=password", {
    email,
    password: wrong,
  });
  const unknown = await call("/auth/v1/token?grant_type=password", {
    email: `absent-${randomUUID()}@qa.invalid`,
    password: wrong,
  });
  ok(
    fail.status === 400 &&
      JSON.stringify(fail.data) === JSON.stringify(unknown.data),
    "generic credentials failure",
  );
  const login = await call("/auth/v1/token?grant_type=password", {
    email,
    password,
  });
  ok(login.data.user.id === id, "correct login same owner");
  const classId = randomUUID();
  sql(
    `insert into public.classes(id,owner_id,label,grade,student_count,runtime_mode) values(${literal(classId)},${literal(id)},'Signup fixture',7,1,'pilot')`,
  );
  await stop();
  await start();
  const restarted = await call("/auth/v1/token?grant_type=password", {
    email,
    password,
  });
  ok(restarted.data.user.id === id, "restart credential persistence");
  ok(
    (await call("/auth/v1/user", {}, token, "GET")).data.id === id,
    "session persists restart",
  );
  ok(
    sql(
      `select count(*) from public.classes where owner_id=${literal(id)} and id=${literal(classId)}`,
    ) === "1",
    "classes retained",
  );
  ok(
    (await call("/auth/v1/user", {}, restarted.data.refresh_token, "GET"))
      .status === 401,
    "refresh cannot impersonate access",
  );
  const legacyEmail = `legacy-${randomUUID()}@qa.invalid`,
    legacyId = randomUUID();
  sql(
    `insert into auth.users values(${literal(legacyId)},${literal(legacyEmail)},false)`,
  );
  ok(
    (await call("/auth/v1/signup", { email: legacyEmail, password })).status ===
      400,
    "unauth legacy takeover denied",
  );
  ok(
    (await call("/auth/v1/user", { password }, undefined, "PUT")).status ===
      400,
    "unauth enroll denied",
  );
  // Synthetic already-authenticated legacy session, never a public enrollment shortcut.
  const { saveToken } = await import("../tests/harness/provider-password.mjs");
  const legacyToken = randomBytes(32).toString("hex");
  saveToken(legacyToken, { id: legacyId }, 3600, randomUUID(), "access");
  ok(
    (await call("/auth/v1/user", { password }, legacyToken, "PUT")).data.id ===
      legacyId,
    "authenticated legacy enrollment",
  );
  ok(
    (
      await call("/auth/v1/token?grant_type=password", {
        email: legacyEmail,
        password,
      })
    ).data.user.id === legacyId,
    "enrolled login same UUID",
  );
  ok(
    (await call("/auth/v1/otp", { email })).status === 400,
    "public OTP disabled",
  );
  ok(
    (await call("/__test/link", {}, null, "GET")).status === 400,
    "inband link disabled",
  );
  const storage = JSON.parse(
    sql(
      `select jsonb_build_object('salt',salt,'hash',password_hash) from pn_private.password_credentials where user_id=${literal(id)}`,
    ),
  );
  ok(
    storage.salt.length === 64 &&
      storage.hash.length === 128 &&
      !JSON.stringify(storage).includes(password),
    "salted hash only",
  );
  ok(
    sql(
      `select has_table_privilege('authenticated','pn_private.password_credentials','SELECT')`,
    ) === "f",
    "credential table private",
  );
  for (let i = 0; i < 16; i++)
    await call("/auth/v1/token?grant_type=password", {
      email: `rate-${id}@qa.invalid`,
      password: wrong,
    });
  ok(
    (
      await call("/auth/v1/token?grant_type=password", {
        email: `rate-${id}@qa.invalid`,
        password: wrong,
      })
    ).status === 429,
    "durable throttling",
  );
  await call("/auth/v1/logout?scope=local", {}, restarted.data.access_token);
  ok(
    (await call("/auth/v1/user", {}, restarted.data.access_token, "GET"))
      .status === 401,
    "logout revokes persisted access",
  );
  ok(
    (
      await call("/auth/v1/token?grant_type=refresh_token", {
        refresh_token: restarted.data.refresh_token,
      })
    ).status === 400,
    "logout revokes refresh pair",
  );
  await writeDiagnostic("signup-auth.json", {
    assertions,
    verification_status: "VERIFIED",
    provider: providerOrigin,
    scope:
      "real isolated PostgreSQL and HTTP provider with restart, not hosted Supabase SMTP",
  });
  console.log(`${assertions} signup HTTP/storage assertions PASS`);
} finally {
  await stop();
}
