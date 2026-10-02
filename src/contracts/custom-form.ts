import { z } from "zod";
import { parseBoundary, randomIdSchema } from "./domain";

export const customFormBindingSchema = z
  .strictObject({
    intent: z.literal("custom_assessment"),
    formId: randomIdSchema,
    version: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
    pageIndex: z.literal(0),
    rows: z.number().int().min(1).max(5),
  })
  .readonly();

export type CustomFormBinding = z.infer<typeof customFormBindingSchema>;

export function parseCustomFormBinding(value: unknown): CustomFormBinding {
  return parseBoundary(customFormBindingSchema, value);
}

/** Opaque form identity is allocated by the parent for one immutable run/version. */
export function customFormPayload(binding: CustomFormBinding): string {
  const form = parseCustomFormBinding(binding);
  return `PN|layout=1|intent=custom_assessment|form=${form.formId}|version=${form.version}|page=${form.pageIndex}|rows=${form.rows}`;
}
