import type { GeneratedQuestion } from "../../content/templates/types";
import type { ToolTask } from "../tools/patterns";
import { commonParts } from "../tools/fractions";
import type { ToolId } from "../../content/contexts/registry";
/** Map the actual mathematical parameters, never a canned replacement problem. */
export function questionTool(q: GeneratedQuestion): ToolTask | undefined {
  const { a, b, c, d } = q.params;
  switch (q.stepId) {
    case "C2":
      // A single displacement cannot model two sequences of multiples and
      // their first common term. Keep the KPK question for the book fallback.
      return undefined;
    case "D1":
      return {
        kind: "number-line",
        origin: { numerator: a, denominator: 1 },
        delta: { numerator: -b, denominator: 1 },
        orientation: "horizontal",
      };
    case "C3":
    case "D2":
      // Frozen v1 questions can need more than the board's 12 equal parts.
      // Keep the original question/key and use the explicit book-model fallback.
      try {
        commonParts(b, d);
      } catch {
        return undefined;
      }
      return {
        kind: "fractions",
        operation: "add",
        left: { numerator: a, denominator: b },
        right: { numerator: c, denominator: d },
      };
    case "A4":
    case "B4":
      return d
        ? undefined
        : {
            kind: "fractions",
            operation: "represent",
            left: { numerator: a, denominator: b },
            right: { numerator: 1, denominator: 2 },
          };
    case "C4":
      return { kind: "ratio", baseX: a, baseY: a * b, targetX: 1 };
    case "D3":
      return { kind: "ratio", baseX: a, baseY: b, targetX: a * c };
    case "D4":
      return { kind: "algebra", groups: a, xPerGroup: 1, constantPerGroup: b };
    case "D5":
      return {
        kind: "balance",
        left: { x: a, constant: b },
        right: { x: 0, constant: a * c + b },
      };
    case "D6":
      return {
        kind: "graphs",
        mode: "linear",
        lines: [{ m: a, b }],
        goal: { type: "value", x: c },
        domain: { minX: -2, maxX: 10, minY: -10, maxY: 80 },
      };
    case "E2":
      return {
        kind: "graphs",
        mode: "inequalities",
        constraints: [
          { a: 1, b: 1, c, operator: "le" },
          { a: 1, b: 0, c: 0, operator: "ge" },
          { a: 0, b: 1, c: 0, operator: "ge" },
        ],
        domain: { minX: -2, maxX: 16, minY: -2, maxY: 18 },
      };
    case "E3":
      return {
        kind: "graphs",
        mode: "quadratic",
        a: 1,
        b: -(a + b),
        c: a * b,
        domain: { minX: -2, maxX: 16, minY: -50, maxY: 200 },
      };
    case "E4":
      return {
        kind: "graphs",
        mode: "exponential",
        base: { numerator: a, denominator: 1 },
        scale: { numerator: 1, denominator: 1 },
        shift: b,
        comparison: { m: a, b: a ** b },
        goal: { type: "target", y: { numerator: a ** c, denominator: 1 } },
        domain: { minX: 0, maxX: 8, minY: 0, maxY: Math.max(32, a ** c * 2) },
      };
    default:
      return undefined;
  }
}

/** A set is supported only when every actual board question has an adapter. */
export function activityToolSupport(board: readonly GeneratedQuestion[]): {
  tool: ToolId | null;
  interactiveSupport: "supported" | "unavailable";
} {
  const tasks = board.map(questionTool);
  const tool = tasks[0]?.kind;
  return tool && tasks.every((task) => task?.kind === tool)
    ? { tool, interactiveSupport: "supported" }
    : { tool: null, interactiveSupport: "unavailable" };
}
