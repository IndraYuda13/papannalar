import { z } from "zod";
import {
  attendanceNumberSchema,
  parseBoundary,
  randomIdSchema,
  type StudentRef,
} from "./domain";

// Teacher API only. Ownership must come from authentication, not this payload.
export const studentDtoSchema = z.strictObject({
  schemaVersion: z.literal(1),
  id: randomIdSchema,
  classId: randomIdSchema,
  attendanceNumber: attendanceNumberSchema,
  active: z.boolean(),
});
export type StudentDto = z.infer<typeof studentDtoSchema>;

export function toStudentDto(student: StudentRef): StudentDto {
  return parseBoundary(studentDtoSchema, {
    schemaVersion: 1,
    id: student.id,
    classId: student.classId,
    attendanceNumber: student.attendanceNumber,
    active: student.active,
  });
}

export function serializeStudent(student: StudentRef): string {
  return JSON.stringify(toStudentDto(student));
}
