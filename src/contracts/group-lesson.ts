import { z } from "zod";
import { randomIdSchema, attendanceNumberSchema } from "./domain";
import {
  competencyMappingSchema,
  evidenceSelectionSchema,
} from "./learning-evidence";
import { groupBoardActionSchema } from "./group-board";
export const lessonRosterSchema = z
  .array(
    z.strictObject({
      id: randomIdSchema,
      attendanceNumber: attendanceNumberSchema,
    }),
  )
  .max(40);
export const lessonGroupSchema = z.strictObject({
  id: randomIdSchema,
  label: z.string().trim().min(1).max(60),
  studentIds: z.array(randomIdSchema).min(1).max(40),
});
export const assignmentInputSchema = z.strictObject({
  id: randomIdSchema,
  groupId: randomIdSchema,
  method: z.enum(["teacher", "board", "cards"]),
  collectionId: randomIdSchema,
  version: z.number().int().positive(),
});
export const groupAssignmentSchema = assignmentInputSchema.extend({
  runId: randomIdSchema,
  formId: randomIdSchema,
  roster: lessonRosterSchema,
  status: z.enum(["ready", "active", "completed", "stopped"]),
  revision: z.number().int().positive(),
});
export const groupLessonSchema = z.strictObject({
  schemaVersion: z.literal(1),
  id: randomIdSchema,
  classId: randomIdSchema,
  classLabel: z.string(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  revision: z.number().int().positive(),
  status: z.enum(["draft", "active", "closed"]),
  synthetic: z.boolean(),
  competency: competencyMappingSchema,
  seed: z.string().min(1).max(80),
  groupingSource: z.enum(["evidence", "random", "edited"]),
  presence: lessonRosterSchema,
  absentStudentIds: z.array(randomIdSchema).max(40),
  evidenceSnapshot: z.array(evidenceSelectionSchema).max(40),
  groups: z.array(lessonGroupSchema).max(40),
  assignments: z.array(groupAssignmentSchema).max(40),
  assessmentRevision: z.number().int().nonnegative(),
});
const identity = { id: randomIdSchema, revision: z.number().int().positive() };
export const groupLessonActionSchema = z.discriminatedUnion("action", [
  z.strictObject({ action: z.literal("list") }),
  z.strictObject({ action: z.literal("detail"), id: randomIdSchema }),
  z.strictObject({
    action: z.literal("prepare"),
    id: randomIdSchema,
    classId: randomIdSchema,
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    competency: competencyMappingSchema,
    absentStudentIds: z.array(randomIdSchema).max(40),
    groupCount: z.number().int().min(1).max(40),
    seed: z.string().min(1).max(80),
    source: z.enum(["evidence", "random"]),
  }),
  z.strictObject({
    action: z.literal("save"),
    ...identity,
    seed: z.string().min(1).max(80),
    groupingSource: z.enum(["evidence", "random", "edited"]),
    groups: z.array(lessonGroupSchema).min(1).max(40),
    assignments: z.array(assignmentInputSchema).min(1).max(40),
  }),
  z.strictObject({ action: z.literal("begin"), ...identity }),
  z.strictObject({ action: z.literal("close"), ...identity }),
  z.strictObject({
    action: z.literal("finalize"),
    ...identity,
    acknowledgeMissing: z.boolean(),
  }),
  z.strictObject({
    action: z.literal("complete-assignment"),
    id: randomIdSchema,
    assignmentId: randomIdSchema,
    assignmentRevision: z.number().int().positive(),
  }),
  z.strictObject({
    action: z.literal("board-action"),
    id: randomIdSchema,
    input: groupBoardActionSchema,
  }),
]);
export type GroupLesson = z.infer<typeof groupLessonSchema>;
export type GroupAssignment = z.infer<typeof groupAssignmentSchema>;
export type GroupLessonAction = z.infer<typeof groupLessonActionSchema>;
