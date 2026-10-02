import {
  addRational,
  subtractRational,
  rational,
  type Rational,
} from "../math/rational";
export type NumberLineTask = Readonly<{
  origin: Rational;
  delta: Rational;
  orientation: "horizontal" | "vertical";
}>;
export type NumberLineState = Readonly<{
  origin: Rational;
  current: Rational;
  jumps: readonly Readonly<{ from: Rational; to: Rational }>[];
  orientation: "horizontal" | "vertical";
}>;
export type NumberLineAction =
  | { type: "jump"; amount: Rational }
  | { type: "move"; to: Rational }
  | { type: "start"; at: Rational }
  | { type: "undo" }
  | { type: "reset" };
const copy = (n: Rational) => rational(n.numerator, n.denominator);
const equal = (a: Rational, b: Rational) =>
  a.numerator * b.denominator === b.numerator * a.denominator;
export function initialNumberLine(task: NumberLineTask): NumberLineState {
  if (!["horizontal", "vertical"].includes(task.orientation))
    throw new Error("Invalid orientation");
  return Object.freeze({
    origin: copy(task.origin),
    current: copy(task.origin),
    jumps: Object.freeze([]),
    orientation: task.orientation,
  });
}
export function reduceNumberLine(
  state: NumberLineState,
  action: NumberLineAction,
  task: NumberLineTask,
): NumberLineState {
  if (action.type === "reset") return initialNumberLine(task);
  if (action.type === "start")
    return initialNumberLine({ ...task, origin: copy(action.at) });
  if (action.type === "undo") {
    if (!state.jumps.length) return state;
    return Object.freeze({
      ...state,
      current: copy(state.jumps.at(-1)!.from),
      jumps: Object.freeze(state.jumps.slice(0, -1)),
    });
  }
  if (state.jumps.length >= 40)
    throw new RangeError("Undo or reset before more jumps");
  const to =
    action.type === "jump"
      ? addRational(state.current, action.amount)
      : copy(action.to);
  if (equal(state.current, to)) return state;
  return Object.freeze({
    ...state,
    current: to,
    jumps: Object.freeze([
      ...state.jumps,
      Object.freeze({ from: copy(state.current), to }),
    ]),
  });
}
export function checkNumberLine(state: NumberLineState, task: NumberLineTask) {
  const direction = task.delta.numerator < 0n ? -1n : 1n;
  let previous = task.origin;
  const sequence = state.jumps.every((jump) => {
    const delta = subtractRational(jump.to, jump.from);
    const valid =
      equal(previous, jump.from) && delta.numerator * direction > 0n;
    previous = jump.to;
    return valid;
  });
  const modelMatches =
    equal(state.origin, task.origin) &&
    equal(state.current, addRational(task.origin, task.delta)) &&
    sequence &&
    equal(previous, state.current) &&
    state.jumps.length > 0;
  return {
    modelMatches,
    feedbackKey: modelMatches
      ? ("model-matches" as const)
      : ("inspect-direction" as const),
  };
}
export function serializeNumberLine(state: NumberLineState) {
  const fraction = (n: Rational) => ({
    numerator: n.numerator.toString(),
    denominator: n.denominator.toString(),
  });
  return {
    origin: fraction(state.origin),
    current: fraction(state.current),
    orientation: state.orientation,
    jumps: state.jumps.map((j) => ({
      from: fraction(j.from),
      to: fraction(j.to),
    })),
  };
}
