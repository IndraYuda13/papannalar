import "server-only";
import { z } from "zod";
import { ENRICHMENT_PROMPT } from "./prompts/enrichment-v1";
import { BISIK_PROMPT } from "./prompts/bisik-v1";

// Verified against official models overview, 2026-09-30. Account access NOT_RUN.
export const LLM_MODEL = "claude-haiku-4-5-20251001";
export const MAX_OUTPUT_TOKENS = 1200;
export const MAX_INPUT_BYTES = 16000;
export type EnrichmentInput = Readonly<{
  slots: readonly {
    slotId: string;
    choices: readonly string[];
  }[];
}>;
export type BisikInput = Readonly<{
  question: string;
  strategies: readonly {
    code: string;
    prompts: readonly string[];
    demonstrate: string;
  }[];
}>;
export type ProviderReply = Readonly<{
  value: unknown;
  inputTokens: number;
  outputTokens: number;
}>;
export interface TeachingAssistantProvider {
  readonly model: string;
  enrichPackage(
    input: EnrichmentInput,
    signal: AbortSignal,
  ): Promise<ProviderReply>;
  askBisik(input: BisikInput, signal: AbortSignal): Promise<ProviderReply>;
}
export class DisabledProvider implements TeachingAssistantProvider {
  readonly model = "disabled";
  async enrichPackage(): Promise<ProviderReply> {
    throw new Error("DISABLED");
  }
  async askBisik(): Promise<ProviderReply> {
    throw new Error("DISABLED");
  }
}
const envelope = z.object({
  model: z.string(),
  stop_reason: z.literal("end_turn"),
  content: z
    .array(
      z.strictObject({ type: z.literal("text"), text: z.string().max(12000) }),
    )
    .length(1),
  usage: z.object({
    input_tokens: z.number().int().nonnegative(),
    output_tokens: z.number().int().nonnegative(),
  }),
});
export class AnthropicProvider implements TeachingAssistantProvider {
  readonly model = LLM_MODEL;
  constructor(
    private readonly key: string,
    private readonly request: typeof fetch = fetch,
  ) {}
  private async message(
    system: string,
    data: unknown,
    signal: AbortSignal,
  ): Promise<ProviderReply> {
    const content = JSON.stringify(data);
    if (Buffer.byteLength(system + content, "utf8") > MAX_INPUT_BYTES)
      throw new Error("INPUT_LIMIT");
    const response = await this.request(
      "https://api.anthropic.com/v1/messages",
      {
        method: "POST",
        redirect: "error",
        cache: "no-store",
        signal,
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.key,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: MAX_OUTPUT_TOKENS,
          system,
          messages: [{ role: "user", content }],
        }),
      },
    );
    if (!response.ok) {
      await response.body?.cancel();
      throw new Error("PROVIDER_ERROR");
    }
    const reader = response.body?.getReader();
    if (!reader) throw new Error("INVALID_RESPONSE");
    const chunks: Uint8Array[] = [];
    let bytes = 0;
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      bytes += part.value.length;
      if (bytes > 24000) {
        await reader.cancel();
        throw new Error("INVALID_RESPONSE");
      }
      chunks.push(part.value);
    }
    try {
      const parsed = envelope.parse(
        JSON.parse(Buffer.concat(chunks).toString("utf8")),
      );
      if (parsed.model !== this.model) throw new Error();
      return {
        value: JSON.parse(parsed.content[0].text),
        inputTokens: parsed.usage.input_tokens,
        outputTokens: parsed.usage.output_tokens,
      };
    } catch {
      throw new Error("INVALID_RESPONSE");
    }
  }
  enrichPackage(input: EnrichmentInput, signal: AbortSignal) {
    return this.message(
      ENRICHMENT_PROMPT,
      {
        slots: input.slots.map((s) => ({
          slotId: s.slotId,
          choices: s.choices.map((c) => c),
        })),
      },
      signal,
    );
  }
  askBisik(input: BisikInput, signal: AbortSignal) {
    return this.message(
      BISIK_PROMPT,
      {
        question: input.question,
        strategies: input.strategies.map((s) => ({
          code: s.code,
          prompts: s.prompts.map((p) => p),
          demonstrate: s.demonstrate,
        })),
      },
      signal,
    );
  }
}
