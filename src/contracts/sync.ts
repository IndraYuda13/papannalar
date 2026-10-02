import { z } from "zod";
import { randomIdSchema, studentRefSchema } from "./domain";
import { cycleSchema } from "./cycle";
import { syncPackageSchema, toSyncPackage } from "./sync-package";
import type { Cycle } from "../core/session/cycle";
import type { TeacherPackage } from "../core/package/build";
import type { AssessmentContext, SavedCard } from "./assessment";
import { CARD_CHOICES } from "../core/assessment/card-response";
import {
  syncOralSchema,
  syncTurnsSchema,
  toSyncOral,
  toSyncTurns,
} from "./sync-history";
import type { OralRun } from "../core/oral/state";
import type { TurnRecord } from "./turns";

export const sessionSyncSchema = z.strictObject({
  engineVersion: z.literal(1),
  cycle: cycleSchema,
  package: syncPackageSchema,
  roster: z.array(studentRefSchema).min(1).max(40),
  exitId: randomIdSchema.nullable(),
  oral: z.array(syncOralSchema).max(160).optional(),
  turns: z.array(syncTurnsSchema).max(2).optional(),
  cards: z
    .array(
      z.strictObject({
        sessionId: randomIdSchema,
        studentId: randomIdSchema,
        revision: z.number().int().positive(),
        choices: z.array(z.enum(CARD_CHOICES)).min(2).max(10),
        source: z.enum(["omr", "manual", "demo"]),
      }),
    )
    .max(80),
});
export type SessionSync = z.infer<typeof sessionSyncSchema>;
export const syncMutationSchema = z.strictObject({
  schemaVersion: z.literal(1),
  eventId: randomIdSchema,
  deviceId: randomIdSchema,
  clientSequence: z.number().int().positive(),
  classId: randomIdSchema,
  sessionId: randomIdSchema,
  baseRevision: z.number().int().nonnegative(),
  writerEpoch: z.number().int().positive(),
  operation: z.enum(["session-save", "session-delete"]),
  payload: sessionSyncSchema.nullable(),
});
export type SyncMutation = z.infer<typeof syncMutationSchema>;
export const syncBatchSchema = z.strictObject({
  mutations: z.array(syncMutationSchema).min(1).max(50),
});
export const syncAckSchema = z.strictObject({
  eventId: randomIdSchema,
  status: z.enum(["accepted", "conflict", "deleted", "rejected"]),
  revision: z.number().int().nonnegative(),
  sequence: z.number().int().nonnegative(),
});
export type SyncAck = z.infer<typeof syncAckSchema>;
export const syncResultSchema = z.strictObject({
  acknowledgements: z.array(syncAckSchema).max(50),
});
export const syncRecordSchema = z.strictObject({
  sessionId: randomIdSchema,
  revision: z.number().int().positive(),
  writerEpoch: z.number().int().positive(),
  deviceId: randomIdSchema,
  payload: sessionSyncSchema,
});
export const syncRecordsSchema = z.strictObject({
  records: z.array(syncRecordSchema).max(200),
});
export type SyncRecord = z.infer<typeof syncRecordSchema>;

export function toSessionSync(input: {
  cycle: Cycle;
  package: TeacherPackage;
  oralRuns?: readonly OralRun[];
  turns?: readonly TurnRecord[];
  bundles: readonly {
    context: AssessmentContext;
    cards: readonly SavedCard[];
  }[];
}): SessionSync {
  const { cycle } = input;
  const parent = input.bundles.find((b) => b.context.id === cycle.id);
  if (!parent) throw new Error("Missing session parent");
  const related = input.bundles.filter(
    (b) => b.context.session.sessionId === cycle.id,
  );
  return sessionSyncSchema.parse({
    engineVersion: 1,
    cycle: {
      schemaVersion: 1,
      id: cycle.id,
      classId: cycle.classId,
      packageId: cycle.packageId,
      ordinal: cycle.ordinal,
      revision: cycle.revision,
      absentStudentIds: cycle.absentStudentIds.map((id) => id),
      groups: cycle.groups.map((g) => ({
        id: g.id,
        label: g.label,
        members: g.members.map((s) => ({
          studentId: s.studentId,
          attendanceNumber: s.attendanceNumber,
          active: s.active,
          displayed:
            s.displayed.kind === "lanjut"
              ? { kind: "lanjut" }
              : { kind: "step", stepId: s.displayed.stepId },
        })),
        composition: g.composition.map((c) => ({
          placement:
            c.placement.kind === "lanjut"
              ? { kind: "lanjut" }
              : { kind: "step", stepId: c.placement.stepId },
          count: c.count,
        })),
        activityStep: g.activityStep,
        exitBaseStep: g.exitBaseStep,
        exitContextStep: g.exitContextStep,
        extensionSteps: g.extensionSteps.map((s) => s),
        supportStudentIds: g.supportStudentIds.map((id) => id),
        enrichmentStudentIds: g.enrichmentStudentIds.map((id) => id),
      })),
      classEnded: cycle.classEnded,
      assessmentRevision: cycle.assessmentRevision,
    },
    package: toSyncPackage(input.package),
    roster: parent.context.roster.map((s) => ({
      id: s.id,
      classId: s.classId,
      attendanceNumber: s.attendanceNumber,
      active: s.active,
    })),
    exitId:
      related.find((b) => !!b.context.parentSessionId)?.context.id ?? null,
    ...(input.oralRuns?.length ? { oral: input.oralRuns.map(toSyncOral) } : {}),
    ...(input.turns?.length
      ? { turns: input.turns.map((t) => toSyncTurns(t, cycle.id)) }
      : {}),
    cards: related.flatMap((b) =>
      b.cards.map((c) => ({
        sessionId: c.sessionId,
        studentId: c.studentId,
        choices: c.choices.map((x) => x),
        revision: c.graded.revision,
        source: c.graded.source,
      })),
    ),
  });
}
