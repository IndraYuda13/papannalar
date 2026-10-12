import { z } from "zod";
import { randomIdSchema } from "./domain";
import { runDetailV2Schema } from "./library";
import { groupLessonSchema } from "./group-lesson";
import { sessionSyncSchema } from "./sync";
export const resultIndexEntrySchema = z.strictObject({
  key: z.string(),
  source: z.enum(["library", "group_lesson", "diagnostic"]),
  id: randomIdSchema,
  classId: randomIdSchema,
  classLabel: z.string(),
  date: z.string(),
  title: z.string(),
  status: z.enum(["active", "closed"]),
  template: z.enum(["activity", "cards", "groups", "diagnostic"]),
  synthetic: z.boolean(),
});
export const resultsIndexSchema = z.strictObject({
  entries: z.array(resultIndexEntrySchema).max(50),
  nextCursor: z.string().nullable(),
});
export const resultDetailSchema = z.discriminatedUnion("source", [
  z.strictObject({ source: z.literal("library"), detail: runDetailV2Schema }),
  z.strictObject({
    source: z.literal("group_lesson"),
    lesson: groupLessonSchema,
    runs: z.array(runDetailV2Schema).max(40),
  }),
  z.strictObject({
    source: z.literal("diagnostic"),
    detail: sessionSyncSchema,
  }),
]);
export const resultsActionSchema = z.discriminatedUnion("action", [
  z.strictObject({
    action: z.literal("list"),
    classId: randomIdSchema.optional(),
    from: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    to: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    cursor: z.string().max(200).optional(),
  }),
  z.strictObject({
    action: z.literal("detail"),
    source: z.enum(["library", "group_lesson", "diagnostic"]),
    id: randomIdSchema,
  }),
]);
export type ResultIndexEntry = z.infer<typeof resultIndexEntrySchema>;
export type ResultDetail = z.infer<typeof resultDetailSchema>;
export type ResultsAction = z.infer<typeof resultsActionSchema>;
