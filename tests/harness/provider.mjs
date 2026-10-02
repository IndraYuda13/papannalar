// Loopback TEST DOUBLE for Supabase Auth/PostgREST HTTP, backed by REAL Postgres
// for data/RLS. Not a production service and never included in the Next app.
import { createServer } from "node:http";
import { createHash, randomUUID, randomBytes } from "node:crypto";
import { sql, literal, asUser } from "./postgres.mjs";
import { SAMPLE_ID } from "../../scripts/sample-data.mjs";

const users = new Map(),
  tokens = new Map(),
  sessionTokens = new Map(),
  pending = new Map(),
  codes = new Map();
function newUser(email, anonymous = false) {
  const user = {
    id: randomUUID(),
    aud: "authenticated",
    role: "authenticated",
    email: email ?? "",
    is_anonymous: anonymous,
    app_metadata: { provider: anonymous ? "anonymous" : "email" },
    user_metadata: {},
    created_at: new Date().toISOString(),
  };
  sql(
    `insert into auth.users(id,email,is_anonymous) values (${literal(user.id)},${literal(user.email)},${anonymous});`,
  );
  users.set(email ?? user.id, user);
  return user;
}
function session(user) {
  const payload = {
    sub: user.id,
    aud: "authenticated",
    role: "authenticated",
    is_anonymous: user.is_anonymous,
    email: user.email,
    exp: Math.floor(Date.now() / 1000) + 3600,
    iat: Math.floor(Date.now() / 1000),
  };
  const access_token = `${Buffer.from('{"alg":"HS256","typ":"JWT"}').toString("base64url")}.${Buffer.from(JSON.stringify(payload)).toString("base64url")}.${randomBytes(32).toString("base64url")}`;
  const refresh_token = randomUUID();
  tokens.set(access_token, user);
  tokens.set(refresh_token, user);
  const members = new Set([access_token, refresh_token]);
  sessionTokens.set(access_token, members);
  sessionTokens.set(refresh_token, members);
  return {
    access_token,
    refresh_token,
    token_type: "bearer",
    expires_in: 3600,
    expires_at: payload.exp,
    user,
  };
}
function dataRequest(request, url, body, user) {
  if (!user) return { status: 401, body: { message: "unauthorized" } };
  if (url.pathname === "/rest/v1/rpc/presentation_logout")
    return {
      body: asUser(
        user,
        `select public.presentation_logout(${body.p_controller_id ? literal(body.p_controller_id) + "::uuid" : "null"},${body.p_sample_controller ? literal(body.p_sample_controller) + "::uuid" : "null"})`,
      ),
    };
  if (url.pathname === "/rest/v1/rpc/library_action")
    return {
      body: asUser(
        user,
        `select public.library_action(${literal(JSON.stringify(body.p_input))}::jsonb,${body.p_controller ? literal(body.p_controller) + "::uuid" : "null"})`,
      ),
    };
  if (url.pathname === "/rest/v1/rpc/library_board")
    return {
      body: asUser(
        user,
        `select public.library_board(${literal(body.p_presentation)}::uuid)`,
      ),
    };
  if (url.pathname === "/rest/v1/rpc/is_sample_teacher")
    return { body: asUser(user, "select to_json(public.is_sample_teacher())") };
  if (url.pathname === "/rest/v1/rpc/sample_control")
    return {
      body: asUser(
        user,
        `select public.sample_control(${body.p_token ? literal(body.p_token) + "::uuid" : "null"},${body.p_takeover === true},${body.p_acquire === true})`,
      ),
    };
  if (url.pathname === "/rest/v1/rpc/guidance_status")
    return {
      body: asUser(
        user,
        `select public.guidance_status(${literal(JSON.stringify(body.p_input))}::jsonb)`,
      ),
    };
  if (url.pathname === "/rest/v1/rpc/board_content_action")
    return {
      body: asUser(
        user,
        `select public.board_content_action(${literal(body.p_action)},${literal(JSON.stringify(body.p_input))}::jsonb)`,
      ),
    };
  if (url.pathname === "/rest/v1/rpc/llm_control")
    return {
      body: asUser(
        user,
        `select public.llm_control(${literal(JSON.stringify(body.p_input))}::jsonb,${literal(body.p_token)})`,
      ),
    };
  if (url.pathname === "/rest/v1/rpc/remote_tool_action")
    return {
      body: asUser(
        user,
        `select public.remote_tool_action(${literal(body.p_action)},${literal(JSON.stringify(body.p_input))}::jsonb)`,
      ),
    };
  if (url.pathname === "/rest/v1/rpc/board_profile_action")
    return {
      body: asUser(
        user,
        `select public.board_profile_action(${literal(body.p_action)},${literal(JSON.stringify(body.p_input))}::jsonb)`,
      ),
    };
  if (url.pathname === "/rest/v1/rpc/sync_action")
    return {
      body: asUser(
        user,
        `select public.sync_action(${literal(body.p_action)},${literal(JSON.stringify(body.p_input))}::jsonb)`,
      ),
    };
  if (url.pathname === "/rest/v1/rpc/presentation_action")
    return {
      body: asUser(
        user,
        `select public.presentation_action(${literal(body.p_action)},${literal(JSON.stringify(body.p_input))}::jsonb)`,
      ),
    };
  if (url.pathname === "/rest/v1/rpc/create_class_with_roster") {
    return {
      body: asUser(
        user,
        `select to_jsonb(public.create_class_with_roster(${literal(body.p_id)}::uuid,${literal(body.p_label)},${Number(body.p_grade)},${Number(body.p_count)},${literal(body.p_mode)}))`,
      ),
    };
  }
  const table = url.pathname.split("/").at(-1);
  if (!["classes", "students"].includes(table))
    return { status: 404, body: {} };
  const filterFields = ["id", "class_id", "runtime_mode", "revision"];
  const filters = filterFields.flatMap((field) => {
    const value = url.searchParams.get(field);
    return value?.startsWith("eq.")
      ? [`${field} = ${literal(value.slice(3))}`]
      : [];
  });
  const where = filters.length ? `where ${filters.join(" and ")}` : "";
  const columns = (url.searchParams.get("select") ?? "*").split(",");
  const allowed = new Set([
    "id",
    "label",
    "grade",
    "student_count",
    "runtime_mode",
    "revision",
    "class_id",
    "attendance_number",
    "active",
    "owner_id",
    "created_at",
  ]);
  if (columns.some((column) => !allowed.has(column)))
    return { status: 400, body: {} };
  let query;
  if (request.method === "GET")
    query = `select ${columns.join(",")} from public.${table} ${where} order by ${table === "students" ? "attendance_number" : "created_at"}`;
  else if (request.method === "PATCH" && table === "classes")
    query = `update public.classes set label=${literal(body.label)}, grade=${Number(body.grade)}, revision=${Number(body.revision)} ${where} returning ${columns.join(",")}`;
  else if (request.method === "DELETE" && table === "classes")
    query = `delete from public.classes ${where} returning ${columns.join(",")}`;
  else return { status: 405, body: {} };
  const rows = asUser(
    user,
    `with result as (${query}) select coalesce(jsonb_agg(to_jsonb(result)), '[]'::jsonb) from result`,
  );
  return {
    body: request.headers.accept?.includes("vnd.pgrst.object")
      ? (rows[0] ?? null)
      : rows,
  };
}

