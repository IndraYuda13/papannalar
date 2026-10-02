import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { createServer, type Server } from "node:http";
vi.mock("server-only", () => ({}));
import {
  readAIProfile,
  legacyProfile,
  providerEndpoint,
  type AIProfile,
} from "../../src/server/llm/profile";
import { createTeachingProvider } from "../../src/server/llm/provider";
import {
  parseProviderReply,
  wireRequest,
  MAX_RESPONSE_BYTES,
} from "../../src/server/llm/wire";
import { llmConfiguration } from "../../src/server/llm/config";
const KEY = "SYNTHETIC-FIXTURE-NOT-A-CREDENTIAL";
const answer = {
  answer: "Tanyakan arah lompatan kepada siswa.",
  sourceStrategyIds: ["D1.2"],
};
const input = {
  question: "Sesuaikan saran.",
  strategies: [
    {
      code: "D1.2",
      prompts: ["Mulai di mana?"],
      demonstrate: "Gunakan garis bilangan.",
    },
  ],
  studentName: "LOCAL-CANARY",
  photo: "PRIVATE",
  ink: "PRIVATE",
};
let server: Server,
  origin: string,
  status = 200,
  raw: unknown,
  hanging = false;
const calls: {
  path: string;
  headers: Record<string, string | string[] | undefined>;
  data: Record<string, unknown>;
}[] = [];
beforeAll(async () => {
  server = createServer(async (request, response) => {
    let body = "";
    for await (const chunk of request) body += String(chunk);
    calls.push({
      path: request.url!,
      headers: request.headers,
      data: JSON.parse(body),
    });
    if (hanging) return;
    response.writeHead(status, { "Content-Type": "application/json" });
    response.end(typeof raw === "string" ? raw : JSON.stringify(raw));
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error();
  origin = `http://127.0.0.1:${address.port}`;
});
afterEach(() => {
  vi.unstubAllEnvs();
  calls.length = 0;
  hanging = false;
  status = 200;
});
afterAll(async () => {
  server.closeAllConnections();
  await new Promise<void>((resolve) => server.close(() => resolve()));
});
const profile = (protocol: AIProfile["protocol"]): AIProfile => ({
  ...legacyProfile,
  id: "fixture",
  configVersion: "v2",
  protocol,
  model: "configured-model",
  baseUrl: `${origin}/gateway/v1/`,
  allowedOrigins: [origin],
  allowLocalDev: true,
  authScheme: protocol === "anthropic-messages" ? "x-api-key" : "bearer",
});
function envelope(protocol: AIProfile["protocol"], content: unknown = answer) {
  return protocol === "anthropic-messages"
    ? {
        model: "reported-snapshot-20261001",
        stop_reason: "end_turn",
        content: [
          { type: "thinking", thinking: "DO-NOT-PERSIST-THINKING" },
          { type: "text", text: JSON.stringify(content).slice(0, 12) },
          { type: "text", text: JSON.stringify(content).slice(12) },
        ],
        usage: {
          input_tokens: 20,
          output_tokens: 10,
          cache_read_input_tokens: 12,
          cache_creation_input_tokens: 3,
        },
      }
    : {
        model: "reported-snapshot-20261001",
        choices: [
          {
            finish_reason: "stop",
            message: { content: JSON.stringify(content) },
          },
        ],
        usage: {
          prompt_tokens: 20,
          completion_tokens: 10,
          prompt_tokens_details: { cached_tokens: 12 },
        },
      };
}
for (const protocol of [
  "openai-chat-completions",
  "anthropic-messages",
] as const)
  describe(protocol, () => {
    it("calls native HTTP path once, drops private extras, accepts aliases and records usage categories", async () => {
      raw = envelope(protocol);
      const reply = await createTeachingProvider(
        profile(protocol),
        KEY,
      ).askBisik(input, new AbortController().signal);
      expect(reply).toMatchObject({
        value: answer,
        requestedModel: "configured-model",
        reportedModel: "reported-snapshot-20261001",
        profileId: "fixture",
        protocol,
        inputTokens: 20,
        outputTokens: 10,
        usageKnown: true,
        cacheReadInputTokens: 12,
      });
      expect(reply.cacheCreationInputTokens).toBe(
        protocol === "anthropic-messages" ? 3 : null,
      );
      expect(JSON.stringify(reply)).not.toMatch(
        /DO-NOT-PERSIST|LOCAL-CANARY|PRIVATE/,
      );
      expect(calls).toHaveLength(1);
      expect(calls[0].path).toBe(
        `/gateway/v1/${protocol === "anthropic-messages" ? "messages" : "chat/completions"}`,
      );
      expect(
        calls[0].headers[
          protocol === "anthropic-messages" ? "x-api-key" : "authorization"
        ],
      ).toBe(protocol === "anthropic-messages" ? KEY : `Bearer ${KEY}`);
      expect(
        calls[0].headers[
          protocol === "anthropic-messages" ? "authorization" : "x-api-key"
        ],
      ).toBeUndefined();
      if (protocol === "anthropic-messages")
        expect(calls[0].headers["anthropic-version"]).toBe("2023-06-01");
      expect(JSON.stringify(calls[0].data)).not.toMatch(
        /LOCAL-CANARY|PRIVATE|reasoning_effort|temperature|tools/,
      );
      expect(calls[0].data.stream).toBe(false);
    });
    it.each([401, 429, 503])(
      "sanitizes HTTP %s, with no retries",
      async (code) => {
        status = code;
        raw = { error: { message: "SENSITIVE-RAW-KEY" } };
        const provider = createTeachingProvider(profile(protocol), KEY);
        await expect(
          provider.askBisik(input, new AbortController().signal),
        ).rejects.toMatchObject({
          category:
            code === 401 ? "auth" : code === 429 ? "rate" : "unavailable",
          message: "PROVIDER_ERROR",
        });
        expect(calls).toHaveLength(1);
      },
    );
    it("missing usage stays null and unknown", () => {
      const value: Record<string, unknown> = envelope(protocol);
      delete value.usage;
      expect(parseProviderReply(profile(protocol), value)).toMatchObject({
        inputTokens: null,
        outputTokens: null,
        usageKnown: false,
      });
    });
    it("abort interrupts HTTP without a second attempt", async () => {
      hanging = true;
      const controller = new AbortController();
      const action = createTeachingProvider(profile(protocol), KEY).askBisik(
        input,
        controller.signal,
      );
      const assertion = expect(action).rejects.toThrow();
      await vi.waitFor(() => expect(calls).toHaveLength(1));
      controller.abort();
      await assertion;
    });
    it("bounds chunked UTF-8 body without trusting content-length", async () => {
      raw = "é".repeat(MAX_RESPONSE_BYTES);
      await expect(
        createTeachingProvider(profile(protocol), KEY).askBisik(
          input,
          new AbortController().signal,
        ),
      ).rejects.toMatchObject({ category: "invalid" });
    });
    it.each([
      "length",
      "refusal",
      "tool",
      "invalid-json",
      "negative",
      "unsafe-number",
      "token-cap",
    ])("rejects %s", async (kind) => {
      const value: Record<string, unknown> = envelope(protocol);
      if (kind === "length") {
        if (protocol === "anthropic-messages") value.stop_reason = "max_tokens";
        else
          value.choices = [
            {
              finish_reason: "length",
              message: { content: JSON.stringify(answer) },
            },
          ];
      }
      if (kind === "refusal") {
        if (protocol === "anthropic-messages") value.stop_reason = "refusal";
        else
          value.choices = [
            {
              finish_reason: "stop",
              message: { refusal: "refused", content: null },
            },
          ];
      }
      if (kind === "tool") {
        if (protocol === "anthropic-messages")
          value.content = [{ type: "tool_use", id: "tool" }];
        else
          value.choices = [
            {
              finish_reason: "stop",
              message: { tool_calls: [], content: JSON.stringify(answer) },
            },
          ];
      }
      if (kind === "invalid-json") {
        if (protocol === "anthropic-messages")
          value.content = [{ type: "text", text: "```json\n{}\n```" }];
        else
          value.choices = [
            { finish_reason: "stop", message: { content: "bad" } },
          ];
      }
      if (["negative", "unsafe-number", "token-cap"].includes(kind))
        value.usage =
          protocol === "anthropic-messages"
            ? {
                input_tokens:
                  kind === "negative"
                    ? -1
                    : kind === "unsafe-number"
                      ? Number.MAX_SAFE_INTEGER + 1
                      : 131073,
                output_tokens: 10,
              }
            : {
                prompt_tokens:
                  kind === "negative"
                    ? -1
                    : kind === "unsafe-number"
                      ? Number.MAX_SAFE_INTEGER + 1
                      : 131073,
                completion_tokens: 10,
              };
      raw = value;
      await expect(
        createTeachingProvider(profile(protocol), KEY).askBisik(
          input,
          new AbortController().signal,
        ),
      ).rejects.toThrow("INVALID_RESPONSE");
      expect(calls).toHaveLength(1);
    });
  });
describe("profile capabilities and configuration", () => {
  it.each(["prompt_json", "json_object", "json_schema"] as const)(
    "sends only capability %s and selected token field",
    async (jsonMode) => {
      raw = envelope("openai-chat-completions");
      const cfg = {
        ...profile("openai-chat-completions"),
        jsonMode,
        tokenField: "max_tokens" as const,
        maxOutputTokens: 2345,
      };
      await createTeachingProvider(cfg, KEY).askBisik(
        input,
        new AbortController().signal,
      );
      const body = calls[0].data;
      expect(body.max_tokens).toBe(2345);
      expect(body.max_completion_tokens).toBeUndefined();
      if (jsonMode === "prompt_json")
        expect(body.response_format).toBeUndefined();
      else expect(body.response_format).toMatchObject({ type: jsonMode });
      if (jsonMode === "json_schema")
        expect(body.response_format).toMatchObject({
          json_schema: {
            strict: true,
            schema: {
              properties: {
                answer: { type: "string" },
                sourceStrategyIds: {
                  items: { type: "string", enum: ["D1.2"] },
                },
              },
              required: ["answer", "sourceStrategyIds"],
              additionalProperties: false,
            },
          },
        });
    },
  );
  it("uses task-specific enrichment schema, not Bisik fields", async () => {
    raw = envelope("openai-chat-completions", { status: "ok", stories: [] });
    await createTeachingProvider(
      { ...profile("openai-chat-completions"), jsonMode: "json_schema" },
      KEY,
    ).enrichPackage(
      { slots: [{ slotId: "slot-0", choices: ["Guru {{a}}"] }] },
      new AbortController().signal,
    );
    expect(JSON.stringify(calls[0].data.response_format)).toContain(
      '"stories"',
    );
    expect(JSON.stringify(calls[0].data.response_format)).not.toContain(
      '"answer"',
    );
  });
  it("rejects unsafe roots, endpoints, unlisted hosts and unsupported native JSON mode", () => {
    for (const baseUrl of [
      "https://u:p@api.anthropic.com/v1",
      "https://api.anthropic.com/v1?key=secret",
      "https://api.anthropic.com/v1#key",
      "https://api.anthropic.com/v1/messages",
      "https://api.anthropic.com/v1/chat/completions",
      "https://api.anthropic.com/v1/responses",
      "http://api.anthropic.com/v1",
      "https://169.254.169.254/v1",
      "https://[::1]/v1",
      "https://attacker.invalid/v1",
    ])
      expect(() => providerEndpoint({ ...legacyProfile, baseUrl })).toThrow();
    expect(() =>
      providerEndpoint({ ...legacyProfile, jsonMode: "json_schema" }),
    ).toThrow();
    expect(providerEndpoint(legacyProfile)).toBe(
      "https://api.anthropic.com/v1/messages",
    );
  });
  it("legacy is explicit; partial/conflicting new profiles never borrow Anthropic credentials", () => {
    expect(readAIProfile({ ANTHROPIC_API_KEY: KEY })).toMatchObject({
      legacy: true,
      profile: { id: "legacy-anthropic", model: legacyProfile.model },
    });
    for (const env of [
      { AI_PROTOCOL: "openai-chat-completions", ANTHROPIC_API_KEY: KEY },
      { AI_MODEL: "coding-agent-is-not-the-app-model", ANTHROPIC_API_KEY: KEY },
      { AI_PROTOCOL: "openai-chat-completions", AI_API_KEY: KEY },
    ])
      expect(() => readAIProfile(env)).toThrow();
    vi.stubEnv("LLM_ENABLED", "false");
    expect(llmConfiguration()).toMatchObject({
      enabled: false,
      configuration: "disabled",
    });
    vi.stubEnv("LLM_ENABLED", "true");
    vi.stubEnv("LLM_GATEWAY_TOKEN", "");
    expect(llmConfiguration()).toMatchObject({
      enabled: false,
      configuration: "invalid",
    });
  });
  it("counts UTF-8 input and leaves private headers/body out of errors", () => {
    expect(() =>
      wireRequest(
        profile("openai-chat-completions"),
        KEY,
        "guru",
        { text: "é".repeat(10000) },
        {},
      ),
    ).toThrow("INPUT_LIMIT");
  });
});
