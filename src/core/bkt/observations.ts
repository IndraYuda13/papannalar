import { assertProbability } from "../math/probability";
import {
  DEFAULT_BKT_PARAMETERS,
  updateBkt,
  type BktParameters,
} from "./update";

export type AnswerResult = "correct" | "incorrect" | "?" | "missing";
export type BktObservation =
  | Readonly<{ kind: "regular" | "oral"; answer: AnswerResult }>
  | Readonly<{
      kind: "exit-pair" | "oral-pair";
      answer: AnswerResult;
      reason: AnswerResult;
    }>;

export type ObservationUpdate =
  | Readonly<{ status: "pending"; probability: number }>
  | Readonly<{
      status: "updated";
      probability: number;
      correct: boolean;
      parameters: BktParameters;
    }>;

export function validateAnswer(value: unknown): asserts value is AnswerResult {
  if (
    value !== "correct" &&
    value !== "incorrect" &&
    value !== "?" &&
    value !== "missing"
  )
    throw new RangeError("Invalid answer result");
}

// No student/session identity, scoring keys, storage or network here.
// The caller supplies already-graded results; a pair creates exactly one update.
// Exit row 3 is a separate regular observation, not a second part of this pair.
export function observeBkt(
  prior: number,
  observation: BktObservation,
  transition: number = DEFAULT_BKT_PARAMETERS.T,
): ObservationUpdate {
  assertProbability(prior);
  assertProbability(transition);
  let answers: readonly AnswerResult[];
  let guess: number;
  let slip: number;
  switch (observation.kind) {
    case "regular":
      answers = [observation.answer];
      guess = DEFAULT_BKT_PARAMETERS.G;
      slip = DEFAULT_BKT_PARAMETERS.S;
      break;
    case "oral":
      answers = [observation.answer];
      guess = 0.05;
      slip = DEFAULT_BKT_PARAMETERS.S;
      break;
    case "exit-pair":
    case "oral-pair":
      answers = [observation.answer, observation.reason];
      guess = observation.kind === "oral-pair" ? 0.05 : 0.1;
      slip = 0.2;
      break;
    default:
      throw new RangeError("Invalid observation mode");
  }
  answers.forEach(validateAnswer);
  if (answers.includes("missing"))
    return { status: "pending", probability: prior };

  // ? in either pair position uses G=0; reason-position rule is provisional K12.
  const parameters = Object.freeze({
    T: transition,
    G: answers.includes("?") ? 0 : guess,
    S: slip,
  });
  const correct = answers.every((answer) => answer === "correct");
  return {
    status: "updated",
    probability: updateBkt(prior, correct, parameters),
    correct,
    parameters,
  };
}
