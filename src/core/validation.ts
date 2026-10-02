import { STEP_IDS, parseStepId } from "../content/ladder/registry";
import { assertProbability } from "./math/probability";
import type { ComputedLevel, Mastery } from "./placement/computed-level";

// Small pure guards for persisted core records. No raw input in error messages.
export function strictRecord(
  input: unknown,
  keys: readonly string[],
): Record<string, unknown> {
  if (input === null || typeof input !== "object" || Array.isArray(input))
    throw new TypeError("Invalid core record");
  const prototype = Object.getPrototypeOf(input);
  if (prototype !== Object.prototype && prototype !== null)
    throw new TypeError("Invalid core record prototype");
  if (
    Object.keys(input).length !== keys.length ||
    !keys.every((key) => Object.hasOwn(input, key))
  )
    throw new TypeError("Unexpected core record fields");
  return input as Record<string, unknown>;
}

export function integer(input: unknown, minimum = 0): number {
  if (
    typeof input !== "number" ||
    !Number.isSafeInteger(input) ||
    input < minimum
  )
    throw new RangeError("Invalid core integer");
  return input;
}

// Same random UUID v4 identity contract as the outer DTO; no network/schema import.
export function randomId(input: unknown): string {
  if (
    typeof input !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      input,
    )
  )
    throw new TypeError("Invalid random identity");
  return input.toLowerCase();
}

export function oneOf<T extends string>(
  input: unknown,
  choices: readonly T[],
): T {
  if (!choices.some((choice) => choice === input))
    throw new RangeError("Invalid core variant");
  return input as T;
}

export function flag(input: unknown): boolean {
  if (typeof input !== "boolean") throw new TypeError("Invalid core flag");
  return input;
}

export function placementValue(input: unknown): ComputedLevel {
  const kind = (input as { kind?: unknown } | null)?.kind;
  const value = strictRecord(
    input,
    kind === "step" ? ["kind", "stepId"] : ["kind"],
  );
  if (value.kind === "step")
    return Object.freeze({ kind: "step", stepId: parseStepId(value.stepId) });
  if (value.kind === "lanjut") return Object.freeze({ kind: "lanjut" });
  throw new RangeError("Invalid placement");
}

export function samePlacement(
  left: ComputedLevel,
  right: ComputedLevel,
): boolean {
  return left.kind === "lanjut"
    ? right.kind === "lanjut"
    : right.kind === "step" && left.stepId === right.stepId;
}

export function copyMastery(input: Mastery): Mastery {
  const record = strictRecord(input, STEP_IDS);
  return Object.freeze(
    Object.fromEntries(
      STEP_IDS.map((id) => {
        const probability = record[id];
        assertProbability(probability);
        return [id, probability];
      }),
    ) as Record<(typeof STEP_IDS)[number], number>,
  );
}
