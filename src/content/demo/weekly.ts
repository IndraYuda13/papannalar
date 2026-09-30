import {
  addRational,
  rational,
  subtractRational,
} from "../../core/math/rational";
import type { StepId } from "../ladder/registry";
import { demoStep } from "./class-7b";
import { getStep } from "../ladder/registry";
import type { CardChoice } from "../../core/assessment/card-response";

// Small versioned PRELIM fixture, not a reviewed all-step question generator.
const fraction = addRational(rational(1, 2), rational(1, 4));
const signed = subtractRational(rational(-3), rational(5));
export const DEMO_WEEKLY = [
  {
    stepId: "C3",
    text: "½ + ¼ = …",
    options: ["¾", "⅔", "¼", "1"],
    correct: `${fraction.numerator}/${fraction.denominator}`,
    values: ["3/4", "2/3", "1/4", "1"],
  },
  {
    stepId: "C4",
    text: "0,5 meter = … sentimeter",
    options: ["5", "50", "500", "0,05"],
    correct: String(0.5 * 100),
    values: ["5", "50", "500", "0.05"],
  },
  {
    stepId: "D1",
    text: "−3 − 5 = …",
    options: ["2", "−2", "−8", "8"],
    correct: String(signed.numerator),
    values: ["2", "-2", "-8", "8"],
  },
  {
    stepId: "D2",
    text: "−½ + ¾ = …",
    options: ["−¼", "−5/4", "5/4", "¼"],
    correct: "1/4",
    values: ["-1/4", "-5/4", "5/4", "1/4"],
  },
  {
    stepId: "D3",
    text: "2 buku berharga Rp6.000. Harga 5 buku adalah …",
    options: ["Rp15.000", "Rp12.000", "Rp9.000", "Rp30.000"],
    correct: String((6000 / 2) * 5),
    values: ["15000", "12000", "9000", "30000"],
  },
] as const satisfies readonly {
  stepId: StepId;
  text: string;
  options: readonly string[];
  correct: string;
  values: readonly string[];
}[];
export const DEMO_KEYS = DEMO_WEEKLY.map(
  (q) =>
    (["A", "B", "C", "D"] as const)[
      (q.values as readonly string[]).indexOf(q.correct)
    ],
);
export const DEMO_TEMPLATE = {
  version: 1,
  status: "draft",
  reviewer: null,
} as const;
export function demoAnswers(attendance: number): readonly CardChoice[] {
  const rank = getStep(demoStep(attendance)).index;
  return DEMO_WEEKLY.map((q, i) => {
    // Exactly five of seven D1 students choose the D1.2 distractor (-2).
    if (q.stepId === "D1" && attendance <= 7)
      return attendance <= 5 ? "B" : "C";
    return getStep(q.stepId).index < rank ? DEMO_KEYS[i] : "?";
  });
}
