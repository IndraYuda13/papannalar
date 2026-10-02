import { parseStepId, type StepId } from "./registry";

// PRD target table. Grades 11–12 check prerequisites, not Phase F coverage.
export const CLASS_TARGETS = Object.freeze({
  1: "A2",
  2: "A4",
  3: "B2",
  4: "B4",
  5: "C2",
  6: "C4",
  7: "D5",
  8: "D6",
  9: "D6",
  10: "E4",
  11: "E4",
  12: "E4",
} as const satisfies Record<number, StepId>);

export type Grade = keyof typeof CLASS_TARGETS;

export function parseGrade(value: unknown): Grade {
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    !Object.hasOwn(CLASS_TARGETS, value)
  )
    throw new RangeError("Invalid grade");
  return value as Grade;
}

// A value to copy into a future session snapshot; never mutates mastery/history.
export function getClassTarget(grade: number, override?: StepId) {
  const validGrade = parseGrade(grade);
  return Object.freeze({
    grade: validGrade,
    stepId:
      override === undefined
        ? CLASS_TARGETS[validGrade]
        : parseStepId(override),
    prerequisiteOnly: validGrade >= 11,
  });
}
