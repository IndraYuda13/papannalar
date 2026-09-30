import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import type { ContentApproval } from "../../src/server/llm/reviews";
vi.mock("server-only", () => ({}));
const state = vi.hoisted(() => ({
  approvals: [] as ContentApproval[],
  configuration: vi.fn(),
  history: vi.fn(),
  store: { reserve: vi.fn(), complete: vi.fn() },
  log: vi.fn(),
}));
vi.mock("../../src/server/auth/client", () => ({
  authContext: () => ({
    client: {},
    finish: (response: NextResponse) => response,
  }),
  requireTeacher: async () => ({ id: "UNIT-ONLY" }),
}));
vi.mock("../../src/server/classes", () => ({
  classDetail: async () => ({ class: { grade: 7 } }),
}));
vi.mock("../../src/server/sync", () => ({ readSync: state.history }));
vi.mock("../../src/server/llm/config", () => ({
  llmConfiguration: state.configuration,
}));
vi.mock("../../src/server/llm/store", () => ({
  usageStore: () => state.store,
  logUsage: state.log,
  llmRpc: vi.fn(),
}));
vi.mock("../../src/server/llm/reviews", async (original) => ({
  ...(await original<typeof import("../../src/server/llm/reviews")>()),
  CONTENT_APPROVALS: state.approvals,
}));
import { enrichmentRequest, bisikRequest } from "../../src/server/llm/routes";
import { AnthropicProvider, LLM_MODEL } from "../../src/server/llm/provider";
import { templateFor } from "../../src/content/templates/registry";
import {
  storyFrameHash,
  STORY_FRAMES,
} from "../../src/content/contexts/story-frames";
import { getStrategy } from "../../src/content/strategies/registry";
import { buildPackage } from "../../src/core/package/build";
import { toPackageRecipe } from "../../src/contracts/sync-package";
const classId = "13000000-0000-4000-8000-000000000005",
  sessionId = "13000000-0000-4000-8000-000000000006";
