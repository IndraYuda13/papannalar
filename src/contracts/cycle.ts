import { z } from "zod";
import {
  randomIdSchema,
  attendanceNumberSchema,
  parseBoundary,
} from "./domain";
import { STEP_IDS } from "../content/ladder/registry";
import { GROUP_LABELS } from "../core/groups/grouping";
import type { Cycle } from "../core/session/cycle";
const placement = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("step"), stepId: z.enum(STEP_IDS) }),
  z.strictObject({ kind: z.literal("lanjut") }),
]);
const member = z.strictObject({
  studentId: randomIdSchema,
  attendanceNumber: attendanceNumberSchema,
  active: z.boolean(),
  displayed: placement,
});
export const groupSnapshotSchema = z.strictObject({
  id: randomIdSchema,
  label: z.enum(GROUP_LABELS),
  members: z.array(member).min(1).max(40),
  composition: z
    .array(z.strictObject({ placement, count: z.number().int().positive() }))
    .min(1)
    .max(22),
  activityStep: z.enum(STEP_IDS),
  exitBaseStep: z.enum(STEP_IDS),
  exitContextStep: z.enum(STEP_IDS),
  extensionSteps: z.array(z.enum(STEP_IDS)).max(22),
  supportStudentIds: z.array(randomIdSchema).max(40),
  enrichmentStudentIds: z.array(randomIdSchema).max(40),
});
export const cycleSchema = z
  .strictObject({
    schemaVersion: z.literal(1),
    id: randomIdSchema,
    classId: randomIdSchema,
    packageId: randomIdSchema,
    ordinal: z.number().int().positive(),
    revision: z.number().int().positive(),
    absentStudentIds: z.array(randomIdSchema).max(40),
    groups: z.array(groupSnapshotSchema).max(4),
    classEnded: z.boolean(),
    assessmentRevision: z.number().int().nonnegative(),
  })
  .refine((v) => !v.assessmentRevision || v.classEnded)
  .refine((v) => {
    const members = v.groups.flatMap((g) => g.members);
    return (
      new Set(v.groups.map((g) => g.id)).size === v.groups.length &&
      new Set(members.map((m) => m.studentId)).size === members.length &&
      new Set(members.map((m) => m.attendanceNumber)).size === members.length &&
      members.every(
        (m) => m.active && !v.absentStudentIds.includes(m.studentId),
      ) &&
      new Set(v.absentStudentIds).size === v.absentStudentIds.length
    );
  });
export function parseCycle(value: unknown): Cycle {
  return parseBoundary(cycleSchema, value);
}
