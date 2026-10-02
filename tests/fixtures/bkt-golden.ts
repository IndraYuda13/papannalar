import type { BktObservation } from "../../src/core/bkt/observations";

// Independently recomputed source references from TECH_SPEC 5.2, tolerance 1e-9.
// Every sequence starts at 0.3; consecutive updates retain full precision.
export const BKT_GOLDEN = [
  {
    label: "regular correct",
    observations: [{ kind: "regular", answer: "correct" }],
    expected: 0.692682926829,
  },
  {
    label: "regular incorrect",
    observations: [{ kind: "regular", answer: "incorrect" }],
    expected: 0.145762711864,
  },
  {
    label: "regular ?",
    observations: [{ kind: "regular", answer: "?" }],
    expected: 0.13698630137,
  },
  {
    label: "oral correct",
    observations: [{ kind: "oral", answer: "correct" }],
    expected: 0.896721311475,
  },
  {
    label: "exit pair correct",
    observations: [{ kind: "exit-pair", answer: "correct", reason: "correct" }],
    expected: 0.796774193548,
  },
  {
    label: "two correct pairs",
    observations: [
      { kind: "exit-pair", answer: "correct", reason: "correct" },
      { kind: "exit-pair", answer: "correct", reason: "correct" },
    ],
    expected: 0.972192251103,
  },
  {
    label: "exit pair incorrect",
    observations: [
      { kind: "exit-pair", answer: "incorrect", reason: "correct" },
    ],
    expected: 0.178260869565,
  },
  {
    label: "pair then regular context",
    observations: [
      { kind: "exit-pair", answer: "correct", reason: "correct" },
      { kind: "regular", answer: "correct" },
    ],
    expected: 0.951724137931,
  },
  {
    label: "exit pair ?",
    observations: [{ kind: "exit-pair", answer: "?", reason: "correct" }],
    expected: 0.171052631579,
  },
] as const satisfies readonly {
  label: string;
  observations: readonly BktObservation[];
  expected: number;
}[];
