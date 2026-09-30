import {
  getStep,
  parseStepId,
  type StepId,
} from "../../content/ladder/registry";
import { initialWindow } from "../placement/windows";
import { integer, oneOf, randomId, strictRecord } from "../validation";

export type BoundQuestion = Readonly<{
  rowIndex: number;
  questionId: string;
  stepId: StepId;
}>;
type BindingBase = Readonly<{
  assessmentId: string;
  studentId: string;
  sessionId: string;
  version: number;
  target: StepId;
  questions: readonly BoundQuestion[];
}>;
export type AssessmentBinding =
  | (BindingBase & Readonly<{ kind: "initial" | "weekly" }>)
  | (BindingBase &
      Readonly<{
        kind: "exit";
        delivery?: "oral";
        groupId: string;
        activityStep: StepId;
        exitBaseStep: StepId;
        exitContextStep: StepId;
      }>);

export function bindingKey(
  value: Pick<AssessmentBinding, "assessmentId" | "studentId">,
): string {
  return `${randomId(value.assessmentId)}/${randomId(value.studentId)}`;
}

export function freezeBinding(input: unknown): AssessmentBinding {
  const kind = oneOf((input as { kind?: unknown } | null)?.kind, [
    "initial",
    "weekly",
    "exit",
  ] as const);
  const keys = [
    "assessmentId",
    "studentId",
    "sessionId",
    "version",
    "kind",
    "target",
    "questions",
  ];
  const oral = kind === "exit" && Object.hasOwn(input as object, "delivery");
  if (oral) keys.push("delivery");
  const value = strictRecord(
    input,
    kind === "exit"
      ? [...keys, "groupId", "activityStep", "exitBaseStep", "exitContextStep"]
      : keys,
  );
  if (!Array.isArray(value.questions))
    throw new TypeError("Invalid bound questions");
  const questions = value.questions
    .map((input): BoundQuestion => {
      const row = strictRecord(input, ["rowIndex", "questionId", "stepId"]);
      return Object.freeze({
        rowIndex: integer(row.rowIndex, 1),
        questionId: randomId(row.questionId),
        stepId: parseStepId(row.stepId),
      });
    })
    .sort((a, b) => a.rowIndex - b.rowIndex);
  if (oral && (value.delivery !== "oral" || integer(value.version, 1) < 2))
    throw new Error("Oral exit needs binding version 2");
  const size = kind === "initial" ? 10 : kind === "weekly" ? 5 : oral ? 2 : 3;
  if (
    questions.length !== size ||
    questions.some((row, i) => row.rowIndex !== i + 1) ||
    new Set(questions.map((row) => row.questionId)).size !== size
  )
    throw new RangeError("Invalid assessment question slots");
  const target = parseStepId(value.target);
  const base = {
    assessmentId: randomId(value.assessmentId),
    studentId: randomId(value.studentId),
    sessionId: randomId(value.sessionId),
    version: integer(value.version, 1),
    target,
    questions: Object.freeze(questions),
  };
  if (
    kind === "initial" &&
    initialWindow(target).some((slot, i) => slot.stepId !== questions[i].stepId)
  )
    throw new RangeError("Initial binding does not match its target snapshot");
  if (
    kind === "weekly" &&
    questions.some(
      (row, i) =>
        getStep(row.stepId).index !== getStep(questions[0].stepId).index + i,
    )
  )
    throw new RangeError("Weekly binding must contain five consecutive steps");
  if (kind !== "exit") return Object.freeze({ ...base, kind });

  const exitBaseStep = parseStepId(value.exitBaseStep);
  const exitContextStep = parseStepId(value.exitContextStep);
  if (
    questions[0].stepId !== exitBaseStep ||
    questions[1].stepId !== exitBaseStep ||
    (!oral && questions[2].stepId !== exitContextStep) ||
    getStep(exitBaseStep).index > getStep(exitContextStep).index
  )
    throw new RangeError("Exit rows do not match frozen step assignments");
  return Object.freeze({
    ...base,
    kind,
    ...(oral ? { delivery: "oral" as const } : {}),
    groupId: randomId(value.groupId),
    activityStep: parseStepId(value.activityStep),
    exitBaseStep,
    exitContextStep,
  });
}

// One frozen assessment of each card kind per student/session. Camera retries do
// not allocate a second assessment ID; reusing an ID with another binding is an error.
export function canonicalBindings(
  inputs: readonly AssessmentBinding[],
): readonly AssessmentBinding[] {
  const bindings = new Map<string, AssessmentBinding>();
  const slots = new Map<string, string>();
  for (const input of inputs) {
    const binding = freezeBinding(input);
    const key = bindingKey(binding);
    const previous = bindings.get(key);
    if (previous && JSON.stringify(previous) !== JSON.stringify(binding))
      throw new Error("Frozen binding conflict");
    const slot = `${binding.studentId}/${binding.sessionId}/${binding.kind}`;
    if (slots.has(slot) && slots.get(slot) !== key)
      throw new Error("Duplicate assessment slot");
    slots.set(slot, key);
    bindings.set(key, binding);
  }
  return Object.freeze(
    [...bindings.values()].sort((a, b) =>
      compareIdentity(bindingKey(a), bindingKey(b)),
    ),
  );
}

export function compareIdentity(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}
