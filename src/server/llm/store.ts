import "server-only";
import { z } from "zod";
import type { authContext } from "../auth/client";
import { llmLedgerSchema } from "../../contracts/llm-ledger";
import { fallbackReasonSchema } from "../../contracts/bisik";
import type { UsageStore, Feature, Usage } from "./usage";
type Client = ReturnType<typeof authContext>["client"];
export async function llmRpc(
  client: Client,
  input: z.infer<typeof llmLedgerSchema>,
  signal: AbortSignal,
) {
  signal.throwIfAborted();
  const { data, error } = await client
    .rpc("llm_control", {
      p_input: llmLedgerSchema.parse(input),
      p_token: process.env["LLM_GATEWAY_TOKEN"] ?? "",
    })
    .abortSignal(signal);
  if (error || !data || typeof data !== "object" || "error" in data)
    throw new Error("UNAVAILABLE");
  return data as unknown;
}
export function usageStore(
  client: Client,
  request: {
    requestId: string;
    classId: string;
    scopeId: string;
    feature: Feature;
  },
): UsageStore {
  return {
    reserve: async (signal) =>
      z
        .strictObject({ allowed: z.boolean(), reason: fallbackReasonSchema })
        .parse(
          await llmRpc(
            client,
            {
              action: "reserve",
              requestId: request.requestId,
              classId: request.classId,
              scopeId: request.scopeId,
              feature: request.feature,
            },
            signal,
          ),
        ),
    complete: async (usage, signal) => {
      // Unknown provider counters never widen the ledger schema or enter logs.
      await llmRpc(
        client,
        {
          action: "complete",
          requestId: request.requestId,
          usage: {
            feature: usage.feature,
            model: "claude-haiku-4-5-20251001",
            promptVersion:
              usage.feature === "bisik" ? "bisik-v1" : "enrichment-v1",
            inputTokens: usage.inputTokens,
            outputTokens: usage.outputTokens,
            durationMs: usage.durationMs,
            fallback: usage.fallback,
            timestamp: usage.timestamp,
          },
        },
        signal,
      );
    },
  };
}
export function logUsage(usage: Usage) {
  console.info(
    JSON.stringify({
      event: "llm_usage",
      feature: usage.feature,
      model: usage.model,
      promptVersion: usage.promptVersion,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      durationMs: usage.durationMs,
      fallback: usage.fallback,
      timestamp: usage.timestamp,
    }),
  );
}
