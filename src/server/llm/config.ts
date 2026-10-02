import "server-only";
import { AnthropicProvider, DisabledProvider } from "./provider";
import { BISIK_PRIVACY_REVIEW } from "./reviews";
export function llmConfiguration() {
  const key = process.env["ANTHROPIC_API_KEY"],
    token = process.env["LLM_GATEWAY_TOKEN"];
  const enabled =
    process.env["LLM_ENABLED"] === "true" &&
    !!key &&
    !!token &&
    token.length >= 32;
  return {
    enabled,
    freeText: enabled && BISIK_PRIVACY_REVIEW !== null,
    provider: enabled ? new AnthropicProvider(key!) : new DisabledProvider(),
  };
}
