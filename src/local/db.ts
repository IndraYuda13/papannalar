"use client";

import { type Table } from "dexie";
import {
  studentDtoSchema,
  toStudentDto,
  type StudentDto,
} from "../contracts/api";
import {
  parseBoundary,
  randomIdSchema,
  studentRefSchema,
  type StudentRef,
} from "../contracts/domain";
import { localOperation, type LocalScope } from "./scope";
import { openDataDatabase } from "./data-database";

export function createStudentRepository(scope: LocalScope) {
  const db = openDataDatabase(scope);
  const students: Table<StudentDto, string> = db.table("students");

  return {
    saveMany: (input: readonly StudentRef[]) =>
      localOperation(async () => {
        // Reject local identity fields before they can enter the domain store.
        const records = input.map((student) =>
          toStudentDto(parseBoundary(studentRefSchema, student)),
        );
        await db.transaction("rw", students, async () => {
          await students.bulkPut(records);
        });
      }),
    read: (studentId: string) =>
      localOperation(async () => {
        const row = await students.get(
          parseBoundary(randomIdSchema, studentId),
        );
        return row ? parseBoundary(studentDtoSchema, row) : undefined;
      }),
    list: (classId: string) =>
      localOperation(async () => {
        const rows = await students
          .where("classId")
          .equals(parseBoundary(randomIdSchema, classId))
          .sortBy("attendanceNumber");
        return rows.map((row) => parseBoundary(studentDtoSchema, row));
      }),
    delete: (studentId: string) =>
      localOperation(() =>
        students.delete(parseBoundary(randomIdSchema, studentId)),
      ),
    close: () => db.close(),
  };
}
