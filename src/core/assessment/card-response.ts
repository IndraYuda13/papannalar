import type { AssessmentBinding } from "./binding";
import { freezeRevision, type AssessmentRevision } from "./revisions";
import { integer, oneOf } from "../validation";

export const CARD_CHOICES = ["A", "B", "C", "D", "?", "missing"] as const;
export type CardChoice = (typeof CARD_CHOICES)[number];
export function gradeCard(
  binding: AssessmentBinding,
  keys: readonly string[],
  choices: readonly CardChoice[],
  revision: number,
  source: AssessmentRevision["source"],
): AssessmentRevision {
  integer(revision, 1);
  if (
    choices.length !== binding.questions.length ||
    keys.length !== choices.length
  )
    throw new Error("Incomplete card");
  return freezeRevision(binding, {
    assessmentId: binding.assessmentId,
    studentId: binding.studentId,
    sessionId: binding.sessionId,
    bindingVersion: binding.version,
    revision,
    baseRevision: revision - 1,
    source,
    responses: binding.questions.map((question, i) => {
      const answer = oneOf(choices[i], CARD_CHOICES);
      const key = oneOf(keys[i], ["A", "B", "C", "D"] as const);
      return {
        rowIndex: question.rowIndex,
        questionId: question.questionId,
        result:
          answer === "missing" || answer === "?"
            ? answer
            : answer === key
              ? "correct"
              : "incorrect",
      };
    }),
  });
}
