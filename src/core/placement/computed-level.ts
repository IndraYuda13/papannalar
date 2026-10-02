import { STEP_IDS, getStep, type StepId } from "../../content/ladder/registry";
import { INITIAL_MASTERY, MASTERY_THRESHOLD } from "../bkt/update";
import { assertProbability } from "../math/probability";

export type Mastery = Readonly<Record<StepId, number>>;
// Computed only. Displayed/stabilized placement is a separate M02-b concern.
export type ComputedLevel =
  Readonly<{ kind: "step"; stepId: StepId }> | Readonly<{ kind: "lanjut" }>;

export function createMastery(initial: number = INITIAL_MASTERY): Mastery {
  assertProbability(initial);
  return Object.freeze(
    Object.fromEntries(STEP_IDS.map((id) => [id, initial])) as Record<
      StepId,
      number
    >,
  );
}

export function isMastered(probability: number): boolean {
  assertProbability(probability);
  // The tolerance for reference tests must not promote a value below 0.8.
  return probability >= MASTERY_THRESHOLD;
}

export function computeLevel(mastery: Mastery, target: StepId): ComputedLevel {
  const targetIndex = getStep(target).index;
  // Incomplete/invalid state fails explicitly, including entries above target.
  for (const step of STEP_IDS) assertProbability(mastery[step]);
  for (const step of STEP_IDS.slice(0, targetIndex + 1)) {
    if (!isMastered(mastery[step])) return { kind: "step", stepId: step };
  }
  return { kind: "lanjut" };
}
