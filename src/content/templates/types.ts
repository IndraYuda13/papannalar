import type { StepId } from "../ladder/registry";
import type { Rational } from "../../core/math/rational";

export type ReviewMetadata = Readonly<{
  version: "1.0.0" | "2.0.0";
  status: "draft";
  reviewer: null;
  reviewedAt: null;
  sourceRef: string;
  contentHash: string;
}>;
export type Params = Readonly<{ a: number; b: number; c: number; d: number }>;
export type ExactAnswer =
  | Readonly<{ kind: "number"; value: Rational }>
  | Readonly<{ kind: "linear"; x: Rational; constant: Rational }>
  | Readonly<{ kind: "roots"; values: readonly Rational[] }>
  | Readonly<{ kind: "point"; x: Rational; y: Rational }>;
export type MathNode =
  | Readonly<{ kind: "text"; text: string }>
  | Readonly<{ kind: "fraction"; numerator: string; denominator: string }>;
export type MathPrompt = readonly MathNode[];
export type ChoiceLabel = "A" | "B" | "C" | "D";
export type Distractor = Readonly<{
  value: ExactAnswer;
  explanation: string;
  classification: "misconception" | "arithmetic-error";
  misconceptionCode?: string;
}>;
export type QuestionTemplate = Readonly<{
  id: string;
  stepId: StepId;
  metadata: ReviewMetadata;
  generateParams(seed: number): Params;
  validate(params: Params): readonly string[];
  solve(params: Params): ExactAnswer;
  render(params: Params): MathPrompt;
  reason(params: Params): string;
  distractors(params: Params): readonly Distractor[];
}>;
export type GeneratedQuestion = Readonly<{
  story?: import("../contexts/story-frames").StoryChoice;
  id: string;
  templateId: string;
  stepId: StepId;
  seed: number;
  params: Params;
  metadata: ReviewMetadata;
  mathFingerprint: string;
  prompt: MathPrompt;
  options: readonly Readonly<{
    label: ChoiceLabel;
    text: string;
    canonicalValue: string;
    classification: "correct" | "misconception" | "arithmetic-error";
    misconceptionCode?: string;
  }>[];
  answerKey: ChoiceLabel;
  reasons: readonly Readonly<{
    label: ChoiceLabel;
    text: string;
    classification: "correct" | "misconception" | "arithmetic-error";
    misconceptionCode?: string;
  }>[];
  reasonKey: ChoiceLabel;
  hints: readonly [string, string, string];
}>;
