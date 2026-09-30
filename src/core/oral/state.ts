import {
  getStep,
  nextStep,
  previousStep,
  stepAtClampedIndex,
  STEP_IDS,
  type StepId,
} from "../../content/ladder/registry";
import { getClassTarget } from "../../content/ladder/targets";
import { seededGroupId } from "../math/seed";
import { generateQuestion } from "../package/question";
import { observeBkt } from "../bkt/observations";
import type { ComputedLevel, Mastery } from "../placement/computed-level";
import { copyMastery, integer, randomId } from "../validation";

export type OralResult = "correct" | "incorrect" | "silent";
export type OralAnswer = Readonly<{
  questionId: string;
  stepId: StepId;
  result: OralResult;
  misconceptionCode: string | null;
}>;
export type OralRun = Readonly<{
  schemaVersion: 1;
  id: string;
  classId: string;
  studentId: string;
  attendanceNumber: number;
  target: StepId;
  start: StepId;
  seed: number;
  revision: number;
  afterSessionOrdinal: number;
  sequence?: number;
  baseline: Mastery;
  answers: readonly OralAnswer[];
  skipped: boolean;
  provisional: "K13";
}>;
export function createOralRun(input: {
  id: string;
  classId: string;
  studentId: string;
  attendanceNumber: number;
  grade: number;
  target?: StepId;
  recorded?: StepId;
  seed: number;
  baseline?: Mastery;
  afterSessionOrdinal?: number;
}): OralRun {
  const target = getClassTarget(input.grade, input.target).stepId;
  const anchor = Math.min(
    getStep(target).index,
    getStep(input.recorded ?? target).index,
  );
  integer(input.seed);
  if (input.seed > 0xffffffff) throw new RangeError("Invalid seed");
  integer(input.attendanceNumber, 1);
  if (input.attendanceNumber > 40) throw new RangeError("Invalid attendance");
  return {
    schemaVersion: 1,
    id: randomId(input.id),
    classId: randomId(input.classId),
    studentId: randomId(input.studentId),
    attendanceNumber: input.attendanceNumber,
    target,
    start: stepAtClampedIndex(anchor - 2),
    seed: input.seed,
    revision: 1,
    afterSessionOrdinal: integer(input.afterSessionOrdinal ?? 0),
    baseline: input.baseline
      ? copyMastery(input.baseline)
      : (Object.fromEntries(STEP_IDS.map((step) => [step, 0.3])) as Mastery),
    answers: [],
    skipped: false,
    provisional: "K13",
  };
}
function questionAt(run: OralRun, step: StepId) {
  const seed =
    (run.seed + Math.imul(getStep(step).index + 1, 2654435761)) >>> 0;
  return {
    // Oral schema v1 pins content v1 so an existing run never reinterprets a question.
    ...generateQuestion(step, seed, 1),
    id: seededGroupId(run.seed, getStep(step).index + 1),
  };
}
// Replay always starts at baseline. Undo/corrections therefore cannot accumulate extra BKT evidence.
export function evaluateOral(run: OralRun) {
  let current: StepId | null = run.start;
  let direction: "up" | "down" = "up",
    lowestFailure: StepId | null = null;
  let placement: ComputedLevel | null = null;
  const mastery = { ...copyMastery(run.baseline) };
  const seen = new Set<string>();
  if (
    run.answers.length > 22 ||
    getStep(run.start).index > getStep(run.target).index
  )
    throw new Error("Invalid oral path");
  for (const [index, answer] of run.answers.entries()) {
    if (
      !current ||
      answer.stepId !== current ||
      answer.questionId !== questionAt(run, current).id ||
      seen.has(answer.questionId)
    )
      throw new Error("Oral answer is not bound to current question");
    if (!["correct", "incorrect", "silent"].includes(answer.result))
      throw new Error("Invalid oral result");
    if (
      answer.misconceptionCode &&
      (answer.result !== "incorrect" ||
        !questionAt(run, current).options.some(
          (o) => o.misconceptionCode === answer.misconceptionCode,
        ))
    )
      throw new Error("Unmapped oral diagnosis");
    seen.add(answer.questionId);
    const result = observeBkt(mastery[current], {
      kind: "oral",
      answer: answer.result === "correct" ? "correct" : "incorrect",
    });
    mastery[current] = result.probability;
    if (answer.result !== "correct") {
      lowestFailure = current;
      if (index === 0 || direction === "down") {
        direction = "down";
        if (current === "A1") {
          placement = { kind: "step", stepId: "A1" };
          current = null;
        } else current = previousStep(current)!;
      } else {
        placement = { kind: "step", stepId: current };
        current = null;
      }
    } else if (direction === "down") {
      placement = { kind: "step", stepId: lowestFailure! };
      current = null;
    } else if (current === run.target) {
      placement = { kind: "lanjut" };
      current = null;
    } else current = nextStep(current)!;
  }
  if (run.skipped && !current)
    throw new Error("Completed oral run cannot be skipped");
  return {
    status: !current
      ? ("complete" as const)
      : run.skipped
        ? ("skipped" as const)
        : ("active" as const),
    currentStep: current,
    question: current ? questionAt(run, current) : null,
    mastery,
    placement,
    observationCount: run.answers.length,
    override: placement
      ? {
          source: "oral-placement" as const,
          sourceRunId: run.id,
          placement,
          provisional: "K13" as const,
        }
      : null,
  };
}
export function answerOral(
  run: OralRun,
  input: Omit<OralAnswer, "stepId">,
): OralRun {
  const duplicate = run.answers.find((a) => a.questionId === input.questionId);
  if (duplicate) {
    if (
      duplicate.result === input.result &&
      duplicate.misconceptionCode === input.misconceptionCode
    )
      return run;
    throw new Error("Use undo to correct an oral answer");
  }
  const state = evaluateOral(run);
  if (
    state.status !== "active" ||
    !state.currentStep ||
    state.question?.id !== input.questionId
  )
    throw new Error("Oral question unavailable");
  const next = {
    ...run,
    revision: run.revision + 1,
    answers: [
      ...run.answers,
      {
        questionId: input.questionId,
        stepId: state.currentStep,
        result: input.result,
        misconceptionCode: input.misconceptionCode,
      },
    ],
  };
  evaluateOral(next);
  return next;
}
export function undoOral(run: OralRun): OralRun {
  if (!run.answers.length) return run;
  return {
    ...run,
    revision: run.revision + 1,
    answers: run.answers.slice(0, -1),
    skipped: false,
  };
}
export function skipOral(run: OralRun): OralRun {
  if (evaluateOral(run).status !== "active") return run;
  return { ...run, revision: run.revision + 1, skipped: true };
}
export function resumeOral(run: OralRun): OralRun {
  return run.skipped
    ? { ...run, revision: run.revision + 1, skipped: false }
    : run;
}
