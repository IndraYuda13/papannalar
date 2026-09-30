import type { GraphTask } from "./graphs";
/** Bounded draft practice tasks. Never include assessment keys or student data. */
export const GRAPH_EXAMPLES = {
  linear: {
    kind: "graphs",
    mode: "linear",
    lines: [{ m: 2, b: 1 }],
    goal: { type: "value", x: 3 },
    domain: { minX: -5, maxX: 10, minY: -10, maxY: 30 },
  },
  intersection: {
    kind: "graphs",
    mode: "linear",
    lines: [
      { m: 1, b: 20 },
      { m: 5, b: 0 },
    ],
    goal: { type: "intersection" },
    domain: { minX: 0, maxX: 10, minY: -5, maxY: 60 },
  },
  inequalities: {
    kind: "graphs",
    mode: "inequalities",
    constraints: [
      { a: 1, b: 1, c: 4, operator: "le" },
      { a: 1, b: 0, c: 0, operator: "ge" },
      { a: 0, b: 1, c: 0, operator: "ge" },
    ],
    domain: { minX: -2, maxX: 6, minY: -2, maxY: 6 },
  },
  quadratic: {
    kind: "graphs",
    mode: "quadratic",
    a: 1,
    b: -5,
    c: 6,
    domain: { minX: -2, maxX: 6, minY: -4, maxY: 20 },
  },
  exponential: {
    kind: "graphs",
    mode: "exponential",
    base: { numerator: 2, denominator: 1 },
    scale: { numerator: 1, denominator: 1 },
    shift: 1,
    comparison: { m: 2, b: 2 },
    goal: { type: "target", y: { numerator: 16, denominator: 1 } },
    domain: { minX: 0, maxX: 6, minY: -5, maxY: 70 },
  },
} as const satisfies Record<string, GraphTask>;
export function twinGraph(t: GraphTask): GraphTask {
  if (t.mode === "linear" && t.goal.type === "intersection")
    return {
      ...GRAPH_EXAMPLES.intersection,
      lines: [
        { m: t.lines[0].m === 1 ? 2 : 1, b: 6 },
        { m: 4, b: 0 },
      ],
    };
  if (t.mode === "linear")
    return {
      ...GRAPH_EXAMPLES.linear,
      lines: [{ m: t.lines[0].m === 3 ? 4 : 3, b: 2 }],
      goal: { type: "value", x: 2 },
    };
  if (t.mode === "inequalities")
    return {
      ...GRAPH_EXAMPLES.inequalities,
      constraints: [
        { a: 1, b: 1, c: t.constraints[0].c === 5 ? 6 : 5, operator: "le" },
        { a: 1, b: 0, c: 0, operator: "ge" },
        { a: 0, b: 1, c: 0, operator: "ge" },
      ],
    };
  if (t.mode === "quadratic")
    return {
      ...GRAPH_EXAMPLES.quadratic,
      b: t.b === -4 ? -6 : -4,
      c: t.b === -4 ? 8 : 3,
    };
  return { ...GRAPH_EXAMPLES.exponential, shift: t.shift === 0 ? 1 : 0 };
}
