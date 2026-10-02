import { z } from "zod";

export const randomIdSchema = z.uuid({ version: "v4" });
export const attendanceNumberSchema = z.number().int().min(1).max(40);
export const runtimeModeSchema = z.enum(["demo", "pilot"]);

export const classLimitsSchema = z.strictObject({
  grade: z.number().int().min(1).max(12),
  count: z.number().int().min(1).max(40),
});

// Domain identity never requires a local display name.
export const studentRefSchema = z.strictObject({
  id: randomIdSchema,
  classId: randomIdSchema,
  attendanceNumber: attendanceNumberSchema,
  active: z.boolean(),
});
export type StudentRef = z.infer<typeof studentRefSchema>;

export function parseBoundary<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  // Do not expose raw input or validation details to logs/telemetry.
  if (!result.success) throw new Error("Invalid boundary data");
  return result.data;
}
