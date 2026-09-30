import "server-only";
import type { ProviderReply, TeachingAssistantProvider } from "./provider";
import type { FallbackReason } from "../../contracts/bisik";
import { withDeadline } from "./deadline";
import { BISIK_PROMPT_VERSION } from "./prompts/bisik-v1";
import { ENRICHMENT_PROMPT_VERSION } from "./prompts/enrichment-v1";
export type Feature = "bisik" | "enrichment";
export type Usage = Readonly<{
  feature: Feature;
  model: string;
  promptVersion: string;
  inputTokens: number | null;
  outputTokens: number | null;
  durationMs: number;
  fallback: FallbackReason;
  timestamp: string;
}>;
export type UsageStore = {
  reserve(
    signal: AbortSignal,
  ): Promise<{ allowed: boolean; reason: FallbackReason }>;
  complete(usage: Usage, signal: AbortSignal): Promise<void>;
};
export async function runAssistant<T>(input: {
  feature: Feature;
  start: number;
  signal: AbortSignal;
  provider: TeachingAssistantProvider;
  store: UsageStore;
  call(signal: AbortSignal): Promise<ProviderReply>;
  validate(value: unknown): T;
  log(usage: Usage): void;
}): Promise<{ value: T | null; reason: FallbackReason }> {
  let reply: ProviderReply | undefined,
    reserved = false,
    reason: FallbackReason = "none";
  const deadline =
    (input.feature === "bisik" ? 5000 : 30000) - (Date.now() - input.start);
  const usage = (): Usage => ({
    feature: input.feature,
    model: input.provider.model,
    promptVersion:
      input.feature === "bisik"
        ? BISIK_PROMPT_VERSION
        : ENRICHMENT_PROMPT_VERSION,
    inputTokens: reply?.inputTokens ?? null,
    outputTokens: reply?.outputTokens ?? null,
    durationMs: Math.max(0, Date.now() - input.start),
    fallback: reason,
    timestamp: new Date().toISOString(),
  });
  try {
    if (input.provider.model === "disabled")
      return { value: null, reason: (reason = "disabled") };
    if (deadline <= 0) return { value: null, reason: (reason = "timeout") };
    const value = await withDeadline(deadline, input.signal, async (signal) => {
      const reservation = await input.store.reserve(signal);
      if (!reservation.allowed) {
        reason = reservation.reason;
        return null;
      }
      reserved = true;
      signal.throwIfAborted();
      reply = await input.call(signal);
      signal.throwIfAborted();
      if (reply.inputTokens > 32768 || reply.outputTokens > 1200)
        throw new Error("INVALID_RESPONSE");
      let result: T;
      try {
        result = input.validate(reply.value);
      } catch {
        throw new Error("INVALID_RESPONSE");
      }
      await input.store.complete(usage(), signal);
      return result;
    });
    return { value, reason };
  } catch (error) {
    reason =
      (error instanceof Error &&
        ["TIMEOUT", "AbortError", "TimeoutError"].includes(error.message)) ||
      (error instanceof Error && error.name === "AbortError")
        ? "timeout"
        : error instanceof Error && error.message === "INVALID_RESPONSE"
          ? "invalid"
          : "provider";
    if (reserved) {
      // Reservation stays charged conservatively if receipt cannot be written;
      // its active lease expires. No retry can spend again using the same ID.
      try {
        await withDeadline(
          Math.max(1, deadline - (Date.now() - input.start)),
          input.signal,
          (signal) => input.store.complete(usage(), signal),
        );
      } catch {
        /* fail closed */
      }
    }
    return { value: null, reason };
  } finally {
    input.log(usage());
  }
}
