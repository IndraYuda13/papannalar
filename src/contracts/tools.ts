import { z } from "zod";
import { parseBoundary } from "./domain";
import { validateFractionTask } from "../core/tools/fractions";
import type { ToolTask } from "../core/tools/patterns";
import { graphToolSchema, publicGraph } from "./graphs";
const exactValue = z.strictObject({
  numerator: z.number().int().min(-10000).max(10000),
  denominator: z.number().int().min(1).max(10000),
});
const fraction = z.strictObject({
  numerator: z.number().int().min(-12).max(12),
  denominator: z.number().int().min(2).max(12),
});
const fractionToolSchema = z
  .strictObject({
    kind: z.literal("fractions"),
    operation: z.enum(["represent", "add", "equivalent"]),
    left: fraction,
    right: fraction,
  })
  .refine((t) => {
    try {
      validateFractionTask(t);
      return true;
    } catch {
      return false;
    }
  });
const elementaryToolSchema = z.discriminatedUnion("kind", [
  z.strictObject({
    kind: z.literal("number-line"),
    origin: exactValue,
    delta: exactValue.refine((v) => v.numerator !== 0),
    orientation: z.enum(["horizontal", "vertical"]),
  }),
  fractionToolSchema,
  z.strictObject({
    kind: z.literal("ratio"),
    baseX: z.number().int().min(1).max(10000),
    baseY: z.number().int().min(1).max(50000),
    targetX: z.number().int().min(1).max(10000),
  }),
  z.strictObject({
    kind: z.literal("algebra"),
    groups: z.number().int().min(1).max(6),
    xPerGroup: z.number().int().min(-3).max(3),
    constantPerGroup: z.number().int().min(-9).max(9),
  }),
  z
    .strictObject({
      kind: z.literal("balance"),
      left: z.strictObject({
        x: z.number().int().min(-12).max(12),
        constant: z.number().int().min(-1000).max(1000),
      }),
      right: z.strictObject({
        x: z.number().int().min(-12).max(12),
        constant: z.number().int().min(-1000).max(1000),
      }),
    })
    .refine((t) => t.left.x !== t.right.x),
]);
export const publicToolSchema = z.union([
  elementaryToolSchema,
  graphToolSchema,
]);
export type PublicTool = z.infer<typeof publicToolSchema>;
export function publicTool(input: ToolTask): PublicTool {
  if (input.kind === "graphs")
    return parseBoundary(graphToolSchema, publicGraph(input));
  if (input.kind === "balance")
    return parseBoundary(publicToolSchema, {
      kind: input.kind,
      left: { x: input.left.x, constant: input.left.constant },
      right: { x: input.right.x, constant: input.right.constant },
    });
  if (input.kind === "number-line")
    return parseBoundary(publicToolSchema, {
      kind: input.kind,
      origin: {
        numerator: input.origin.numerator,
        denominator: input.origin.denominator,
      },
      delta: {
        numerator: input.delta.numerator,
        denominator: input.delta.denominator,
      },
      orientation: input.orientation,
    });
  if (input.kind === "ratio")
    return parseBoundary(publicToolSchema, {
      kind: input.kind,
      baseX: input.baseX,
      baseY: input.baseY,
      targetX: input.targetX,
    });
  if (input.kind === "algebra")
    return parseBoundary(publicToolSchema, {
      kind: input.kind,
      groups: input.groups,
      xPerGroup: input.xPerGroup,
      constantPerGroup: input.constantPerGroup,
    });
  return parseBoundary(publicToolSchema, {
    kind: input.kind,
    operation: input.operation,
    left: {
      numerator: input.left.numerator,
      denominator: input.left.denominator,
    },
    right: {
      numerator: input.right.numerator,
      denominator: input.right.denominator,
    },
  });
}
