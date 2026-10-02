import "server-only";
import { createTeachingProvider, DisabledProvider } from "./provider";
import { BISIK_PRIVACY_REVIEW } from "./reviews";
import { readAIProfile } from "./profile";
let legacyWarning = false;
export function llmConfiguration() {
  const disabled = (configuration: "disabled" | "invalid") => ({
    enabled: false,
    freeText: false,
    configuration,
    legacy: false,
    provider: new DisabledProvider(),
  });
  if (process.env["LLM_ENABLED"] !== "true") return disabled("disabled");
  try {
    const token = process.env["LLM_GATEWAY_TOKEN"] ?? "";
    if (token.length < 32 || token.length > 256)
      throw new Error("CONFIG_INVALID");
    const { profile, key, legacy } = readAIProfile();
    if (legacy && !legacyWarning) {
      console.info(
        JSON.stringify({
          event: "llm_legacy_configuration",
          profileId: profile.id,
          migrateTo: "AI_PROTOCOL",
        }),
      );
      legacyWarning = true;
    }
    return {
      enabled: true,
      freeText: BISIK_PRIVACY_REVIEW !== null,
      configuration: "valid" as const,
      legacy,
      provider: createTeachingProvider(profile, key),
    };
  } catch {
    return disabled("invalid");
  }
}
