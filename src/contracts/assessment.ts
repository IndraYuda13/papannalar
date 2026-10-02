import { z } from "zod";
import { randomIdSchema, studentRefSchema, parseBoundary } from "./domain";
import { classDtoSchema } from "./classes";
import { STEP_IDS } from "../content/ladder/registry";
import { CARD_CHOICES } from "../core/assessment/card-response";
import {
  freezeBinding,
  type AssessmentBinding,
} from "../core/assessment/binding";
import {
  freezeRevision,
  type AssessmentRevision,
} from "../core/assessment/revisions";
import type { ReplayBaseline, SessionRecord } from "../core/placement/replay";

const placement = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("step"), stepId: z.enum(STEP_IDS) }),
  z.strictObject({ kind: z.literal("lanjut") }),
]);
const contextSchema = z.strictObject({
  id: randomIdSchema,
  parentSessionId: randomIdSchema.optional(),
  packageId: randomIdSchema.optional(),
  oralOnly: z.literal(true).optional(),
  classroom: classDtoSchema,
  seed: z.number().int().nonnegative(),
  session: z.strictObject({
    sessionId: randomIdSchema,
    ordinal: z.number().int().positive(),
    target: z.enum(STEP_IDS),
    finalized: z.boolean(),
    engineVersion: z.literal(1),
    bktConfigVersion: z.literal(1),
  }),
  roster: z.array(studentRefSchema).min(1).max(40),
  bindings: z.array(z.unknown()).max(40),
  baselines: z
    .array(
      z.strictObject({
        studentId: randomIdSchema,
        target: z.enum(STEP_IDS),
        mastery: z.record(z.enum(STEP_IDS), z.number().min(0).max(1)),
        displayed: placement.nullable(),
      }),
    )
    .max(40),
  keys: z
    .array(z.enum(["A", "B", "C", "D"]))
    .min(0)
    .max(10),
  keysByStudent: z
    .array(
      z.strictObject({
        studentId: randomIdSchema,
        keys: z
          .array(z.enum(["A", "B", "C", "D"]))
          .min(2)
          .max(10),
      }),
    )
    .min(1)
    .max(40)
    .optional(),
});
export type AssessmentContext = Omit<
  z.infer<typeof contextSchema>,
  "bindings" | "session" | "baselines"
> & {
  bindings: readonly AssessmentBinding[];
  session: SessionRecord;
  baselines: readonly ReplayBaseline[];
};
export function parseAssessmentContext(input: unknown): AssessmentContext {
  const value = parseBoundary(contextSchema, input);
  const bindings = value.bindings.map(freezeBinding);
  if (
    (value.parentSessionId ?? value.id) !== value.session.sessionId ||
    value.roster.some((s) => s.classId !== value.classroom.id) ||
    new Set(value.roster.map((s) => s.id)).size !== value.roster.length ||
    new Set(value.roster.map((s) => s.attendanceNumber)).size !==
      value.roster.length ||
    (value.oralOnly
      ? bindings.length !== 0 ||
        value.keys.length !== 0 ||
        value.classroom.grade > 3 ||
        !!value.parentSessionId
      : bindings.length !== value.roster.length || value.keys.length < 2) ||
    value.baselines.length !== value.roster.length ||
    value.roster.some(
      (s) =>
        (!value.oralOnly &&
          bindings.filter(
            (b) =>
              b.studentId === s.id &&
              b.sessionId === value.session.sessionId &&
              b.questions.length === value.keys.length,
          ).length !== 1) ||
        value.baselines.filter((b) => b.studentId === s.id).length !== 1,
    )
  )
    throw new Error("Invalid session context");
  if (
    value.parentSessionId &&
    (value.parentSessionId === value.id ||
      bindings.some((b) => b.kind !== "exit" || b.assessmentId !== value.id))
  )
    throw new Error("Invalid exit context");
  if (
    value.keysByStudent &&
    (value.keysByStudent.length !== value.roster.length ||
      value.roster.some(
        (s) =>
          value.keysByStudent!.filter(
            (k) => k.studentId === s.id && k.keys.length === value.keys.length,
          ).length !== 1,
      ))
  )
    throw new Error("Invalid per-student keys");
  return { ...value, bindings };
}
export const cardInputSchema = z.strictObject({
  studentId: randomIdSchema,
  choices: z.array(z.enum(CARD_CHOICES)).min(2).max(10),
  source: z.enum(["omr", "manual", "demo"]),
  expectedRevision: z.number().int().nonnegative(),
});
export type CardInput = z.infer<typeof cardInputSchema>;
const responseSchema = z.strictObject({
  id: z.string().max(80),
  sessionId: randomIdSchema,
  studentId: randomIdSchema,
  choices: z.array(z.enum(CARD_CHOICES)).min(2).max(10),
  graded: z.unknown(),
});
export type SavedCard = Omit<z.infer<typeof responseSchema>, "graded"> & {
  graded: AssessmentRevision;
};
export function parseSavedCard(
  context: AssessmentContext,
  input: unknown,
): SavedCard {
  const row = parseBoundary(responseSchema, input);
  const binding = context.bindings.find((b) => b.studentId === row.studentId);
  if (
    !binding ||
    row.id !== `${context.id}/${row.studentId}` ||
    row.sessionId !== context.id
  )
    throw new Error("Unbound response");
  return { ...row, graded: freezeRevision(binding, row.graded) };
}
// A network candidate is built field by field. Neither a local context nor an image can be spread into it.
export function responseEvent(context: AssessmentContext, card: SavedCard) {
  const row = parseSavedCard(context, card);
  return {
    schemaVersion: 1 as const,
    eventId: `${row.id}/${row.graded.revision}`,
    classId: context.classroom.id,
    sessionId: context.session.sessionId,
    ...(context.parentSessionId ? { recordId: context.id } : {}),
    studentId: row.studentId,
    operation: "response-revised" as const,
    baseRevision: row.graded.baseRevision,
    revision: row.graded.revision,
    source: row.graded.source,
    assessmentId: row.graded.assessmentId,
    bindingVersion: row.graded.bindingVersion,
    choices: row.choices.map((c) => c),
    responses: row.graded.responses.map((r) => ({
      rowIndex: r.rowIndex,
      questionId: r.questionId,
      result: r.result,
    })),
  };
}
