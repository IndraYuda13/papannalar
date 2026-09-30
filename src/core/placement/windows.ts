import { STEP_IDS, getStep, type StepId } from "../../content/ladder/registry";
import { placementValue } from "../validation";
import type { ComputedLevel } from "./computed-level";

export type QuestionSlot = Readonly<{ rowIndex: number; stepId: StepId }>;

// Repeated top steps are separate one-based question slots, not duplicate evidence.
export function initialWindow(target: StepId): readonly QuestionSlot[] {
  const end = getStep(target).index;
  const start = Math.max(0, end - 9);
  return Object.freeze(
    Array.from({ length: 10 }, (_, index) =>
      Object.freeze({
        rowIndex: index + 1,
        stepId: STEP_IDS[Math.min(start + index, end)],
      }),
    ),
  );
}

// Callers provide displayed placements of ACTIVE pupils from the pre-session snapshot.
// K14: Lanjut anchors at target; near E4 shift left to retain five valid steps.
export function weeklyWindow(
  target: StepId,
  occupied: readonly ComputedLevel[],
): readonly StepId[] {
  const targetIndex = getStep(target).index;
  if (occupied.length === 0) throw new RangeError("No occupied placement");
  const lowest = Math.min(
    ...occupied.map((input) => {
      const placement = placementValue(input);
      return placement.kind === "lanjut"
        ? targetIndex
        : getStep(placement.stepId).index;
    }),
  );
  const start = Math.max(0, Math.min(lowest - 2, STEP_IDS.length - 5));
  return Object.freeze(STEP_IDS.slice(start, start + 5));
}
