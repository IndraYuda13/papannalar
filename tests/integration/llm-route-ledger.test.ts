import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { createServer, type Server } from "node:http";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { NextRequest, NextResponse } from "next/server";
import type { ContentApproval } from "../../src/server/llm/reviews";
vi.mock("server-only", () => ({}));
const state = vi.hoisted(() => ({
  configuration: vi.fn(),
  approvals: [] as ContentApproval[],
  client: { rpc: vi.fn() },
}));
vi.mock("../../src/server/auth/client", () => ({
  authContext: () => ({
    client: state.client,
    finish: (response: NextResponse) => response,
  }),
  requireTeacher: async () => ({ id: "39000000-0000-4000-8000-000000000001" }),
}));
vi.mock("../../src/server/classes", () => ({
  classDetail: async () => ({ class: { grade: 7 } }),
}));
vi.mock("../../src/server/sync", () => ({
  readSync: async () => ({
    records: [
      {
        sessionId: "39000000-0000-4000-8000-000000000006",
        payload: { package: { id: "other-owned-package" } },
      },
    ],
  }),
}));
vi.mock("../../src/server/llm/config", () => ({
  llmConfiguration: state.configuration,
}));
vi.mock("../../src/server/llm/reviews", async (original) => ({
  ...(await original<typeof import("../../src/server/llm/reviews")>()),
  CONTENT_APPROVALS: state.approvals,
}));
// Auth/content manifests are explicitly synthetic test hooks. Routes, native
// adapters, HTTP transport, domain validators, UsageStore and PostgreSQL RPC are real.
import { asUser, databaseUrl, literal, sql } from "../harness/postgres.mjs";
import {
  bisikRequest,
  enrichmentRequest,
  llmStatus,
} from "../../src/server/llm/routes";
import { createTeachingProvider } from "../../src/server/llm/provider";
import { legacyProfile, type AIProfile } from "../../src/server/llm/profile";
import { templateFor } from "../../src/content/templates/registry";
import { storyFrameHash } from "../../src/content/contexts/story-frames";
import { getStrategy } from "../../src/content/strategies/registry";
import { buildPackage } from "../../src/core/package/build";
import { toPackageRecipe } from "../../src/contracts/sync-package";
import { enrichResponseSchema } from "../../src/contracts/bisik";
import { applyPackageStories } from "../../src/core/package/enrichment";
const owner = "39000000-0000-4000-8000-000000000001",
  classId = "39000000-0000-4000-8000-000000000005",
  sessionId = "39000000-0000-4000-8000-000000000006",
  gateway = "SYNTHETIC-INTEGRATION-GATEWAY-NOT-A-CREDENTIAL";
let policyBefore: string;
let server: Server,
  origin: string,
  missingUsage = false,
  responseStatus = 200,
  protocol: AIProfile["protocol"];
