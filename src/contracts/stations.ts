import { z } from "zod";
import { randomIdSchema, parseBoundary } from "./domain";
import {
  STATIONS,
  validSchedule,
  type Rotation,
} from "../core/stations/rotation";
export const rotationSchema = z
  .strictObject({
    id: randomIdSchema,
    revision: z.number().int().positive(),
    groupIds: z.array(randomIdSchema).min(1).max(4),
    schedule: z
      .array(z.array(z.enum(STATIONS)).min(3).max(4))
      .min(1)
      .max(4),
    round: z.number().int().min(0).max(3),
    phase: z.enum(["ready", "work", "transition", "complete"]),
    workSeconds: z.number().int().min(60).max(3600),
    reserveSeconds: z.number().int().min(0).max(180),
    addedSeconds: z.number().int().nonnegative(),
    deadlineAt: z.number().int().nonnegative().nullable(),
    short: z.boolean(),
  })
  .refine(
    (r) =>
      validSchedule(r.schedule) &&
      r.groupIds.length === r.schedule.length &&
      new Set(r.groupIds).size === r.groupIds.length &&
      r.round < r.schedule[0].length,
  );
export function parseRotation(input: unknown): Rotation {
  return parseBoundary(rotationSchema, input);
}
export const publicStationSchema = z.strictObject({
  round: z.number().int().min(1).max(4),
  total: z.number().int().min(1).max(4),
  phase: z.enum(["ready", "work", "transition", "complete"]),
  deadlineAt: z.number().int().nonnegative().nullable(),
  reserveSeconds: z.number().int().min(0).max(180),
  assignments: z
    .array(
      z.strictObject({ groupId: randomIdSchema, station: z.enum(STATIONS) }),
    )
    .min(1)
    .max(4),
});
export type PublicStation = z.infer<typeof publicStationSchema>;
export function toPublicStation(input: PublicStation): PublicStation {
  return parseBoundary(publicStationSchema, {
    round: input.round,
    total: input.total,
    phase: input.phase,
    deadlineAt: input.deadlineAt,
    reserveSeconds: input.reserveSeconds,
    assignments: input.assignments.map((a) => ({
      groupId: a.groupId,
      station: a.station,
    })),
  });
}
export function rotationProjection(state: Rotation): PublicStation {
  return toPublicStation({
    round: state.round + 1,
    total: state.short ? 1 : state.schedule[0].length,
    phase: state.phase,
    deadlineAt: state.deadlineAt,
    reserveSeconds: state.reserveSeconds,
    assignments: state.groupIds.map((groupId, i) => ({
      groupId,
      station: state.short ? "Mandiri" : state.schedule[i][state.round],
    })),
  });
}
