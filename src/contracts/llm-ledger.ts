import { z } from "zod";
import { randomIdSchema } from "./domain";
import { fallbackReasonSchema } from "./bisik";
export const usageSchema = z.strictObject({
  feature: z.enum(["bisik", "enrichment"]),
  model: z.literal("claude-haiku-4-5-20251001"),
  promptVersion: z.enum(["bisik-v1", "enrichment-v1"]),
  inputTokens: z.number().int().min(0).max(32768).nullable(),
  outputTokens: z.number().int().min(0).max(1200).nullable(),
  durationMs: z.number().int().min(0).max(86400000),
  fallback: fallbackReasonSchema,
  timestamp: z.string().max(40),
});
export const llmLedgerSchema = z.discriminatedUnion("action", [
  z.strictObject({
    action: z.literal("reserve"),
    requestId: randomIdSchema,
    classId: randomIdSchema,
    scopeId: randomIdSchema,
    feature: z.enum(["bisik", "enrichment"]),
  }),
  z.strictObject({
    action: z.literal("complete"),
    requestId: randomIdSchema,
    usage: usageSchema,
  }),
  z.strictObject({
    action: z.literal("feedback"),
    requestId: randomIdSchema,
    classId: randomIdSchema,
    helpful: z.boolean(),
  }),
]);