createServer(async (request, response) => {
  const url = new URL(request.url, "http://127.0.0.1:54325");
  let result = { status: 200, body: {} };
  try {
    let raw = "";
    for await (const chunk of request) raw += chunk;
    const body = raw ? JSON.parse(raw) : {};
    const bearer = request.headers.authorization?.replace(/^Bearer /, "");
    const user = tokens.get(bearer);
    if (url.pathname === "/health")
      result.body = { mode: "TEST_DOUBLE", database: "real PostgreSQL" };
    else if (url.pathname === "/__test/link") {
      const item = pending.get(url.searchParams.get("email"));
      if (!item) result = { status: 404, body: {} };
      else {
        const code = randomUUID();
        codes.set(code, item);
        pending.delete(item.email);
        result.body = { url: `${item.redirect}?code=${code}` };
      }
    } else if (url.pathname === "/auth/v1/otp") {
      pending.set(body.email, {
        email: body.email,
        challenge: body.code_challenge,
        redirect: url.searchParams.get("redirect_to"),
      });
    } else if (url.pathname === "/auth/v1/token") {
      if (url.searchParams.get("grant_type") === "password") {
        if (
          body.email !== "recording@qa.invalid" ||
          body.password !== "local-recording-test-password-only-2026"
        )
          throw new Error("invalid");
        const existing = sql(
          `select row_to_json(u) from auth.users u where id=${literal(SAMPLE_ID)}::uuid`,
        );
        if (!existing) throw new Error("unseeded");
        const sample = {
          ...JSON.parse(existing),
          aud: "authenticated",
          role: "authenticated",
          app_metadata: { provider: "email" },
          user_metadata: {},
        };
        users.set(sample.email, sample);
        result.body = session(sample);
      } else if (url.searchParams.get("grant_type") === "refresh_token") {
        const refreshUser = tokens.get(body.refresh_token);
        if (!refreshUser) throw new Error("invalid");
        tokens.delete(body.refresh_token);
        result.body = session(refreshUser);
      } else {
        const item = codes.get(body.auth_code);
        if (
          !item ||
          createHash("sha256")
            .update(body.code_verifier ?? "")
            .digest("base64url") !== item.challenge
        )
          throw new Error("invalid");
        codes.delete(body.auth_code);
        result.body = session(users.get(item.email) ?? newUser(item.email));
      }
    } else if (url.pathname === "/auth/v1/user")
      result = user
        ? { body: user }
        : { status: 401, body: { code: "bad_jwt", message: "invalid token" } };
    else if (url.pathname === "/auth/v1/signup")
      result.body = session(newUser(undefined, true));
    else if (url.pathname === "/auth/v1/logout") {
      if (url.searchParams.get("scope") === "local") {
        for (const token of sessionTokens.get(bearer) ?? []) {
          tokens.delete(token);
          sessionTokens.delete(token);
        }
      } else
        for (const [token, owner] of tokens)
          if (owner.id === user?.id) {
            tokens.delete(token);
            sessionTokens.delete(token);
          }
      result = { status: 204 };
    } else if (url.pathname.startsWith("/rest/v1/"))
      result = dataRequest(request, url, body, user);
    else result = { status: 404, body: {} };
  } catch {
    result = {
      status: 400,
      body: { code: "invalid_request", message: "test request rejected" },
    };
  }
  response.writeHead(result.status ?? 200, {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
  });
  response.end(result.status === 204 ? undefined : JSON.stringify(result.body));
}).listen(54325, "127.0.0.1", () =>
  console.log(
    "TEST provider on loopback 54325: Auth double, real PostgreSQL RLS.",
  ),
);