const pkg = buildPackage({
  id: "13000000-0000-4000-8000-000000000009",
  classId,
  grade: 7,
  variant: "weekly",
  seed: 33,
  occupied: [{ kind: "step", stepId: "D1" }],
});
const ask = {
  requestId: "13000000-0000-4000-8000-000000000010",
  classId,
  sessionId,
  code: "D1.2",
};
const request = (path: string, data: unknown) =>
  new NextRequest(`http://127.0.0.1:3100/api/v1/llm/${path}`, {
    method: "POST",
    headers: {
      Origin: "http://127.0.0.1:3100",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
function providerWith(raw: unknown, status = 200) {
  const wire = vi.fn<typeof fetch>().mockResolvedValue(
    new Response(
      JSON.stringify({
        model: LLM_MODEL,
        stop_reason: "end_turn",
        content: [{ type: "text", text: JSON.stringify(raw) }],
        usage: { input_tokens: 40, output_tokens: 20 },
      }),
      { status },
    ),
  );
  state.configuration.mockReturnValue({
    enabled: true,
    freeText: false,
    provider: new AnthropicProvider("UNIT-NOT-A-KEY", wire),
  });
  return wire;
}
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("APP_ORIGIN", "http://127.0.0.1:3100");
  state.approvals.splice(0);
  state.store.reserve.mockResolvedValue({ allowed: true, reason: "none" });
  state.store.complete.mockResolvedValue(undefined);
  state.history.mockResolvedValue({
    records: [
      { sessionId, payload: { package: { id: "other-owned-package" } } },
    ],
  });
});
function approve() {
  for (const [id, hash] of [
    ["lift-down-v1", storyFrameHash("lift-down-v1")],
    [templateFor("D1").id, templateFor("D1").metadata.contentHash],
    ["D1.2", getStrategy("D1.2").metadata.contentHash],
  ])
    state.approvals.push({
      id,
      contentHash: hash,
      reviewer: "UNIT-TEST-ONLY",
      reviewedAt: "2026-09-30",
    });
}
describe("LLM endpoint orchestration with explicitly fake provider/auth/ledger", () => {
  it("missing human manifest returns actual static card without spending", async () => {
    const wire = providerWith({});
    const response = await bisikRequest(request("bisik", ask));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      status: "static",
      reason: "unreviewed",
      sourceStrategyIds: ["D1.2"],
    });
    expect(wire).not.toHaveBeenCalled();
    expect(state.store.reserve).not.toHaveBeenCalled();
  });
  it("server rebuilds recipe and supplies only anonymous approved slots to provider", async () => {
    approve();
    const wire = providerWith({
      status: "ok",
      stories: [
        { slotId: "slot-0", segments: [STORY_FRAMES["lift-down-v1"][0]] },
      ],
    });
    const response = await enrichmentRequest(
      request("enrich", {
        requestId: ask.requestId,
        recipe: toPackageRecipe(pkg),
      }),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      status: "ai",
      packageId: pkg.id,
      stories: [{ choice: { frameId: "lift-down-v1", variant: 0 } }],
    });
    expect(wire).toHaveBeenCalledTimes(1);
    const body = String(wire.mock.calls[0][1]?.body);
    expect(body).not.toContain(classId);
    expect(body).not.toContain(pkg.id);
    expect(body).not.toContain("answerKey");
    expect(state.store.complete).toHaveBeenCalledTimes(1);
  });
  it("frozen canonical package is refused before provider or ledger", async () => {
    approve();
    const wire = providerWith({});
    state.history.mockResolvedValue({
      records: [{ sessionId, payload: { package: { id: pkg.id } } }],
    });
    const response = await enrichmentRequest(
      request("enrich", {
        requestId: ask.requestId,
        recipe: toPackageRecipe(pkg),
      }),
    );
    expect(await response.json()).toMatchObject({
      status: "static",
      reason: "frozen",
      stories: [],
    });
    expect(wire).not.toHaveBeenCalled();
  });
  it("numeric/semantic injection is discarded by full story endpoint", async () => {
    approve();
    providerWith({
      status: "ok",
      stories: [
        {
          slotId: "slot-0",
          segments: [STORY_FRAMES["lift-down-v1"][0].replace("turun", "naik")],
        },
      ],
    });
    const response = await enrichmentRequest(
      request("enrich", {
        requestId: ask.requestId,
        recipe: toPackageRecipe(pkg),
      }),
    );
    expect(await response.json()).toMatchObject({
      status: "static",
      reason: "invalid",
      stories: [],
    });
  });
  it.each(["valid", "bad-json", "too-long", "provider-error"])(
    "Bisik %s returns validated advice or static fallback, never provider raw error",
    async (variant) => {
      approve();
      const reply =
        variant === "bad-json"
          ? "NOT AN OBJECT"
          : {
              answer:
                variant === "too-long"
                  ? Array(81).fill("guru").join(" ")
                  : "Minta siswa menunjukkan posisi awal dan arah lompatan.",
              sourceStrategyIds: ["D1.2"],
            };
      const wire = providerWith(
        reply,
        variant === "provider-error" ? 503 : 200,
      );
      const response = await bisikRequest(request("bisik", ask)),
        body = await response.json();
      expect(body.status).toBe(variant === "valid" ? "ai" : "static");
      expect(body.sourceStrategyIds).toEqual(["D1.2"]);
      expect(body.answer.split(/\s+/).length).toBeLessThanOrEqual(80);
      expect(wire).toHaveBeenCalledTimes(1);
      expect(JSON.stringify(state.log.mock.calls)).not.toContain("Minta siswa");
    },
  );
  it("free-text gate overrides provider enablement and reviewed strategy", async () => {
    approve();
    const wire = providerWith({});
    const response = await bisikRequest(
      request("bisik", { ...ask, question: "Mengapa −3 − 5 = −8?" }),
    );
    expect(await response.json()).toMatchObject({
      status: "static",
      reason: "privacy",
    });
    expect(wire).not.toHaveBeenCalled();
  });
});
