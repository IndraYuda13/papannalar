import { describe, expect, it, vi } from "vitest";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
vi.mock("server-only", () => ({}));
import { diagnosticPolicy } from "../../src/server/llm/diagnostic";
import { legacyProfile } from "../../src/server/llm/profile";
const policy = {
  profile_id: legacyProfile.id,
  config_version: legacyProfile.configVersion,
  protocol: legacyProfile.protocol,
  requested_model: legacyProfile.model,
  price_version: "synthetic-price-v1",
  currency: "USD",
  pricing_date: "2026-01-01",
  configured_free: false,
  input_per_million_microusd: 1000000,
  output_per_million_microusd: 2000000,
  cache_read_per_million_microusd: 500000,
  cache_creation_per_million_microusd: 4000000,
  diagnostic_cap_microusd: 400000,
};
describe("operator diagnostic", () => {
  it("uses worst input price including cache creation, and an explicit total request cap", () => {
    expect(diagnosticPolicy(policy, legacyProfile, 3).ceiling).toBe(131200);
    expect(() =>
      diagnosticPolicy(
        { ...policy, diagnostic_cap_microusd: 393599 },
        legacyProfile,
        3,
      ),
    ).toThrow("DIAGNOSTIC_CAP_EXCEEDED");
  });
  it.each([
    { requested_model: "another-model" },
    { input_per_million_microusd: null },
    { configured_free: "true" },
    { configured_free: true },
    { input_per_million_microusd: 0 },
    { pricing_date: "2099-01-01" },
    { pricing_date: "2026-02-30" },
    { price_version: "" },
  ])(
    "fails closed for unknown, stale or mismatched price metadata: %j",
    (change) => {
      expect(() =>
        diagnosticPolicy({ ...policy, ...change }, legacyProfile, 1),
      ).toThrow();
    },
  );
  it("free requires explicit zero in all four categories and still bounds requests", () => {
    const free = {
      ...policy,
      configured_free: true,
      input_per_million_microusd: 0,
      output_per_million_microusd: 0,
      cache_read_per_million_microusd: 0,
      cache_creation_per_million_microusd: 0,
      diagnostic_cap_microusd: 0,
    };
    expect(diagnosticPolicy(free, legacyProfile, 1).ceiling).toBe(0);
    expect(() => diagnosticPolicy(free, legacyProfile, 4)).toThrow();
  });
  it("CLI defaults to inspection with no configured endpoint, requests, credentials or approval", async () => {
    const result = await promisify(execFile)(
      process.execPath,
      ["scripts/ai-diagnostic.mjs"],
      {
        env: { ...process.env, LLM_ENABLED: "false" },
        timeout: 15000,
      },
    );
    expect(JSON.parse(result.stdout)).toMatchObject({
      configuration: "disabled",
      requests: [],
      connectionTested: false,
      classroomApproval: false,
    });
    expect(result.stderr).toBe("");
  }, 20000);
});
