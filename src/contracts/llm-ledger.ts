import { z } from "zod";
import { randomIdSchema } from "./domain";
import { fallbackReasonSchema } from "./bisik";
import {
  modelNameSchema,
  profileNameSchema,
  protocolSchema,
  tokenCountSchema,
  outputCountSchema,
} from "./ai-profile";
const feature = z.enum(["bisik", "enrichment"]);
const commonUsage = {
  feature,
  promptVersion: z.enum(["bisik-v1", "enrichment-v1"]),
  durationMs: z.number().int().min(0).max(86400000),
  fallback: fallbackReasonSchema,
  timestamp: z.string().max(40),
};
export const legacyUsageSchema = z.strictObject({
  ...commonUsage,
  model: z.literal("claude-haiku-4-5-20251001"),
  inputTokens: z.number().int().min(0).max(32768).nullable(),
  outputTokens: z.number().int().min(0).max(1200).nullable(),
});
export const profileReferenceSchema = z.strictObject({
  profileId: profileNameSchema,
  configVersion: profileNameSchema,
  protocol: protocolSchema,
  requestedModel: modelNameSchema,
  maxInputTokens: z.number().int().min(1024).max(131072),
  maxOutputTokens: z.number().int().min(1).max(16384),
});
export const usageV2Schema = z.strictObject({
  ...commonUsage,
  schemaVersion: z.literal(2),
  profileId: profileNameSchema,
  protocol: protocolSchema,
  requestedModel: modelNameSchema,
  reportedModel: modelNameSchema.nullable(),
  configVersion: profileNameSchema,
  priceVersion: profileNameSchema,
  inputTokens: tokenCountSchema.nullable(),
  outputTokens: outputCountSchema.nullable(),
  cacheReadInputTokens: tokenCountSchema.nullable(),
  cacheCreationInputTokens: tokenCountSchema.nullable(),
  usageKnown: z.boolean(),
  errorCategory: z
    .enum(["auth", "rate", "timeout", "unavailable", "refusal", "invalid"])
    .nullable(),
});
export const usageSchema = z.union([legacyUsageSchema, usageV2Schema]);
export const llmLedgerSchema = z.union([
  z.strictObject({
    action: z.literal("reserve"),
    requestId: randomIdSchema,
    classId: randomIdSchema,
    scopeId: randomIdSchema,
    feature,
  }),
  z.strictObject({
    action: z.literal("complete"),
    requestId: randomIdSchema,
    usage: legacyUsageSchema,
  }),
  z.strictObject({
    action: z.literal("reserve"),
    schemaVersion: z.literal(2),
    requestId: randomIdSchema,
    classId: randomIdSchema,
    scopeId: randomIdSchema,
    feature,
    profile: profileReferenceSchema,
  }),
  z.strictObject({
    action: z.literal("complete"),
    schemaVersion: z.literal(2),
    requestId: randomIdSchema,
    usage: usageV2Schema,
  }),
  z.strictObject({
    action: z.literal("status"),
    schemaVersion: z.literal(2),
    profile: profileReferenceSchema,
  }),
  z.strictObject({
    action: z.literal("feedback"),
    requestId: randomIdSchema,
    classId: randomIdSchema,
    helpful: z.boolean(),
  }),
]);
