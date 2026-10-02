import "server-only";
import { z } from "zod";
import { ENRICHMENT_PROMPT } from "./prompts/enrichment-v1";
import { BISIK_PROMPT } from "./prompts/bisik-v1";
import { bisikOutputSchema } from "../../contracts/bisik";
import { legacyProfile, LEGACY_MODEL, type AIProfile } from "./profile";
import {
  boundedProviderCall,
  jsonSchema,
  type parseProviderReply,
} from "./wire";
export { MAX_INPUT_BYTES } from "./wire";
// Only the explicit migration mapping uses the old model; new profiles require AI_MODEL.
export const LLM_MODEL = LEGACY_MODEL,
  MAX_OUTPUT_TOKENS = 1200;
export type EnrichmentInput = Readonly<{
  slots: readonly { slotId: string; choices: readonly string[] }[];
}>;
export type BisikInput = Readonly<{
  question: string;
  strategies: readonly {
    code: string;
    prompts: readonly string[];
    demonstrate: string;
  }[];
}>;
export type ProviderReply = Readonly<ReturnType<typeof parseProviderReply>>;
export interface TeachingAssistantProvider {
  readonly model: string;
  readonly profile: AIProfile | null;
  enrichPackage(
    input: EnrichmentInput,
    signal: AbortSignal,
  ): Promise<ProviderReply>;
  askBisik(input: BisikInput, signal: AbortSignal): Promise<ProviderReply>;
}
export class DisabledProvider implements TeachingAssistantProvider {
  readonly model = "disabled";
  readonly profile = null;
  async enrichPackage(): Promise<ProviderReply> {
    throw new Error("DISABLED");
  }
  async askBisik(): Promise<ProviderReply> {
    throw new Error("DISABLED");
  }
}
class CompatibleProvider implements TeachingAssistantProvider {
  readonly model: string;
  constructor(
    readonly profile: AIProfile,
    private readonly key: string,
    private readonly request: typeof fetch = fetch,
  ) {
    this.model = profile.model;
  }
  enrichPackage(input: EnrichmentInput, signal: AbortSignal) {
    const data = {
      slots: input.slots.map((s) => ({
        slotId: s.slotId,
        choices: s.choices.map((c) => c),
      })),
    };
    const schema = z.strictObject({
      status: z.enum(["ok", "unsupported"]),
      stories: z
        .array(
          z.strictObject({
            slotId: z.enum(input.slots.map((s) => s.slotId)),
            segments: z.array(z.string().max(2000)).min(1).max(8),
          }),
        )
        .max(3),
    });
    return boundedProviderCall(
      this.profile,
      this.key,
      ENRICHMENT_PROMPT,
      data,
      jsonSchema(schema),
      signal,
      this.request,
    );
  }
  askBisik(input: BisikInput, signal: AbortSignal) {
    const data = {
      question: input.question,
      strategies: input.strategies.map((s) => ({
        code: s.code,
        prompts: s.prompts.map((p) => p),
        demonstrate: s.demonstrate,
      })),
    };
    const schema = bisikOutputSchema.extend({
      sourceStrategyIds: z
        .array(z.enum(input.strategies.map((s) => s.code)))
        .min(1)
        .max(3),
    });
    return boundedProviderCall(
      this.profile,
      this.key,
      BISIK_PROMPT,
      data,
      jsonSchema(schema),
      signal,
      this.request,
    );
  }
}
export class AnthropicProvider extends CompatibleProvider {
  constructor(
    key: string,
    request: typeof fetch = fetch,
    profile: AIProfile = legacyProfile,
  ) {
    super(profile, key, request);
    if (profile.protocol !== "anthropic-messages")
      throw new Error("CONFIG_INVALID");
  }
}
export class OpenAIChatProvider extends CompatibleProvider {
  constructor(profile: AIProfile, key: string, request: typeof fetch = fetch) {
    super(profile, key, request);
    if (profile.protocol !== "openai-chat-completions")
      throw new Error("CONFIG_INVALID");
  }
}
export function createTeachingProvider(
  profile: AIProfile,
  key: string,
  request: typeof fetch = fetch,
): TeachingAssistantProvider {
  return profile.protocol === "anthropic-messages"
    ? new AnthropicProvider(key, request, profile)
    : new OpenAIChatProvider(profile, key, request);
}
