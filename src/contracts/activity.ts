import { z } from "zod";
import { randomIdSchema, parseBoundary } from "./domain";
import {
  publicQuestionSchema,
  mathNodeSchema,
  type PublicQuestion,
} from "./package";
export const checkContentSchema = z.strictObject({
  packageId: randomIdSchema,
  revision: z.number().int().positive(),
  total: z.union([z.literal(5), z.literal(10)]),
  seconds: z.union([z.literal(60), z.literal(75), z.literal(80)]),
  question: publicQuestionSchema,
});
export const activitySchema = z.strictObject({
  id: randomIdSchema,
  groupId: randomIdSchema,
  index: z.number().int().min(1).max(3),
  total: z.number().int().min(2).max(3),
  prompt: z.array(mathNodeSchema).min(1).max(20),
  independent: z
    .array(
      z.strictObject({
        groupId: randomIdSchema,
        prompts: z.array(z.array(mathNodeSchema).min(1).max(20)).length(3),
      }),
    )
    .max(2),
});
export type PublicActivity = z.infer<typeof activitySchema>;
export function publicQuestion(input: PublicQuestion): PublicQuestion {
  return parseBoundary(publicQuestionSchema, {
    id: input.id,
    prompt: input.prompt.map((n) =>
      n.kind === "text"
        ? { kind: n.kind, text: n.text }
        : { kind: n.kind, numerator: n.numerator, denominator: n.denominator },
    ),
    options: input.options.map((o) => ({ label: o.label, text: o.text })),
    unknownLabel: "?",
  });
}
export function publicActivity(input: PublicActivity): PublicActivity {
  const prompt = (nodes: PublicActivity["prompt"]) =>
    nodes.map((n) =>
      n.kind === "text"
        ? { kind: n.kind, text: n.text }
        : { kind: n.kind, numerator: n.numerator, denominator: n.denominator },
    );
  return parseBoundary(activitySchema, {
    id: input.id,
    groupId: input.groupId,
    index: input.index,
    total: input.total,
    prompt: prompt(input.prompt),
    independent: input.independent.map((g) => ({
      groupId: g.groupId,
      prompts: g.prompts.map(prompt),
    })),
  });
}
