import { STEP_IDS, getStep, type StepId } from "../../content/ladder/registry";
import { validateAnswer, type AnswerResult } from "../bkt/observations";
import { INITIAL_MASTERY } from "../bkt/update";
import { integer, strictRecord } from "../validation";
import {
  computeLevel,
  type Mastery,
  type ComputedLevel,
} from "./computed-level";
import { initialWindow } from "./windows";

export type BelowRange =
  | Readonly<{ kind: "none" }>
  | Readonly<{ kind: "below-range"; lowestTestedStep: StepId }>;
export type InitialResponse = Readonly<{
  rowIndex: number;
  answer: AnswerResult;
}>;
export type InitialPlacement =
  | Readonly<{ status: "pending"; missingRows: readonly number[] }>
  | Readonly<{
      status: "placed";
      mastery: Mastery;
      computed: ComputedLevel;
      belowRange: BelowRange;
    }>;

// K03 conservative missing rule: incomplete initial checks create no mastery anchor.
// This is direct placement initialization; it NEVER invokes BKT on the ten answers.
export function initialPlacement(
  target: StepId,
  responses: readonly InitialResponse[],
): InitialPlacement {
  const slots = initialWindow(target);
  const answers = new Map<number, AnswerResult>();
  for (const input of responses) {
    const value = strictRecord(input, ["rowIndex", "answer"]);
    const row = integer(value.rowIndex, 1);
    validateAnswer(value.answer);
    if (row > 10 || answers.has(row))
      throw new RangeError("Invalid initial response row");
    answers.set(row, value.answer);
  }
  const missingRows = slots
    .filter(
      ({ rowIndex }) =>
        !answers.has(rowIndex) || answers.get(rowIndex) === "missing",
    )
    .map(({ rowIndex }) => rowIndex);
  if (missingRows.length)
    return Object.freeze({
      status: "pending",
      missingRows: Object.freeze(missingRows),
    });

  const failed = slots.find(
    ({ rowIndex }) => answers.get(rowIndex) !== "correct",
  );
  const boundary = failed
    ? getStep(failed.stepId).index
    : getStep(target).index + 1;
  const mastery = Object.freeze(
    Object.fromEntries(
      STEP_IDS.map((id, index) => [
        id,
        index < boundary ? 0.85 : INITIAL_MASTERY,
      ]),
    ) as Record<StepId, number>,
  );
  const belowRange: BelowRange =
    failed?.stepId === slots[0].stepId
      ? Object.freeze({
          kind: "below-range",
          lowestTestedStep: slots[0].stepId,
        })
      : Object.freeze({ kind: "none" });
  return Object.freeze({
    status: "placed",
    mastery,
    computed: computeLevel(mastery, target),
    belowRange,
  });
}
