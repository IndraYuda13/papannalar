import "server-only";
import type { ProviderReply, TeachingAssistantProvider } from "./provider";
import type { FallbackReason } from "../../contracts/bisik";
import type { z } from "zod";
import type { usageV2Schema } from "../../contracts/llm-ledger";
import { withDeadline } from "./deadline";
import { ProviderError } from "./wire";
import { legacyProfile } from "./profile";
export type Feature = "bisik" | "enrichment";
export type Usage = Readonly<
  Omit<z.infer<typeof usageV2Schema>, "priceVersion">
>;
export type UsageStore = {
  reserve(
    signal: AbortSignal,
  ): Promise<{ allowed: boolean; reason: FallbackReason }>;
  complete(usage: Usage, signal: AbortSignal): Promise<void>;
};
export function usageMetadata(provider: TeachingAssistantProvider) {
  const profile = provider.profile ?? legacyProfile;
  return {
    schemaVersion: 2 as const,
    profileId: profile.id,
    protocol: profile.protocol,
    requestedModel: provider.model,
    reportedModel: null,
    configVersion: profile.configVersion,
  };
}
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
    reason: FallbackReason = "none",
    errorCategory: Usage["errorCategory"] = null;
  const deadline =
    (input.feature === "bisik" ? 5000 : 30000) - (Date.now() - input.start);
  const usage = (): Usage => ({
    ...usageMetadata(input.provider),
    feature: input.feature,
    promptVersion: input.feature === "bisik" ? "bisik-v1" : "enrichment-v1",
    reportedModel: reply?.reportedModel ?? null,
    inputTokens: reply?.inputTokens ?? null,
    outputTokens: reply?.outputTokens ?? null,
    cacheReadInputTokens: reply?.cacheReadInputTokens ?? null,
    cacheCreationInputTokens: reply?.cacheCreationInputTokens ?? null,
    usageKnown: reply?.usageKnown ?? false,
    durationMs: Math.max(0, Date.now() - input.start),
    fallback: reason,
    errorCategory,
    timestamp: new Date().toISOString(),
  });
  try {
    if (!input.provider.profile || input.provider.model === "disabled")
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
      const profile = input.provider.profile!;
      const totalInput =
        profile.protocol === "anthropic-messages"
          ? (reply.inputTokens ?? 0) +
            (reply.cacheReadInputTokens ?? 0) +
            (reply.cacheCreationInputTokens ?? 0)
          : (reply.inputTokens ?? 0);
      if (
        reply.profileId !== profile.id ||
        reply.configVersion !== profile.configVersion ||
        reply.protocol !== profile.protocol ||
        reply.requestedModel !== profile.model ||
        totalInput > profile.maxInputTokens ||
        (reply.outputTokens ?? 0) > profile.maxOutputTokens
      )
        throw new ProviderError("invalid");
      let result: T;
      try {
        result = input.validate(reply.value);
      } catch {
        throw new ProviderError("invalid");
      }
      await input.store.complete(usage(), signal);
      return result;
    });
    return { value, reason };
  } catch (error) {
    const timeout =
      input.signal.aborted ||
      (error instanceof Error &&
        (["TIMEOUT", "AbortError", "TimeoutError"].includes(error.message) ||
          error.name === "AbortError"));
    errorCategory = timeout
      ? "timeout"
      : error instanceof ProviderError
        ? error.category
        : error instanceof Error &&
            ["INVALID_RESPONSE", "INPUT_LIMIT"].includes(error.message)
          ? "invalid"
          : "unavailable";
    reason =
      errorCategory === "timeout"
        ? "timeout"
        : errorCategory === "invalid" || errorCategory === "refusal"
          ? "invalid"
          : errorCategory === "rate"
            ? "rate"
            : "provider";
    if (reserved) {
      try {
        await withDeadline(
          Math.max(1, deadline - (Date.now() - input.start)),
          input.signal,
          (signal) => input.store.complete(usage(), signal),
        );
      } catch {
        /* Keep conservative reservation; no automatic refund/retry. */
      }
    }
    return { value: null, reason };
  } finally {
    input.log(usage());
  }
}
