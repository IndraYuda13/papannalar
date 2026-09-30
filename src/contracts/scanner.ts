import { z } from "zod";
import { attendanceNumberSchema } from "./domain";
export const scanResultSchema = z.strictObject({
  status: z.enum(["accepted", "review", "rejected"]),
  kind: z.enum(["initial", "weekly", "exit"]),
  attendanceNumber: attendanceNumberSchema.nullable(),
  answers: z
    .array(
      z.strictObject({
        result: z.enum(["A", "B", "C", "D", "?", "missing"]),
        status: z.enum([
          "accepted",
          "blank",
          "multiple",
          "ambiguous",
          "missing",
        ]),
      }),
    )
    .max(10),
  issues: z
    .array(
      z.enum([
        "markers",
        "layout",
        "contrast",
        "attendance",
        "answers",
        "geometry",
        "blur",
      ]),
    )
    .max(7),
});
