import { z } from "zod";
import { randomIdSchema } from "./domain";
import { customFormBindingSchema } from "./custom-form";
export const printAssignmentSchema = z.strictObject({
  assignmentId: randomIdSchema.nullable(),
  runId: randomIdSchema,
  collectionId: randomIdSchema,
  title: z.string().max(90),
  version: z.number().int().positive(),
  code: z.string().max(80),
  items: z
    .array(
      z.strictObject({
        id: randomIdSchema,
        prompt: z.string().max(400),
        options: z.tuple([
          z.string().max(400),
          z.string().max(400),
          z.string().max(400),
          z.string().max(400),
        ]),
      }),
    )
    .min(1)
    .max(5),
  binding: customFormBindingSchema,
});
export type PrintAssignment = z.infer<typeof printAssignmentSchema>;
