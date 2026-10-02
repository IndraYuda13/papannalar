import { z } from "zod";
import { parseBoundary } from "./domain";
import { publicToolSchema, publicTool } from "./tools";
import type { Lesson } from "../core/package/opening";
export const lessonSchema = z.strictObject({
  prompt: z.string().min(1).max(500),
  followup: z.string().min(1).max(500),
  objective: z.string().min(1).max(500),
  why: z.string().min(1).max(500),
  intuitiveOnly: z.boolean(),
  oralReflection: z.boolean(),
  tool: publicToolSchema.optional(),
});
export type PublicLesson = z.infer<typeof lessonSchema>;
export function publicLesson(value: Lesson): PublicLesson {
  return parseBoundary(lessonSchema, {
    prompt: value.prompt,
    followup: value.followup,
    objective: value.objective,
    why: value.why,
    intuitiveOnly: value.intuitiveOnly,
    oralReflection: value.oralReflection,
    ...(value.tool ? { tool: publicTool(value.tool) } : {}),
  });
}
