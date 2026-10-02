import { assertProbability } from "../math/probability";

export const INITIAL_MASTERY = 0.3;
export const MASTERY_THRESHOLD = 0.8;
export type BktParameters = Readonly<{ T: number; G: number; S: number }>;
export const DEFAULT_BKT_PARAMETERS: BktParameters = Object.freeze({
  T: 0.1,
  G: 0.2,
  S: 0.1,
});

// PRD section 5 / TECH_SPEC 5.2: Bayes first, learning transition second.
// Number at full precision; never round per update or use epsilon to boost mastery.
// This primitive consumes ONE observation; dedup/replay belongs to the session layer.
export function updateBkt(
  prior: number,
  correct: boolean,
  parameters: BktParameters = DEFAULT_BKT_PARAMETERS,
): number {
  assertProbability(prior);
  if (typeof correct !== "boolean") throw new TypeError("Invalid observation");
  const { T, G, S } = parameters;
  assertProbability(T);
  assertProbability(G);
  assertProbability(S);

  const knownEvidence = prior * (correct ? 1 - S : S);
  const unknownEvidence = (1 - prior) * (correct ? G : 1 - G);
  const denominator = knownEvidence + unknownEvidence;
  if (denominator === 0)
    throw new RangeError("Observation has zero probability under this model");

  const posterior = knownEvidence / denominator;
  const probability = posterior + (1 - posterior) * T;
  assertProbability(probability);
  return probability;
}
