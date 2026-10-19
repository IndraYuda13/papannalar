// Loopback TEST DOUBLE for Supabase Auth/PostgREST HTTP, backed by REAL Postgres
// for data/RLS. Not a production service and never included in the Next app.
import { createServer } from "node:http";
import { createHash, randomUUID, randomBytes } from "node:crypto";
import { sql, literal, asUser } from "./postgres.mjs";
import { providerOrigin, providerPort } from "./ports.mjs";
import { SAMPLE_ID } from "../../scripts/sample-data.mjs";
import {
  internalTestAuth,
  passwordRate,
  credentials,
  registerPassword,
  loginPassword,
  enrollPassword,
  saveToken,
  readToken,
  revokeToken,
} from "./provider-password.mjs";

const pending = new Map(),
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
  const sessionId = randomUUID();
  saveToken(access_token, user, 3600, sessionId, "access");
  saveToken(refresh_token, user, 86400, sessionId, "refresh");

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
  if (url.pathname === "/rest/v1/rpc/password_auth_limit")
    return {
      body:
        sql(
          `select to_jsonb(public.password_auth_limit(${literal(body.p_email_hash)},${literal(body.p_ip_hash)}))`,
        ) === "true",
    };
  if (!user) return { status: 401, body: { message: "unauthorized" } };
  if (url.pathname === "/rest/v1/rpc/presentation_logout")
    return {
      body: asUser(
        user,
        `select public.presentation_logout(${body.p_controller_id ? literal(body.p_controller_id) + "::uuid" : "null"},${body.p_sample_controller ? literal(body.p_sample_controller) + "::uuid" : "null"})`,
      ),
    };
  const learningRpc = {
    "/rest/v1/rpc/library_action_v2": "library_action_v2",
    "/rest/v1/rpc/group_lesson_action": "group_lesson_action",
    "/rest/v1/rpc/group_board_action": "group_board_action",
    "/rest/v1/rpc/learning_results": "learning_results",
  }[url.pathname];
  if (learningRpc) {
    const extra =
      learningRpc === "group_board_action"
        ? `,${body.p_teacher_lesson ? literal(body.p_teacher_lesson) + "::uuid" : "null"}`
        : learningRpc === "learning_results"
          ? ""
          : `,${body.p_controller ? literal(body.p_controller) + "::uuid" : "null"}`;
    return {
      body: asUser(
        user,
        `select public.${learningRpc}(${literal(JSON.stringify(body.p_input))}::jsonb${extra})`,
      ),
    };
  }
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
  const url = new URL(request.url, providerOrigin);
  let result = { status: 200, body: {} };
  try {
    let raw = "";
    for await (const chunk of request) {
      raw += chunk;
      if (Buffer.byteLength(raw) > 524288) throw new Error("AUTH_FAILED");
    }
    const body = raw ? JSON.parse(raw) : {};
    const bearer = request.headers.authorization?.replace(/^Bearer /, "");
    const user = readToken(bearer, "access");
    if (url.pathname === "/health")
      result.body = { mode: "TEST_DOUBLE", database: "real PostgreSQL" };
    else if (url.pathname === "/__test/link") {
      if (!internalTestAuth()) throw new Error("AUTH_FAILED");
      const item = pending.get(url.searchParams.get("email"));
      if (!item) result = { status: 404, body: {} };
      else {
        const code = randomUUID();
        codes.set(code, item);
        pending.delete(item.email);
        result.body = { url: `${item.redirect}?code=${code}` };
      }
    } else if (url.pathname === "/auth/v1/otp") {
      if (!internalTestAuth()) throw new Error("AUTH_FAILED");
      pending.set(body.email, {
        email: body.email,
        challenge: body.code_challenge,
        redirect: url.searchParams.get("redirect_to"),
      });
    } else if (url.pathname === "/auth/v1/token") {
      if (url.searchParams.get("grant_type") === "password") {
        const input = credentials(body);
        passwordRate(input.email, request.socket.remoteAddress ?? "unknown");
        if (!(
          internalTestAuth() &&
          body.email === "recording@qa.invalid" &&
          body.password === "local-recording-test-password-only-2026"
        )) {
          result.body = session(loginPassword(input));
        } else {
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
          result.body = session(sample);
        }
      } else if (url.searchParams.get("grant_type") === "refresh_token") {
        const refreshUser = readToken(body.refresh_token, "refresh");
        if (!refreshUser) throw new Error("invalid");
        revokeToken(body.refresh_token);
        result.body = session(refreshUser);
      } else {
        if (!internalTestAuth()) throw new Error("AUTH_FAILED");
        const item = codes.get(body.auth_code);
        if (
          !item ||
          createHash("sha256")
            .update(body.code_verifier ?? "")
            .digest("base64url") !== item.challenge
        )
          throw new Error("invalid");
        codes.delete(body.auth_code);
        const existing = sql(
          `select jsonb_build_object('id',id,'email',email,'is_anonymous',is_anonymous) from auth.users where lower(btrim(email))=${literal(item.email.trim().toLowerCase())} limit 1`,
        );
        result.body = session(
          existing ? JSON.parse(existing) : newUser(item.email),
        );
      }
    } else if (url.pathname === "/auth/v1/user" && request.method === "PUT") {
      if (Object.keys(body).some((k) => k !== "password"))
        throw new Error("AUTH_FAILED");
      passwordRate(
        user?.email ?? "",
        request.socket.remoteAddress ?? "unknown",
      );
      result.body = enrollPassword(user, body.password);
    } else if (url.pathname === "/auth/v1/user")
      result = user
        ? { body: user }
        : { status: 401, body: { code: "bad_jwt", message: "invalid token" } };
    else if (url.pathname === "/auth/v1/signup") {
      if (body.email || body.password) {
        const input = credentials(body);
        passwordRate(input.email, request.socket.remoteAddress ?? "unknown");
        result.body = session(registerPassword(input));
      } else result.body = session(newUser(undefined, true));
    } else if (url.pathname === "/auth/v1/logout") {
      revokeToken(bearer, url.searchParams.get("scope") !== "local");
      result = { status: 204 };
    } else if (url.pathname.startsWith("/rest/v1/"))
      result = dataRequest(request, url, body, user);
    else result = { status: 404, body: {} };
  } catch (error) {
    result = {
      status:
        error instanceof Error && error.message === "RATE_LIMITED" ? 429 : 400,
      body: { code: "invalid_credentials", message: "Authentication failed" },
    };
  }
  response.writeHead(result.status ?? 200, {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
  });
  response.end(result.status === 204 ? undefined : JSON.stringify(result.body));
}).listen(providerPort, "127.0.0.1", () =>
  console.log(
    `TEST provider on loopback ${providerPort}: Auth double, real PostgreSQL RLS.`,
  ),
);
