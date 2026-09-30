import { CONTEXTS } from "../../content/contexts/registry";
import type { TeacherPackage } from "./build";
import type { ToolTask } from "../tools/patterns";
import { GRAPH_EXAMPLES } from "../tools/graph-tasks";
export type Lesson = Readonly<{
  prompt: string;
  followup: string;
  objective: string;
  why: string;
  intuitiveOnly: boolean;
  oralReflection: boolean;
  tool?: ToolTask;
}>;
function model(prompt: string): ToolTask | undefined {
  if (prompt === CONTEXTS.D6.opening) return GRAPH_EXAMPLES.intersection;
  if (prompt === CONTEXTS.D1.opening)
    return {
      kind: "number-line",
      origin: { numerator: -2, denominator: 1 },
      delta: { numerator: 7, denominator: 1 },
      orientation: "vertical",
    };
  if (prompt === CONTEXTS.C3.opening)
    return {
      kind: "fractions",
      operation: "add",
      left: { numerator: 2, denominator: 3 },
      right: { numerator: 1, denominator: 4 },
    };
  if (prompt === CONTEXTS.A4.opening)
    return {
      kind: "fractions",
      operation: "represent",
      left: { numerator: 1, denominator: 4 },
      right: { numerator: 1, denominator: 2 },
    };
  if (prompt === CONTEXTS.D3.opening)
    return { kind: "ratio", baseX: 2, baseY: 3, targetX: 6 };
  return undefined;
}
export function openingFromPackage(
  value: Pick<TeacherPackage, "opening" | "grade">,
): Lesson {
  const tool = model(value.opening.prompt);
  return {
    prompt: value.opening.prompt,
    followup: value.opening.followup,
    objective: value.opening.objective,
    why: value.opening.why,
    intuitiveOnly: value.grade <= 6,
    oralReflection: value.grade <= 3,
    ...(tool ? { tool } : {}),
  };
}
export function demoOpening(grade: number): Lesson {
  const context = CONTEXTS[grade <= 6 ? "C3" : grade <= 9 ? "D1" : "D6"];
  return openingFromPackage({
    grade,
    opening: {
      prompt: context.opening,
      followup: context.followup,
      objective: context.use,
      why: context.why,
    },
  });
}
