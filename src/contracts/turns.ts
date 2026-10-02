import { z } from "zod";
import {
  randomIdSchema,
  attendanceNumberSchema,
  parseBoundary,
} from "./domain";
import type { TurnEvent } from "../core/turns/scheduler";
export const turnEventSchema = z
  .strictObject({
    id: randomIdSchema,
    sessionId: randomIdSchema,
    groupId: randomIdSchema.nullable(),
    taskIndex: z.number().int().nonnegative(),
    seed: z.number().int().min(0).max(0xffffffff),
    pilots: z.array(randomIdSchema).max(2),
    navigators: z.array(randomIdSchema).max(2),
    teams: z.array(z.array(randomIdSchema).max(40)).min(1).max(2),
  })
  .refine(
    (e) =>
      new Set([...e.pilots, ...e.navigators]).size ===
      e.pilots.length + e.navigators.length,
  );
export const turnRecordSchema = z.strictObject({
  id: z.string().regex(/^[a-f0-9-]{36}:\d{4}-[12]$/),
  classId: randomIdSchema,
  semester: z.string().regex(/^\d{4}-[12]$/),
  revision: z.number().int().nonnegative(),
  events: z.array(turnEventSchema).max(20000),
  navigatorFirst: z.array(randomIdSchema).max(40),
});
export type TurnRecord = z.infer<typeof turnRecordSchema>;
export const publicRolesSchema = z
  .strictObject({
    taskId: randomIdSchema,
    pilots: z.array(attendanceNumberSchema).max(2),
    navigators: z.array(attendanceNumberSchema).max(2),
  })
  .refine(
    (r) =>
      new Set([...r.pilots, ...r.navigators]).size ===
      r.pilots.length + r.navigators.length,
  );
export type PublicRoles = z.infer<typeof publicRolesSchema>;
export function publicRoles(input: PublicRoles): PublicRoles {
  return parseBoundary(publicRolesSchema, {
    taskId: input.taskId,
    pilots: input.pilots.map((n) => n),
    navigators: input.navigators.map((n) => n),
  });
}
export function projectTurn(
  event: TurnEvent,
  students: readonly { studentId: string; attendanceNumber: number }[],
): PublicRoles {
  const number = (id: string) => {
    const student = students.find((s) => s.studentId === id);
    if (!student) throw new Error("Unknown role member");
    return student.attendanceNumber;
  };
  return publicRoles({
    taskId: event.id,
    pilots: event.pilots.map(number),
    navigators: event.navigators.map(number),
  });
}
