import "server-only";
import { z } from "zod";
import { classDtoSchema, type CreateClassInput } from "../contracts/classes";
import { parseBoundary, randomIdSchema } from "../contracts/domain";
import { toStudentDto } from "../contracts/api";
import type { authContext } from "./auth/client";

type Client = ReturnType<typeof authContext>["client"];
export const classColumns =
  "id,label,grade,student_count,runtime_mode,revision";
const rowSchema = z.strictObject({
  id: randomIdSchema,
  label: z.string(),
  grade: z.number(),
  student_count: z.number(),
  runtime_mode: z.string(),
  revision: z.number(),
});
export function classDto(value: unknown) {
  const row = parseBoundary(rowSchema, value);
  return parseBoundary(classDtoSchema, {
    id: row.id,
    label: row.label,
    grade: row.grade,
    count: row.student_count,
    mode: row.runtime_mode,
    revision: row.revision,
  });
}
export async function createClass(client: Client, input: CreateClassInput) {
  const { error } = await client.rpc("create_class_with_roster", {
    p_id: input.id,
    p_label: input.label,
    p_grade: input.grade,
    p_count: input.count,
    p_mode: input.mode,
  });
  if (error)
    throw new Error(error.code === "23505" ? "CONFLICT" : "UNAVAILABLE");
}
export async function classDetail(client: Client, id: string) {
  const { data: classroom, error } = await client
    .from("classes")
    .select(classColumns)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error("UNAVAILABLE");
  if (!classroom) throw new Error("NOT_FOUND");
  const { data: rows, error: rosterError } = await client
    .from("students")
    .select("id,class_id,attendance_number,active")
    .eq("class_id", id)
    .order("attendance_number");
  if (rosterError || !rows) throw new Error("UNAVAILABLE");
  const schema = z.strictObject({
    id: randomIdSchema,
    class_id: randomIdSchema,
    attendance_number: z.number(),
    active: z.boolean(),
  });
  return {
    class: classDto(classroom),
    students: rows.map((value: unknown) => {
      const student = parseBoundary(schema, value);
      return toStudentDto({
        id: student.id,
        classId: student.class_id,
        attendanceNumber: student.attendance_number,
        active: student.active,
      });
    }),
  };
}
