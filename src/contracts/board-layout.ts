import { z } from "zod";
import { parseBoundary, randomIdSchema } from "./domain";
import { mathNodeSchema } from "./package";
import { publicTool, publicToolSchema } from "./tools";

export const RESUMABLE_MODES = [
  "opening",
  "continuation",
  "station",
  "together",
  "split",
] as const;
export const splitSchema = z.strictObject({
  panels: z
    .array(
      z.strictObject({
        groupId: randomIdSchema,
        exercises: z
          .array(
            z.strictObject({
              id: randomIdSchema,
              prompt: z.array(mathNodeSchema).min(1).max(20),
              tool: publicToolSchema.optional(),
            }),
          )
          .min(2)
          .max(3),
      }),
    )
    .min(2)
    .max(4),
});
export type PublicSplit = z.infer<typeof splitSchema>;
export const spotlightSchema = z.strictObject({
  id: randomIdSchema,
  returnMode: z.enum(RESUMABLE_MODES),
  groupId: randomIdSchema.optional(),
  tool: publicToolSchema,
});
export const boardLayoutSchema = z.strictObject({
  touchZone: z.enum(["normal", "sd"]),
  largeObjects: z.boolean(),
});
export function publicSplit(input: PublicSplit): PublicSplit {
  return parseBoundary(splitSchema, {
    panels: input.panels.map((p) => ({
      groupId: p.groupId,
      exercises: p.exercises.map((e) => ({
        id: e.id,
        prompt: e.prompt.map((n) =>
          n.kind === "text"
            ? { kind: n.kind, text: n.text }
            : {
                kind: n.kind,
                numerator: n.numerator,
                denominator: n.denominator,
              },
        ),
        ...(e.tool ? { tool: publicTool(e.tool) } : {}),
      })),
    })),
  });
}
