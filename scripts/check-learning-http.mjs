import { createHash, randomUUID } from "node:crypto";
import { createServerClient } from "@supabase/ssr";
import {
  verifyDiagnosticDatabase,
  writeDiagnostic,
} from "./learning-diagnostics.mjs";
import {
  appOrigin as app,
  providerOrigin as provider,
} from "../tests/harness/ports.mjs";
verifyDiagnosticDatabase();
if (
  !process.env.PNL_APP_PORT ||
  !process.env.PNL_PROVIDER_PORT ||
  process.env.PNL_APP_PORT === "3100" ||
  process.env.PNL_PROVIDER_PORT === "54325"
)
  throw new Error("Explicit nonlive app/provider ports required");
const verifier = randomUUID();
const email = `backend-${randomUUID()}@qa.invalid`;
const headers = { "Content-Type": "application/json" };
await fetch(
  `${provider}/auth/v1/otp?redirect_to=${encodeURIComponent(app + "/auth/callback")}`,
  {
    method: "POST",
    headers,
    body: JSON.stringify({
      email,
      code_challenge: createHash("sha256").update(verifier).digest("base64url"),
    }),
  },
);
const link = await (
  await fetch(`${provider}/__test/link?email=${encodeURIComponent(email)}`)
).json();
const code = new URL(link.url).searchParams.get("code");
const session = await (
  await fetch(`${provider}/auth/v1/token?grant_type=pkce`, {
    method: "POST",
    headers,
    body: JSON.stringify({ auth_code: code, code_verifier: verifier }),
  })
).json();
const cookies = new Map();
const auth = createServerClient(provider, "local-test-publishable-key", {
  cookieOptions: {
    name: "pn-teacher-auth",
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: false,
  },
  cookies: {
    getAll: () => [...cookies].map(([name, value]) => ({ name, value })),
    setAll: (values) => values.forEach((c) => cookies.set(c.name, c.value)),
  },
});
const set = await auth.auth.setSession(session);
if (set.error) throw set.error;
let assertions = 0;
async function call(path, data) {
  const response = await fetch(app + path, {
    method: "POST",
    headers: {
      ...headers,
      Origin: app,
      Cookie: [...cookies].map(([k, v]) => `${k}=${v}`).join("; "),
    },
    body: JSON.stringify(data),
  });
  const value = await response.json();
  if (!response.ok)
    throw new Error(`${path} HTTP${response.status} ${JSON.stringify(value)}`);
  assertions++;
  return value;
}
const classId = randomUUID(),
  collectionId = randomUUID(),
  runId = randomUUID(),
  lessonId = randomUUID();
await call("/api/v1/classes", {
  id: classId,
  label: "Backend HTTP fixture",
  grade: 7,
  count: 4,
  mode: "pilot",
});
await call("/api/v1/library", {
  contractVersion: 2,
  action: "save",
  id: collectionId,
  revision: 0,
  ready: true,
  document: {
    title: "Bilangan",
    kind: "cards",
    items: [
      {
        id: randomUUID(),
        kind: "card",
        prompt: "2+3",
        options: ["5", "4", "3", "2"],
        key: "A",
        explanation: "",
      },
    ],
  },
  mapping: { default: null, overrides: [] },
});
const run = await call("/api/v1/library", {
  contractVersion: 2,
  action: "start",
  id: runId,
  classId,
  collectionId,
  version: 1,
  date: "2026-10-13",
  mode: "teach",
  responseMethod: "none",
});
await call("/api/v1/library", {
  contractVersion: 2,
  action: "close",
  id: run.id,
  revision: run.revision,
});
const lesson = await call("/api/v1/group-lessons", {
  action: "prepare",
  id: lessonId,
  classId,
  date: "2026-10-13",
  competency: null,
  absentStudentIds: [],
  groupCount: 2,
  seed: randomUUID(),
  source: "random",
});
const saved = await call("/api/v1/group-lessons", {
  action: "save",
  id: lessonId,
  revision: lesson.revision,
  seed: lesson.seed,
  groupingSource: "random",
  groups: lesson.groups,
  assignments: lesson.groups.map((g, i) => ({
    id: randomUUID(),
    groupId: g.id,
    method: i === 0 ? "cards" : "teacher",
    collectionId,
    version: 1,
  })),
});
const printSnapshot = await call("/api/v1/library", {
  contractVersion: 2,
  action: "detail",
  id: saved.assignments[0].runId,
});
if (printSnapshot.run.formId !== saved.assignments[0].formId)
  throw new Error("draft binding mismatch");
assertions++;
const begun = await call("/api/v1/group-lessons", {
  action: "begin",
  id: lessonId,
  revision: saved.revision,
});
await call("/api/v1/group-lessons", {
  action: "close",
  id: lessonId,
  revision: begun.revision,
});
const cards = saved.assignments.find((a) => a.method === "cards");
const response = {
  contractVersion: 2,
  action: "response",
  id: cards.runId,
  formId: cards.formId,
  version: 1,
  pageIndex: 0,
  studentId: cards.roster[0].id,
  revision: 0,
  source: "manual",
  status: "received",
  answers: ["A"],
  answerStates: ["answered"],
};
const receipt = await call("/api/v1/library", response);
await call("/api/v1/library", response);
if (receipt.responses[0].revision !== 1) throw new Error("duplicate revised");
assertions++;
const results = await call("/api/v1/results", { action: "list", classId });
if (results.entries.length !== 2)
  throw new Error("missing/duplicate root results");
assertions++;
const detail = await call("/api/v1/results", {
  action: "detail",
  source: "group_lesson",
  id: lessonId,
});
if (detail.lesson.status !== "closed" || detail.runs.length !== 2)
  throw new Error("wrong group result");
assertions++;
const report = {
  claim_type: "OBSERVATION",
  verification_status: "VERIFIED",
  app,
  provider,
  assertions,
  flow: "teacher auth -> collection -> none close -> group draft print binding -> begin -> close -> late card idempotency -> result index/detail",
  limits:
    "synthetic Auth/PostgREST adapter backed by isolated real PostgreSQL, not hosted Supabase/physical device certification",
};
await writeDiagnostic("backend-http.json", report);
console.log(JSON.stringify(report));
