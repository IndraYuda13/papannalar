export function assertProbability(value: unknown): asserts value is number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < 0 ||
    value > 1
  )
    throw new RangeError("Probability must be finite and within [0, 1]");
}
