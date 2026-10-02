import "server-only";
import { z } from "zod";
import type { authContext } from "../auth/client";
import {
  llmLedgerSchema,
  profileReferenceSchema,
  usageV2Schema,
} from "../../contracts/llm-ledger";
import { fallbackReasonSchema } from "../../contracts/bisik";
import type { UsageStore, Feature, Usage } from "./usage";
import type { AIProfile } from "./profile";
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
export function profileReference(profile: AIProfile) {
  return profileReferenceSchema.parse({
    profileId: profile.id,
    configVersion: profile.configVersion,
    protocol: profile.protocol,
    requestedModel: profile.model,
    maxInputTokens: profile.maxInputTokens,
    maxOutputTokens: profile.maxOutputTokens,
  });
}
export function usageStore(
  client: Client,
  request: {
    requestId: string;
    classId: string;
    scopeId: string;
    feature: Feature;
  },
  profile: AIProfile,
): UsageStore {
  const frozen = profileReference(profile);
  let priceVersion: string | undefined;
  return {
    reserve: async (signal) => {
      const result = z
        .strictObject({
          allowed: z.boolean(),
          reason: fallbackReasonSchema,
          priceVersion: z.string().optional(),
        })
        .parse(
          await llmRpc(
            client,
            {
              action: "reserve",
              schemaVersion: 2,
              ...request,
              profile: frozen,
            },
            signal,
          ),
        );
      if (result.allowed && !result.priceVersion)
        throw new Error("UNAVAILABLE");
      priceVersion = result.priceVersion;
      return { allowed: result.allowed, reason: result.reason };
    },
    complete: async (usage, signal) => {
      if (!priceVersion) throw new Error("UNAVAILABLE");
      const receipt = usageV2Schema.parse({
        ...usage,
        profileId: frozen.profileId,
        protocol: frozen.protocol,
        requestedModel: frozen.requestedModel,
        configVersion: frozen.configVersion,
        priceVersion,
      });
      await llmRpc(
        client,
        {
          action: "complete",
          schemaVersion: 2,
          requestId: request.requestId,
          usage: receipt,
        },
        signal,
      );
    },
  };
}
export function logUsage(usage: Usage) {
  // Validate and pick explicit metadata. Never spread provider/request objects.
  console.info(
    JSON.stringify({
      event: "llm_usage",
      schemaVersion: 2,
      feature: usage.feature,
      profileId: usage.profileId,
      protocol: usage.protocol,
      requestedModel: usage.requestedModel,
      reportedModel: usage.reportedModel,
      configVersion: usage.configVersion,
      promptVersion: usage.promptVersion,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      cacheReadInputTokens: usage.cacheReadInputTokens,
      cacheCreationInputTokens: usage.cacheCreationInputTokens,
      usageKnown: usage.usageKnown,
      durationMs: usage.durationMs,
      fallback: usage.fallback,
      errorCategory: usage.errorCategory,
      timestamp: usage.timestamp,
    }),
  );
}
