"use client";

import type { StudentRef } from "../../contracts/domain";
import type { NameRepository } from "../../local/names";

// This label exists only at the teacher UI boundary, never in StudentRef/DTOs.
// Deliberately a view shape, not a StudentRef extended with a name.
export async function readTeacherStudentView(
  student: StudentRef,
  names: Pick<NameRepository, "read">,
) {
  const local = await names.read(student.id);
  return {
    studentId: student.id,
    attendanceNumber: student.attendanceNumber,
    label: local?.displayName ?? `Absen ${student.attendanceNumber}`,
  };
}
