import { z } from "zod";
import { randomIdSchema } from "./domain";
import { MISCONCEPTION_CODES } from "../content/strategies/registry";
import { syncPackageSchema } from "./sync-package";
import { storySuggestionSchema } from "./enrichment";
export const strategyCodeSchema = z.enum([
  ...MISCONCEPTION_CODES,
  "generic-error",
]);
export const fallbackReasonSchema = z.enum([
  "none",
  "disabled",
  "unreviewed",
  "privacy",
  "offline",
  "timeout",
  "provider",
  "invalid",
  "budget",
  "rate",
  "active",
  "frozen",
  "unavailable",
]);
export type FallbackReason = z.infer<typeof fallbackReasonSchema>;
export const bisikRequestSchema = z.strictObject({
  requestId: randomIdSchema,
  classId: randomIdSchema,
  sessionId: randomIdSchema,
  code: strategyCodeSchema,
  question: z.string().trim().min(1).max(500).optional(),
});
export const enrichRequestSchema = z.strictObject({
  requestId: randomIdSchema,
  recipe: syncPackageSchema,
});
export const bisikOutputSchema = z.strictObject({
  answer: z.string().trim().min(1).max(1200),
  sourceStrategyIds: z.array(strategyCodeSchema).min(1).max(3),
});
export const bisikResponseSchema = bisikOutputSchema.extend({
  requestId: randomIdSchema,
  status: z.enum(["ai", "static"]),
  reason: fallbackReasonSchema,
  durationMs: z.number().int().nonnegative(),
});
export const enrichResponseSchema = z.strictObject({
  requestId: randomIdSchema,
  packageId: randomIdSchema,
  revision: z.number().int().positive(),
  status: z.enum(["ai", "static"]),
  reason: fallbackReasonSchema,
  stories: z.array(storySuggestionSchema).max(3),
  durationMs: z.number().int().nonnegative(),
});
export const llmStatusSchema = z.strictObject({
  enabled: z.boolean(),
  freeText: z.boolean(),
  configuration: z.enum(["disabled", "valid", "invalid"]),
  configured: z.boolean(),
  connectionTested: z.literal(false),
  contentEligible: z.boolean(),
  privacyReviewed: z.boolean(),
  budgetEnabled: z.boolean(),
  budgetReason: fallbackReasonSchema,
});
export const feedbackSchema = z.strictObject({
  classId: randomIdSchema,
  requestId: randomIdSchema,
  helpful: z.boolean(),
});
export function serializeBisik(input: z.infer<typeof bisikRequestSchema>) {
  return JSON.stringify(
    bisikRequestSchema.parse({
      requestId: input.requestId,
      classId: input.classId,
      sessionId: input.sessionId,
      code: input.code,
      ...(input.question === undefined ? {} : { question: input.question }),
    }),
  );
}
