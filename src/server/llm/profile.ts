import "server-only";
import { isIP } from "node:net";
import { z } from "zod";
export const LEGACY_MODEL = "claude-haiku-4-5-20251001";
import {
  modelNameSchema,
  profileNameSchema,
  protocolSchema,
} from "../../contracts/ai-profile";
export {
  modelNameSchema,
  profileNameSchema,
  protocolSchema,
} from "../../contracts/ai-profile";
export const profileSchema = z.strictObject({
  id: profileNameSchema,
  configVersion: profileNameSchema,
  protocol: protocolSchema,
  model: modelNameSchema,
  baseUrl: z.string().max(2048),
  allowedOrigins: z.array(z.string().max(2048)).min(1).max(10),
  allowLocalDev: z.boolean(),
  jsonMode: z.enum(["prompt_json", "json_object", "json_schema"]),
  tokenField: z.enum(["max_completion_tokens", "max_tokens"]),
  authScheme: z.enum(["bearer", "x-api-key"]),
  anthropicVersion: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  maxInputTokens: z.number().int().min(1024).max(131072),
  maxOutputTokens: z.number().int().min(1).max(16384),
});
export type AIProfile = Readonly<
  Omit<z.infer<typeof profileSchema>, "allowedOrigins"> & {
    allowedOrigins: readonly string[];
  }
>;
export const legacyProfile: AIProfile = Object.freeze({
  id: "legacy-anthropic",
  configVersion: "legacy-v1",
  protocol: "anthropic-messages",
  model: LEGACY_MODEL,
  baseUrl: "https://api.anthropic.com/v1",
  allowedOrigins: ["https://api.anthropic.com"],
  allowLocalDev: false,
  jsonMode: "prompt_json",
  tokenField: "max_completion_tokens",
  authScheme: "x-api-key",
  anthropicVersion: "2023-06-01",
  maxInputTokens: 32768,
  maxOutputTokens: 1200,
});
export function providerEndpoint(profile: AIProfile) {
  let url: URL;
  try {
    url = new URL(profile.baseUrl);
  } catch {
    throw new Error("CONFIG_INVALID");
  }
  const loopback = ["127.0.0.1", "[::1]", "localhost"].includes(url.hostname);
  if (
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    (url.protocol !== "https:" &&
      !(url.protocol === "http:" && loopback && profile.allowLocalDev)) ||
    !profile.allowedOrigins.includes(url.origin)
  )
    throw new Error("CONFIG_INVALID");
  // Exact operator origins + deployment egress are the trust boundary. DNS is not
  // pinned by Fetch: this is deliberately not described as an SSRF firewall.
  if (
    (isIP(url.hostname.replace(/^\[|\]$/g, "")) ||
      loopback ||
      url.hostname.endsWith(".localhost")) &&
    !(loopback && profile.allowLocalDev)
  )
    throw new Error("CONFIG_INVALID");
  const path = url.pathname.replace(/\/+$/, "");
  if (
    /\/(messages|chat\/completions|responses)$/.test(path) ||
    /%2f|%5c/i.test(path)
  )
    throw new Error("CONFIG_INVALID");
  url.pathname =
    path +
    (profile.protocol === "anthropic-messages"
      ? "/messages"
      : "/chat/completions");
  if (
    (profile.protocol === "openai-chat-completions" &&
      profile.authScheme !== "bearer") ||
    (profile.protocol === "anthropic-messages" &&
      profile.jsonMode !== "prompt_json")
  )
    throw new Error("CONFIG_INVALID");
  return url.toString();
}
export function readAIProfile(
  env: Readonly<Record<string, string | undefined>> = process.env,
): { profile: AIProfile; key: string; legacy: boolean } {
  const newKeys = Object.keys(env).filter((k) => k.startsWith("AI_") && env[k]);
  if (!newKeys.length) {
    const key = env["ANTHROPIC_API_KEY"] ?? "";
    if (!key.trim() || /[\r\n]/.test(key)) throw new Error("CONFIG_INVALID");
    return { profile: legacyProfile, key, legacy: true };
  }
  if (!env["AI_PROTOCOL"] || env["ANTHROPIC_API_KEY"])
    throw new Error("CONFIG_INVALID");
  const protocol = protocolSchema.parse(env["AI_PROTOCOL"]);
  const profile = profileSchema.parse({
    id: env["AI_PROFILE_ID"],
    configVersion: env["AI_CONFIG_VERSION"],
    protocol,
    model: env["AI_MODEL"],
    baseUrl: env["AI_API_BASE_URL"],
    allowedOrigins: (env["AI_ALLOWED_ORIGINS"] ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    allowLocalDev: env["AI_ALLOW_LOCAL_DEV"] === "true",
    jsonMode: env["AI_JSON_MODE"] ?? "prompt_json",
    tokenField: env["AI_OPENAI_TOKEN_FIELD"] ?? "max_completion_tokens",
    authScheme:
      env["AI_AUTH_SCHEME"] ??
      (protocol === "anthropic-messages" ? "x-api-key" : "bearer"),
    anthropicVersion: env["AI_ANTHROPIC_VERSION"] ?? "2023-06-01",
    maxInputTokens: Number(env["AI_MAX_INPUT_TOKENS"] ?? 32768),
    maxOutputTokens: Number(env["AI_MAX_OUTPUT_TOKENS"] ?? 1200),
  });
  const key = env["AI_API_KEY"] ?? "";
  if (!key.trim() || key.length > 4096 || /[\r\n]/.test(key))
    throw new Error("CONFIG_INVALID");
  providerEndpoint(profile);
  return {
    profile: Object.freeze({
      ...profile,
      allowedOrigins: Object.freeze([...profile.allowedOrigins]),
    }),
    key,
    legacy: false,
  };
}
