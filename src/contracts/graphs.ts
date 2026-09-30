import { z } from "zod";
import { validateGraphTask, type GraphTask } from "../core/tools/graphs";
const line = z.strictObject({
  m: z.number().int().min(-12).max(12),
  b: z.number().int().min(-100).max(100),
});
const positiveExact = z.strictObject({
  numerator: z.number().int().min(1).max(10000),
  denominator: z.number().int().min(1).max(10000),
});
const domain = z.strictObject({
  minX: z.number().int().min(-16).max(15),
  maxX: z.number().int().min(-15).max(16),
  minY: z.number().int().min(-1000000).max(999999),
  maxY: z.number().int().min(-999999).max(1000000),
});
const atValue = z.strictObject({
  type: z.literal("value"),
  x: z.number().int().min(-16).max(16),
});
// Structural allowlist is also emitted into a new SQL migration; semantic checks follow.
export const graphShapeSchema = z.discriminatedUnion("mode", [
  z.strictObject({
    kind: z.literal("graphs"),
    mode: z.literal("linear"),
    domain,
    lines: z.array(line).min(1).max(2),
    goal: z.discriminatedUnion("type", [
      atValue,
      z.strictObject({ type: z.literal("intersection") }),
    ]),
  }),
  z.strictObject({
    kind: z.literal("graphs"),
    mode: z.literal("inequalities"),
    domain,
    constraints: z
      .array(
        z.strictObject({
          a: z.number().int().min(-12).max(12),
          b: z.number().int().min(-12).max(12),
          c: z.number().int().min(-100).max(100),
          operator: z.enum(["le", "lt", "ge", "gt"]),
        }),
      )
      .min(2)
      .max(4),
  }),
  z.strictObject({
    kind: z.literal("graphs"),
    mode: z.literal("quadratic"),
    domain,
    a: z.number().int().min(-12).max(12),
    b: z.number().int().min(-40).max(40),
    c: z.number().int().min(-200).max(200),
  }),
  z.strictObject({
    kind: z.literal("graphs"),
    mode: z.literal("exponential"),
    domain,
    base: positiveExact,
    scale: positiveExact,
    shift: z.number().int().min(-6).max(6),
    comparison: line,
    goal: z.discriminatedUnion("type", [
      atValue,
      z.strictObject({
        type: z.literal("target"),
        y: z.strictObject({
          numerator: z.number().int().min(1).max(1000000),
          denominator: z.number().int().min(1).max(1000000),
        }),
      }),
    ]),
  }),
]);
export const graphToolSchema = graphShapeSchema.refine((t) => {
  try {
    validateGraphTask(t);
    return true;
  } catch {
    return false;
  }
});
export function publicGraph(t: GraphTask): GraphTask {
  const domain = {
    minX: t.domain.minX,
    maxX: t.domain.maxX,
    minY: t.domain.minY,
    maxY: t.domain.maxY,
  };
  switch (t.mode) {
    case "linear":
      return {
        kind: "graphs",
        mode: t.mode,
        domain,
        lines: t.lines.map((l) => ({ m: l.m, b: l.b })),
        goal:
          t.goal.type === "intersection"
            ? { type: "intersection" }
            : { type: "value", x: t.goal.x },
      };
    case "inequalities":
      return {
        kind: "graphs",
        mode: t.mode,
        domain,
        constraints: t.constraints.map((q) => ({
          a: q.a,
          b: q.b,
          c: q.c,
          operator: q.operator,
        })),
      };
    case "quadratic":
      return { kind: "graphs", mode: t.mode, domain, a: t.a, b: t.b, c: t.c };
    case "exponential":
      return {
        kind: "graphs",
        mode: t.mode,
        domain,
        base: { numerator: t.base.numerator, denominator: t.base.denominator },
        scale: {
          numerator: t.scale.numerator,
          denominator: t.scale.denominator,
        },
        shift: t.shift,
        comparison: { m: t.comparison.m, b: t.comparison.b },
        goal:
          t.goal.type === "value"
            ? { type: "value", x: t.goal.x }
            : {
                type: "target",
                y: {
                  numerator: t.goal.y.numerator,
                  denominator: t.goal.y.denominator,
                },
              },
      };
  }
}
