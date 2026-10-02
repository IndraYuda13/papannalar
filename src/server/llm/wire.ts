import "server-only";
import { z } from "zod";
import { modelNameSchema, type AIProfile, providerEndpoint } from "./profile";
export const MAX_INPUT_BYTES = 16000,
  MAX_REQUEST_BYTES = 24000,
  MAX_RESPONSE_BYTES = 65536;
export type ProviderErrorCategory =
  "auth" | "rate" | "timeout" | "unavailable" | "refusal" | "invalid";
export class ProviderError extends Error {
  constructor(readonly category: ProviderErrorCategory) {
    super(
      category === "invalid" || category === "refusal"
        ? "INVALID_RESPONSE"
        : "PROVIDER_ERROR",
    );
  }
}
const object = (x: unknown): x is Record<string, unknown> =>
  !!x && typeof x === "object" && !Array.isArray(x);
function count(x: unknown): number | null {
  if (x === null || x === undefined) return null;
  if (typeof x !== "number" || !Number.isSafeInteger(x) || x < 0)
    throw new ProviderError("invalid");
  return x;
}
function blocks(parts: unknown, anthropic: boolean): string {
  if (!Array.isArray(parts) || !parts.length)
    throw new ProviderError("invalid");
  return parts
    .map((p: unknown) => {
      if (!object(p)) throw new ProviderError("invalid");
      if (p.type === "text" && typeof p.text === "string") return p.text;
      if (
        anthropic &&
        ["thinking", "redacted_thinking"].includes(String(p.type))
      )
        return "";
      if (p.type === "refusal") throw new ProviderError("refusal");
      throw new ProviderError("invalid");
    })
    .join("");
}
export function parseProviderReply(profile: AIProfile, raw: unknown) {
  if (!object(raw)) throw new ProviderError("invalid");
  const reportedModel =
    raw.model === undefined || raw.model === null
      ? null
      : modelNameSchema.parse(raw.model);
  let content: string,
    inputTokens: number | null,
    outputTokens: number | null,
    cacheReadInputTokens: number | null = null,
    cacheCreationInputTokens: number | null = null;
  const usage = object(raw.usage) ? raw.usage : {};
  if (raw.usage != null && !object(raw.usage))
    throw new ProviderError("invalid");
  if (profile.protocol === "openai-chat-completions") {
    if (
      !Array.isArray(raw.choices) ||
      raw.choices.length !== 1 ||
      !object(raw.choices[0])
    )
      throw new ProviderError("invalid");
    const choice = raw.choices[0],
      message = choice.message;
    if (!object(message)) throw new ProviderError("invalid");
    if (message.refusal != null || choice.finish_reason === "content_filter")
      throw new ProviderError("refusal");
    if (
      choice.finish_reason !== "stop" ||
      message.tool_calls != null ||
      message.function_call != null
    )
      throw new ProviderError("invalid");
    content =
      typeof message.content === "string"
        ? message.content
        : blocks(message.content, false);
    inputTokens = count(usage.prompt_tokens);
    outputTokens = count(usage.completion_tokens);
    if (usage.prompt_tokens_details != null) {
      if (!object(usage.prompt_tokens_details))
        throw new ProviderError("invalid");
      cacheReadInputTokens = count(usage.prompt_tokens_details.cached_tokens);
      if (
        cacheReadInputTokens !== null &&
        inputTokens !== null &&
        cacheReadInputTokens > inputTokens
      )
        throw new ProviderError("invalid");
    }
  } else {
    if (raw.stop_reason === "refusal") throw new ProviderError("refusal");
    if (raw.stop_reason !== "end_turn") throw new ProviderError("invalid");
    content = blocks(raw.content, true);
    inputTokens = count(usage.input_tokens);
    outputTokens = count(usage.output_tokens);
    cacheReadInputTokens = count(usage.cache_read_input_tokens);
    cacheCreationInputTokens = count(usage.cache_creation_input_tokens);
  }
  const totalInput =
    profile.protocol === "anthropic-messages"
      ? (inputTokens ?? 0) +
        (cacheReadInputTokens ?? 0) +
        (cacheCreationInputTokens ?? 0)
      : (inputTokens ?? 0);
  if (
    totalInput > profile.maxInputTokens ||
    (outputTokens ?? 0) > profile.maxOutputTokens
  )
    throw new ProviderError("invalid");
  if (!content.trim() || Buffer.byteLength(content, "utf8") > 24000)
    throw new ProviderError("invalid");
  let value: unknown;
  try {
    value = JSON.parse(content);
  } catch {
    throw new ProviderError("invalid");
  }
  if (!object(value)) throw new ProviderError("invalid");
  return {
    value,
    schemaVersion: 2 as const,
    requestedModel: profile.model,
    reportedModel,
    profileId: profile.id,
    protocol: profile.protocol,
    configVersion: profile.configVersion,
    inputTokens,
    outputTokens,
    cacheReadInputTokens,
    cacheCreationInputTokens,
    usageKnown: inputTokens !== null && outputTokens !== null,
    finish: "complete" as const,
  };
}
export function wireRequest(
  profile: AIProfile,
  key: string,
  system: string,
  input: unknown,
  taskSchema: Record<string, unknown>,
) {
  const content = JSON.stringify(input);
  if (
    Buffer.byteLength(system + content, "utf8") >
    Math.min(MAX_INPUT_BYTES, profile.maxInputTokens - 512)
  )
    throw new Error("INPUT_LIMIT");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (profile.authScheme === "bearer")
    headers["Authorization"] = `Bearer ${key}`;
  else headers["x-api-key"] = key;
  let data: Record<string, unknown>;
  if (profile.protocol === "openai-chat-completions") {
    data = {
      model: profile.model,
      messages: [
        { role: "system", content: system },
        { role: "user", content },
      ],
      stream: false,
      [profile.tokenField]: profile.maxOutputTokens,
    };
    if (profile.jsonMode === "json_object")
      data.response_format = { type: "json_object" };
    if (profile.jsonMode === "json_schema")
      data.response_format = {
        type: "json_schema",
        json_schema: {
          name: "teaching_task",
          strict: true,
          schema: taskSchema,
        },
      };
  } else {
    headers["anthropic-version"] = profile.anthropicVersion;
    data = {
      model: profile.model,
      system,
      messages: [{ role: "user", content }],
      stream: false,
      max_tokens: profile.maxOutputTokens,
    };
  }
  const body = JSON.stringify(data);
  if (Buffer.byteLength(body, "utf8") > MAX_REQUEST_BYTES)
    throw new Error("INPUT_LIMIT");
  return { url: providerEndpoint(profile), body, headers };
}
export async function boundedProviderCall(
  profile: AIProfile,
  key: string,
  system: string,
  input: unknown,
  taskSchema: Record<string, unknown>,
  signal: AbortSignal,
  request: typeof fetch,
) {
  signal.throwIfAborted();
  const wire = wireRequest(profile, key, system, input, taskSchema);
  const response = await request(wire.url, {
    method: "POST",
    redirect: "error",
    cache: "no-store",
    signal,
    headers: wire.headers,
    body: wire.body,
  });
  if (!response.ok) {
    await response.body?.cancel();
    throw new ProviderError(
      response.status === 401 || response.status === 403
        ? "auth"
        : response.status === 429
          ? "rate"
          : "unavailable",
    );
  }
  const reader = response.body?.getReader();
  if (!reader) throw new ProviderError("invalid");
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    while (true) {
      signal.throwIfAborted();
      const part = await reader.read();
      if (part.done) break;
      bytes += part.value.byteLength;
      if (bytes > MAX_RESPONSE_BYTES) throw new ProviderError("invalid");
      chunks.push(part.value);
    }
    signal.throwIfAborted();
    return parseProviderReply(
      profile,
      JSON.parse(
        new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks)),
      ),
    );
  } catch (error) {
    await reader.cancel().catch(() => {});
    if (signal.aborted) throw error;
    if (error instanceof ProviderError) throw error;
    throw new ProviderError("invalid");
  } finally {
    reader.releaseLock();
  }
}
export function jsonSchema(schema: z.ZodType) {
  return z.toJSONSchema(schema) as Record<string, unknown>;
}
