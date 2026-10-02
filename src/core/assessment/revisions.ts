import {
  validateAnswer,
  type AnswerResult,
  type BktObservation,
} from "../bkt/observations";
import { integer, oneOf, randomId, strictRecord } from "../validation";
import {
  bindingKey,
  canonicalBindings,
  compareIdentity,
  freezeBinding,
  type AssessmentBinding,
} from "./binding";
import type { StepId } from "../../content/ladder/registry";

export type GradedResponse = Readonly<{
  rowIndex: number;
  questionId: string;
  result: AnswerResult;
}>;
// A revision is a COMPLETE graded card snapshot. Missing rows must be explicit.
// A partial camera correction must first merge into a complete snapshot in its adapter.
export type AssessmentRevision = Readonly<{
  assessmentId: string;
  studentId: string;
  sessionId: string;
  bindingVersion: number;
  revision: number;
  baseRevision: number;
  source: "omr" | "manual" | "demo";
  responses: readonly GradedResponse[];
}>;
export type ObservationRevision = Readonly<{
  id: string;
  studentId: string;
  sessionId: string;
  assessmentId: string;
  cardType: "weekly" | "exit";
  source: AssessmentRevision["source"];
  stepId: StepId;
  bindingVersion: number;
  revision: number;
  bktConfigVersion: 1;
  sessionOrdinal: number;
  assessmentOrder: number;
  observationOrder: number;
  questionIds: readonly string[];
  outcome: BktObservation;
}>;

const revisionKeys = [
  "assessmentId",
  "studentId",
  "sessionId",
  "bindingVersion",
  "revision",
  "baseRevision",
  "source",
  "responses",
];

export function freezeRevision(
  bindingInput: AssessmentBinding,
  input: unknown,
): AssessmentRevision {
  const binding = freezeBinding(bindingInput);
  const value = strictRecord(input, revisionKeys);
  const assessmentId = randomId(value.assessmentId);
  const studentId = randomId(value.studentId);
  const sessionId = randomId(value.sessionId);
  const bindingVersion = integer(value.bindingVersion, 1);
  if (
    assessmentId !== binding.assessmentId ||
    studentId !== binding.studentId ||
    sessionId !== binding.sessionId ||
    bindingVersion !== binding.version
  )
    throw new Error("Response does not match frozen binding");
  const revision = integer(value.revision, 1);
  const baseRevision = integer(value.baseRevision);
  if (revision - 1 !== baseRevision)
    throw new Error("Invalid revision predecessor");
  if (!Array.isArray(value.responses))
    throw new TypeError("Invalid assessment responses");
  const responses = value.responses
    .map((input): GradedResponse => {
      const row = strictRecord(input, ["rowIndex", "questionId", "result"]);
      validateAnswer(row.result);
      return Object.freeze({
        rowIndex: integer(row.rowIndex, 1),
        questionId: randomId(row.questionId),
        result: row.result,
      });
    })
    .sort((a, b) => a.rowIndex - b.rowIndex);
  if (
    responses.length !== binding.questions.length ||
    responses.some(
      (row, i) =>
        row.rowIndex !== i + 1 ||
        row.questionId !== binding.questions[i].questionId,
    )
  )
    throw new Error("Revision must contain every frozen question exactly once");
  return Object.freeze({
    assessmentId,
    studentId,
    sessionId,
    bindingVersion,
    revision,
    baseRevision,
    source: oneOf(value.source, ["omr", "manual", "demo"] as const),
    responses: Object.freeze(responses),
  });
}

// Revision numbers are writer/CAS revisions, never arrival timestamps. Identical
// retries collapse; any same-identity/same-revision payload conflict requires review.
export function canonicalRevisions(
  bindings: readonly AssessmentBinding[],
  inputs: readonly AssessmentRevision[],
): readonly AssessmentRevision[] {
  const byBinding = new Map(
    canonicalBindings(bindings).map((binding) => [
      bindingKey(binding),
      binding,
    ]),
  );
  const seen = new Map<string, string>();
  const latest = new Map<string, AssessmentRevision>();
  for (const input of inputs) {
    const raw = strictRecord(input, revisionKeys);
    const key = `${randomId(raw.assessmentId)}/${randomId(raw.studentId)}`;
    const binding = byBinding.get(key);
    if (!binding) throw new Error("Unbound assessment revision");
    const revision = freezeRevision(binding, input);
    const identity = `${key}/${revision.revision}`;
    const payload = JSON.stringify(revision);
    if (seen.has(identity) && seen.get(identity) !== payload)
      throw new Error("Assessment revision conflict");
    seen.set(identity, payload);
    if (!latest.has(key) || latest.get(key)!.revision < revision.revision)
      latest.set(key, revision);
  }
  return Object.freeze(
    [...latest.values()].sort((a, b) =>
      compareIdentity(bindingKey(a), bindingKey(b)),
    ),
  );
}

export function bindObservations(
  bindingInput: AssessmentBinding,
  revisionInput: AssessmentRevision,
  sessionOrdinal: number,
): readonly ObservationRevision[] {
  const binding = freezeBinding(bindingInput);
  const revision = freezeRevision(binding, revisionInput);
  integer(sessionOrdinal, 1);
  if (binding.kind === "initial") return Object.freeze([]);

  function observation(
    slot: string,
    order: number,
    rows: readonly number[],
    outcome: BktObservation,
  ): ObservationRevision {
    return Object.freeze({
      id: `${binding.sessionId}/${binding.studentId}/${binding.assessmentId}/${slot}`,
      studentId: binding.studentId,
      sessionId: binding.sessionId,
      assessmentId: binding.assessmentId,
      cardType: binding.kind as "weekly" | "exit",
      source: revision.source,
      stepId: binding.questions[rows[0] - 1].stepId,
      bindingVersion: binding.version,
      revision: revision.revision,
      bktConfigVersion: 1,
      sessionOrdinal,
      assessmentOrder: binding.kind === "weekly" ? 1 : 2,
      observationOrder: order,
      questionIds: Object.freeze(
        rows.map((row) => binding.questions[row - 1].questionId),
      ),
      outcome: Object.freeze(outcome),
    });
  }
  if (binding.kind === "weekly")
    return Object.freeze(
      revision.responses.map((response, i) =>
        observation(`row-${response.rowIndex}`, i, [response.rowIndex], {
          kind: "regular",
          answer: response.result,
        }),
      ),
    );
  const pair = observation("pair-1-2", 0, [1, 2], {
    kind:
      binding.kind === "exit" && binding.delivery === "oral"
        ? "oral-pair"
        : "exit-pair",
    answer: revision.responses[0].result,
    reason: revision.responses[1].result,
  });
  if (binding.kind === "exit" && binding.delivery === "oral")
    return Object.freeze([pair]);
  return Object.freeze([
    pair,
    observation("context-3", 1, [3], {
      kind: "regular",
      answer: revision.responses[2].result,
    }),
  ]);
}
