import { z } from "zod";
import { randomIdSchema, attendanceNumberSchema } from "./domain";
import { STEP_IDS } from "../content/ladder/registry";
import { evaluateOral, answerOral, type OralRun } from "../core/oral/state";
import { parseOralRun } from "./oral";
import { turnEventSchema, type TurnRecord } from "./turns";
export const syncOralSchema = z.strictObject({
  id: randomIdSchema,
  studentId: randomIdSchema,
  attendanceNumber: attendanceNumberSchema,
  target: z.enum(STEP_IDS),
  start: z.enum(STEP_IDS),
  seed: z.number().int().min(0).max(0xffffffff),
  revision: z.number().int().positive(),
  afterSessionOrdinal: z.number().int().nonnegative(),
  sequence: z.number().int().nonnegative(),
  skipped: z.boolean(),
  answers: z
    .array(
      z.strictObject({
        result: z.enum(["correct", "incorrect", "silent"]),
        misconceptionCode: z
          .string()
          .regex(/^[ABD]\d\.\d$/)
          .nullable(),
      }),
    )
    .max(22),
});
export const syncTurnsSchema = z.strictObject({
  semester: z.string().regex(/^\d{4}-[12]$/),
  events: z.array(turnEventSchema).max(200),
  navigatorFirst: z.array(randomIdSchema).max(40),
});
export function toSyncOral(run: OralRun): z.infer<typeof syncOralSchema> {
  return syncOralSchema.parse({
    id: run.id,
    studentId: run.studentId,
    attendanceNumber: run.attendanceNumber,
    target: run.target,
    start: run.start,
    seed: run.seed,
    revision: run.revision,
    afterSessionOrdinal: run.afterSessionOrdinal,
    sequence: run.sequence ?? 0,
    skipped: run.skipped,
    answers: run.answers.map((a) => ({
      result: a.result,
      misconceptionCode: a.misconceptionCode,
    })),
  });
}
export function fromSyncOral(
  raw: z.infer<typeof syncOralSchema>,
  classId: string,
): OralRun {
  const value = syncOralSchema.parse(raw);
  let run = parseOralRun({
    schemaVersion: 1,
    id: value.id,
    classId,
    studentId: value.studentId,
    attendanceNumber: value.attendanceNumber,
    target: value.target,
    start: value.start,
    seed: value.seed,
    revision: 1,
    afterSessionOrdinal: value.afterSessionOrdinal,
    ...(value.sequence ? { sequence: value.sequence } : {}),
    baseline: Object.fromEntries(STEP_IDS.map((s) => [s, 0.3])),
    skipped: false,
    answers: [],
    provisional: "K13",
  });
  for (const answer of value.answers) {
    const question = evaluateOral(run).question;
    if (!question) throw new Error("Oral path exceeds completion");
    run = answerOral(run, {
      questionId: question.id,
      result: answer.result,
      misconceptionCode: answer.misconceptionCode,
    });
  }
  return parseOralRun({
    ...run,
    revision: value.revision,
    skipped: value.skipped,
  });
}
export function toSyncTurns(
  record: TurnRecord,
  sessionId: string,
): z.infer<typeof syncTurnsSchema> {
  return syncTurnsSchema.parse({
    semester: record.semester,
    navigatorFirst: record.navigatorFirst.map((id) => id),
    events: record.events
      .filter((e) => e.sessionId === sessionId)
      .map((e) => ({
        id: e.id,
        sessionId: e.sessionId,
        groupId: e.groupId,
        taskIndex: e.taskIndex,
        seed: e.seed,
        pilots: e.pilots.map((id) => id),
        navigators: e.navigators.map((id) => id),
        teams: e.teams.map((t) => t.map((id) => id)),
      })),
  });
}
