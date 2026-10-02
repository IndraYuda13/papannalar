import { z } from "zod";
import { randomIdSchema } from "./domain";
export const guidanceSchema = z.strictObject({
  hint: z.number().int().min(0).max(3),
  reveal: z.boolean(),
});
export type PublicGuidance = z.infer<typeof guidanceSchema>;
export const guidanceReportSchema = z.discriminatedUnion("action", [
  z.strictObject({
    action: z.literal("read"),
    presentationId: randomIdSchema,
    channelEpoch: randomIdSchema,
    taskEpoch: randomIdSchema,
  }),
  z.strictObject({
    action: z.literal("ack"),
    presentationId: randomIdSchema,
    channelEpoch: randomIdSchema,
    taskEpoch: randomIdSchema,
    hint: z.number().int().min(0).max(3),
  }),
]);
export type GuidanceReport = z.infer<typeof guidanceReportSchema>;
export const guidanceStatusSchema = z.strictObject({
  taskEpoch: randomIdSchema,
  hint: z.number().int().min(0).max(3),
  active: z.boolean(),
});
