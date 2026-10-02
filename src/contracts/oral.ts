import { z } from "zod";
import {
  randomIdSchema,
  attendanceNumberSchema,
  parseBoundary,
} from "./domain";
import { STEP_IDS } from "../content/ladder/registry";
import { evaluateOral, type OralRun } from "../core/oral/state";
export const oralRunSchema = z.strictObject({
  schemaVersion: z.literal(1),
  id: randomIdSchema,
  classId: randomIdSchema,
  studentId: randomIdSchema,
  attendanceNumber: attendanceNumberSchema,
  target: z.enum(STEP_IDS),
  start: z.enum(STEP_IDS),
  seed: z.number().int().min(0).max(0xffffffff),
  revision: z.number().int().positive(),
  afterSessionOrdinal: z.number().int().nonnegative(),
  sequence: z.number().int().nonnegative().optional(),
  baseline: z.record(z.enum(STEP_IDS), z.number().min(0).max(1)),
  answers: z
    .array(
      z.strictObject({
        questionId: randomIdSchema,
        stepId: z.enum(STEP_IDS),
        result: z.enum(["correct", "incorrect", "silent"]),
        misconceptionCode: z
          .string()
          .regex(/^[ABD]\d\.\d$/)
          .nullable(),
      }),
    )
    .max(22),
  skipped: z.boolean(),
  provisional: z.literal("K13"),
});
export function parseOralRun(input: unknown): OralRun {
  const value = parseBoundary(oralRunSchema, input);
  evaluateOral(value);
  return value;
}
export function toOralDto(input: OralRun): OralRun {
  return parseOralRun({
    schemaVersion: 1,
    id: input.id,
    classId: input.classId,
    studentId: input.studentId,
    attendanceNumber: input.attendanceNumber,
    target: input.target,
    start: input.start,
    seed: input.seed,
    revision: input.revision,
    afterSessionOrdinal: input.afterSessionOrdinal,
    ...(input.sequence ? { sequence: input.sequence } : {}),
    baseline: Object.fromEntries(
      STEP_IDS.map((step) => [step, input.baseline[step]]),
    ),
    answers: input.answers.map((a) => ({
      questionId: a.questionId,
      stepId: a.stepId,
      result: a.result,
      misconceptionCode: a.misconceptionCode,
    })),
    skipped: input.skipped,
    provisional: input.provisional,
  });
}