const bodies: string[] = [];
const answer = {
  answer: "Tanyakan arah lompatan dan minta siswa menunjukkan titik awal.",
  sourceStrategyIds: ["D1.2"],
};
beforeAll(async () => {
  policyBefore = sql(
    "select to_jsonb(p)::text from pn_private.llm_policy p where id",
  );
  sql(
    `delete from public.classes where id='${classId}' and owner_id='${owner}'; delete from pn_private.deleted_classes where owner_id='${owner}'; delete from pn_private.sync_receipts where owner_id='${owner}'; delete from auth.users where id='${owner}' and email='ai-integration@qa.invalid'; delete from pn_private.llm_profiles where profile_id like 'integration-%';`,
  );
  server = createServer(async (request, response) => {
    let body = "";
    for await (const chunk of request) body += String(chunk);
    bodies.push(body);
    const data = JSON.parse(body),
      content = JSON.parse(data.messages.at(-1).content);
    const value = content.slots
      ? {
          status: "ok",
          stories: [
            { slotId: "slot-0", segments: [content.slots[0].choices[0]] },
          ],
        }
      : answer;
    response.writeHead(responseStatus, { "Content-Type": "application/json" });
    const envelope =
      protocol === "openai-chat-completions"
        ? {
            model: "fixture-reported-snapshot",
            choices: [
              {
                finish_reason: "stop",
                message: { content: JSON.stringify(value) },
              },
            ],
            ...(!missingUsage && {
              usage: { prompt_tokens: 40, completion_tokens: 20 },
            }),
          }
        : {
            model: "fixture-reported-snapshot",
            stop_reason: "end_turn",
            content: [{ type: "text", text: JSON.stringify(value) }],
            ...(!missingUsage && {
              usage: { input_tokens: 40, output_tokens: 20 },
            }),
          };
    response.end(JSON.stringify(envelope));
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error();
  origin = `http://127.0.0.1:${address.port}`;
});
beforeEach(() => {
  vi.stubEnv("APP_ORIGIN", "http://127.0.0.1:3100");
  vi.stubEnv("LLM_GATEWAY_TOKEN", gateway);
  vi.spyOn(console, "info").mockImplementation(() => {});
  bodies.length = 0;
  missingUsage = false;
  responseStatus = 200;
  state.approvals.splice(0);
  sql(`update pn_private.llm_policy set enabled=true,cap_microusd=1000000000,gateway_hash=encode(sha256(convert_to('${gateway}','UTF8')),'hex');
  insert into auth.users(id,email,is_anonymous) values('${owner}','ai-integration@qa.invalid',false);
  insert into public.classes(id,owner_id,label,grade,student_count,runtime_mode) values('${classId}','${owner}','7V',7,3,'demo');
  insert into pn_private.sync_sessions(id,owner_id,class_id,ordinal,revision,device_id,payload) values('${sessionId}','${owner}','${classId}',1,1,'39000000-0000-4000-8000-000000000008','{"package":{"id":"other-owned-package"}}');
  insert into pn_private.llm_accounts(owner_id,cap_microusd) values('${owner}',1000000000);`);
  state.client.rpc.mockImplementation(
    (_name: string, args: { p_input: unknown; p_token: string }) => ({
      abortSignal: async (signal: AbortSignal) => {
        signal.throwIfAborted();
        return {
          data: asUser(
            { id: owner, is_anonymous: false },
            `select public.llm_control(${literal(JSON.stringify(args.p_input))}::jsonb,${literal(args.p_token)})`,
          ),
          error: null,
        };
      },
    }),
  );
});
afterEach(() => {
  sql(
    `delete from public.classes where id='${classId}' and owner_id='${owner}'; delete from pn_private.deleted_classes where owner_id='${owner}'; delete from pn_private.sync_receipts where owner_id='${owner}'; delete from auth.users where id='${owner}' and email='ai-integration@qa.invalid'; delete from pn_private.llm_profiles where profile_id like 'integration-%';`,
  );
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});
afterAll(async () => {
  sql(
    `update pn_private.llm_policy set (enabled,gateway_hash,cap_microusd,spent_microusd)=(select p.enabled,p.gateway_hash,p.cap_microusd,p.spent_microusd from jsonb_populate_record(null::pn_private.llm_policy,${literal(policyBefore)}::jsonb) p) where id;`,
  );
  if (server) {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
function configure(selected: AIProfile["protocol"]) {
  protocol = selected;
  const profile: AIProfile = {
    ...legacyProfile,
    id: `integration-${selected === "anthropic-messages" ? "anthropic" : "openai"}`,
    configVersion: "test-v2",
    protocol: selected,
    model: "fixture-requested-alias",
    baseUrl: `${origin}/v1`,
    allowedOrigins: [origin],
    allowLocalDev: true,
    authScheme: selected === "anthropic-messages" ? "x-api-key" : "bearer",
    maxOutputTokens: 2048,
  };
  sql(`insert into pn_private.llm_profiles(profile_id,config_version,protocol,requested_model,enabled,price_version,pricing_date,input_per_million_microusd,output_per_million_microusd,cache_read_per_million_microusd,cache_creation_per_million_microusd,max_input_tokens,max_output_tokens,cap_microusd,request_cap,token_cap)
  values('${profile.id}','test-v2','${selected}','fixture-requested-alias',true,'test-price',current_date,1000000,5000000,1000000,1000000,32768,2048,1000000000,10,1000000);`);
  state.configuration.mockReturnValue({
    enabled: true,
    freeText: false,
    configuration: "valid",
    provider: createTeachingProvider(
      profile,
      "SYNTHETIC-PROVIDER-NOT-A-CREDENTIAL",
    ),
  });
  return profile;
}
function approve() {
  for (const [id, hash] of [
    ["D1.2", getStrategy("D1.2").metadata.contentHash],
    ["lift-down-v1", storyFrameHash("lift-down-v1")],
    ["temperature-drop-v1", storyFrameHash("temperature-drop-v1")],
    [templateFor("D1").id, templateFor("D1").metadata.contentHash],
  ])
    state.approvals.push({
      id,
      contentHash: hash,
      reviewer: "SYNTHETIC-INTEGRATION-ONLY",
      reviewedAt: "2026-10-02",
    });
}
function request(path: string, data: unknown) {
  return new NextRequest(`http://127.0.0.1:3100/api/v1/llm/${path}`, {
    method: "POST",
    headers: {
      Origin: "http://127.0.0.1:3100",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
}
const ask = () => ({
  requestId: crypto.randomUUID(),
  classId,
  sessionId,
  code: "D1.2",
});
for (const selected of [
  "openai-chat-completions",
  "anthropic-messages",
] as const)
  describe(`${selected} route → HTTP fixture → PostgreSQL ledger`, () => {
    it.each([false, true])(
      "Bisik/enrichment ledger and idempotency are identical with sample account=%s",
      async (sample) => {
        if (sample) vi.stubEnv("SAMPLE_TEACHER_ID", owner);
        const profile = configure(selected);
        approve();
        const status = await llmStatus(
          new NextRequest("http://127.0.0.1:3100/api/v1/llm/status"),
        );
        expect(await status.json()).toMatchObject({
          configured: true,
          budgetEnabled: true,
        });
        const input = ask(),
          first = await bisikRequest(request("bisik", input));
        expect(await first.json()).toMatchObject({ status: "ai", ...answer });
        const replay = await bisikRequest(request("bisik", input));
        expect(await replay.json()).toMatchObject({
          status: "static",
          reason: "active",
        });
        const pkg = buildPackage({
          id: crypto.randomUUID(),
          classId,
          grade: 7,
          variant: "weekly",
          seed: 33,
          occupied: [{ kind: "step", stepId: "D1" }],
        });
        const enriched = enrichResponseSchema.parse(
          await (
            await enrichmentRequest(
              request("enrich", {
                requestId: crypto.randomUUID(),
                recipe: toPackageRecipe(pkg),
                stepId: "D1",
                context: sample ? "temperature-drop-v1" : "lift-down-v1",
              }),
            )
          ).json(),
        );
        expect(enriched).toMatchObject({
          status: "ai",
          stories: [
            {
              choice: {
                frameId: sample ? "temperature-drop-v1" : "lift-down-v1",
                variant: 0,
              },
            },
          ],
        });
        const saved = toPackageRecipe(
          applyPackageStories(pkg, enriched.revision, enriched.stories),
        );
        const schemaPath = "{properties,payload,anyOf,0,properties,package}";
        const checkRecipe = (value: unknown) =>
          sql(
            `select pn_private.matches_sync_schema((select body#>'${schemaPath}' from pn_private.sync_schemas where id='mutation-v1'), '${JSON.stringify(value).replaceAll("'", "''")}'::jsonb)`,
          );
        expect(checkRecipe(saved)).toBe("t");
        expect(
          checkRecipe(
            JSON.parse(
              JSON.stringify(saved).replace(
                /temperature-drop-v1|lift-down-v1/g,
                "unapproved-unknown-frame",
              ),
            ),
          ),
        ).toBe("f");
        const rows = JSON.parse(
          sql(
            `select jsonb_agg(jsonb_build_object('usage',usage,'snapshot',profile_snapshot)) from pn_private.llm_usage where owner_id='${owner}'`,
          ),
        );
        expect(rows).toHaveLength(2);
        for (const row of rows)
          expect(row).toMatchObject({
            usage: {
              profileId: profile.id,
              protocol: selected,
              requestedModel: profile.model,
              reportedModel: "fixture-reported-snapshot",
              configVersion: "test-v2",
              priceVersion: "test-price",
              usageKnown: true,
            },
            snapshot: { maxOutputTokens: 2048 },
          });
        expect(bodies).toHaveLength(2);
        expect(bodies.join("")).not.toMatch(
          new RegExp(`${owner}|${classId}|${sessionId}|answerKey|photo|ink`),
        );
      },
    );
    it("unknown counters retain charged reserve and stages remain honest", async () => {
      configure(selected);
      approve();
      missingUsage = true;
      expect(
        await (await bisikRequest(request("bisik", ask()))).json(),
      ).toMatchObject({ status: "ai" });
      const row = JSON.parse(
        sql(
          `select jsonb_build_object('usage',usage,'cost',reserved_microusd) from pn_private.llm_usage where owner_id='${owner}'`,
        ),
      );
      expect(row.usage).toMatchObject({
        inputTokens: null,
        outputTokens: null,
        usageKnown: false,
      });
      expect(row.cost).toBeGreaterThan(0);
      const result = await llmStatus(
        new NextRequest("http://127.0.0.1:3100/api/v1/llm/status"),
      );
      expect(await result.json()).toMatchObject({
        configured: true,
        connectionTested: false,
        contentEligible: true,
        privacyReviewed: false,
        budgetEnabled: true,
      });
    });
    it("review and strict input gates never call HTTP, 429 closes rate receipt with static card", async () => {
      configure(selected);
      state.approvals.push({
        id: "D1.2",
        contentHash: "stale-review-hash",
        reviewer: "Synthetic fixture",
        reviewedAt: "2026-01-01",
      });
      expect(
        await (
          await llmStatus(
            new NextRequest("http://127.0.0.1:3100/api/v1/llm/status"),
          )
        ).json(),
      ).toMatchObject({
        configured: true,
        contentEligible: false,
        connectionTested: false,
      });
      expect(
        await (await bisikRequest(request("bisik", ask()))).json(),
      ).toMatchObject({ status: "static", reason: "unreviewed" });
      expect(
        (
          await bisikRequest(
            request("bisik", { ...ask(), studentName: "LOCAL-CANARY" }),
          )
        ).status,
      ).toBe(422);
      expect(bodies).toHaveLength(0);
      approve();
      responseStatus = 429;
      expect(
        await (await bisikRequest(request("bisik", ask()))).json(),
      ).toMatchObject({ status: "static", reason: "rate" });
      expect(
        JSON.parse(
          sql(
            `select usage from pn_private.llm_usage where owner_id='${owner}'`,
          ),
        ),
      ).toMatchObject({
        fallback: "rate",
        errorCategory: "rate",
        inputTokens: null,
      });
    });
  });
it("concurrent PostgreSQL sessions cannot exceed one profile request reservation", async () => {
  const profile = configure("openai-chat-completions");
  sql(
    `update pn_private.llm_profiles set request_cap=1 where profile_id='${profile.id}';`,
  );
  const run = promisify(execFile),
    claims = JSON.stringify({ sub: owner, is_anonymous: false });
  const reserve = () => ({
    action: "reserve",
    schemaVersion: 2,
    requestId: crypto.randomUUID(),
    classId,
    scopeId: crypto.randomUUID(),
    feature: "enrichment",
    profile: {
      profileId: profile.id,
      configVersion: profile.configVersion,
      protocol: profile.protocol,
      requestedModel: profile.model,
      maxInputTokens: profile.maxInputTokens,
      maxOutputTokens: profile.maxOutputTokens,
    },
  });
  const results = await Promise.all(
    [reserve(), reserve()].map((input) =>
      run(process.env["PSQL_BIN"] ?? "psql", [
        databaseUrl,
        "-X",
        "-qAt",
        "-v",
        "ON_ERROR_STOP=1",
        "-c",
        `begin;set local role authenticated;set local request.jwt.claims=${literal(claims)};select public.llm_control(${literal(JSON.stringify(input))}::jsonb,${literal(gateway)});commit;`,
      ]),
    ),
  );
  const values = results.map((r) => JSON.parse(r.stdout.trim()));
  expect(values.filter((r) => r.allowed)).toHaveLength(1);
  expect(values.filter((r) => r.reason === "budget")).toHaveLength(1);
  expect(
    sql(
      `select requests_reserved from pn_private.llm_profiles where profile_id='${profile.id}'`,
    ),
  ).toBe("1");
});
