import { z } from "zod";
import {
  classLimitsSchema,
  parseBoundary,
  randomIdSchema,
  runtimeModeSchema,
} from "./domain";
import { studentDtoSchema } from "./api";

const labelSchema = z.string().trim().min(1).max(40);
export const createClassSchema = z.strictObject({
  id: randomIdSchema,
  label: labelSchema,
  grade: classLimitsSchema.shape.grade,
  count: classLimitsSchema.shape.count,
  mode: runtimeModeSchema,
});
export type CreateClassInput = z.infer<typeof createClassSchema>;
export const classDtoSchema = z.strictObject({
  id: randomIdSchema,
  label: labelSchema,
  grade: classLimitsSchema.shape.grade,
  count: classLimitsSchema.shape.count,
  mode: runtimeModeSchema,
  revision: z.number().int().positive(),
});
export type ClassDto = z.infer<typeof classDtoSchema>;
export const updateClassSchema = z.strictObject({
  label: labelSchema,
  grade: classLimitsSchema.shape.grade,
  revision: z.number().int().positive(),
});
export const classListSchema = z.strictObject({
  classes: z.array(classDtoSchema),
});
export const classDetailSchema = z.strictObject({
  class: classDtoSchema,
  students: z.array(studentDtoSchema),
});

export function serializeCreateClass(input: CreateClassInput): string {
  return JSON.stringify(
    parseBoundary(createClassSchema, {
      id: input.id,
      label: input.label,
      grade: input.grade,
      count: input.count,
      mode: input.mode,
    }),
  );
}
export function serializeUpdateClass(
  input: z.infer<typeof updateClassSchema>,
): string {
  return JSON.stringify(
    parseBoundary(updateClassSchema, {
      label: input.label,
      grade: input.grade,
      revision: input.revision,
    }),
  );
}
