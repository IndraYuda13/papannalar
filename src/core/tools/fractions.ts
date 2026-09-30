import {
  addRational,
  compareRational,
  rational,
  type Rational,
} from "../math/rational";
export type FractionValue = Readonly<{
  numerator: number;
  denominator: number;
}>;
export type FractionTask = Readonly<{
  kind: "fractions";
  operation: "represent" | "add" | "equivalent";
  left: FractionValue;
  right: FractionValue;
}>;
export type FractionBar = Readonly<{
  parts: number;
  selected: readonly number[];
  sign: 1 | -1;
  offset: number;
}>;
export type FractionFrame = readonly [FractionBar, FractionBar, FractionBar];
export type FractionState = Readonly<{
  bars: FractionFrame;
  history: readonly FractionFrame[];
}>;
export type FractionAction =
  | { type: "partition"; bar: 0 | 1 | 2; parts: number }
  | { type: "paint"; bar: 0 | 1 | 2; cell: number }
  | { type: "sign"; bar: 0 | 1 | 2 }
  | { type: "move"; bar: 0 | 1 | 2; offset: number }
  | { type: "equalize" }
  | { type: "undo" }
  | { type: "reset" };
export const FRACTION_WHOLE_WIDTH = 1060; // 1056 content pixels: 12 × 88, plus border.
const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
export function commonParts(a: number, b: number) {
  for (const n of [a, b])
    if (!Number.isInteger(n) || n < 2 || n > 12)
      throw new RangeError("Partition range 2–12");
  const lcm = (a * b) / gcd(a, b);
  if (lcm > 12) throw new RangeError("Common partition exceeds 12");
  return lcm;
}
export function validateFractionTask(task: FractionTask) {
  if (
    task.kind !== "fractions" ||
    !["represent", "add", "equivalent"].includes(task.operation)
  )
    throw new Error("Invalid fraction task");
  for (const value of [task.left, task.right])
    if (
      !Number.isInteger(value.numerator) ||
      !Number.isInteger(value.denominator) ||
      value.denominator < 2 ||
      value.denominator > 12 ||
      Math.abs(value.numerator) > value.denominator
    )
      throw new RangeError("Fraction task range");
  if (task.operation === "add")
    commonParts(task.left.denominator, task.right.denominator);
  if (
    task.operation === "equivalent" &&
    !Array.from({ length: 11 }, (_, i) => i + 2).some(
      (parts) =>
        parts !== task.left.denominator &&
        (task.left.numerator * parts) % task.left.denominator === 0,
    )
  )
    throw new RangeError("No different equivalent partition within 2–12");
  return task;
}
export function initialFractions(task: FractionTask): FractionState {
  validateFractionTask(task);
  return {
    bars: [
      { parts: task.left.denominator, selected: [], sign: 1, offset: 0 },
      { parts: task.right.denominator, selected: [], sign: 1, offset: 0 },
      { parts: 2, selected: [], sign: 1, offset: 0 },
    ],
    history: [],
  };
}
export function barValue(bar: FractionBar): Rational {
  return rational(bar.sign * bar.selected.length, bar.parts);
}
function partition(bar: FractionBar, parts: number): FractionBar {
  commonParts(parts, parts);
  const count = (bar.selected.length * parts) / bar.parts;
  return {
    ...bar,
    parts,
    selected: Number.isInteger(count)
      ? Array.from({ length: count }, (_, i) => i)
      : [],
  };
}
export function reduceFractions(
  state: FractionState,
  action: FractionAction,
  task: FractionTask,
): FractionState {
  if (action.type === "reset") return initialFractions(task);
  if (action.type === "undo")
    return state.history.length
      ? { bars: state.history.at(-1)!, history: state.history.slice(0, -1) }
      : state;
  if (state.history.length >= 100)
    throw new RangeError("Undo or reset before more actions");
  const bars: [FractionBar, FractionBar, FractionBar] = [...state.bars];
  if (action.type === "equalize") {
    const parts = commonParts(bars[0].parts, bars[1].parts);
    for (const i of [0, 1, 2] as const) bars[i] = partition(bars[i], parts);
  } else {
    const bar = bars[action.bar];
    if (!bar) throw new Error("Invalid bar");
    if (action.type === "partition")
      bars[action.bar] = partition(bar, action.parts);
    if (action.type === "sign")
      bars[action.bar] = { ...bar, sign: bar.sign === 1 ? -1 : 1 };
    if (action.type === "move") {
      if (!Number.isFinite(action.offset))
        throw new RangeError("Invalid offset");
      bars[action.bar] = {
        ...bar,
        offset: Math.max(-64, Math.min(64, action.offset)),
      };
    }
    if (action.type === "paint") {
      const limit = bar.parts * (action.bar === 2 ? 2 : 1);
      if (
        !Number.isInteger(action.cell) ||
        action.cell < 0 ||
        action.cell >= limit
      )
        throw new RangeError("Invalid cell");
      bars[action.bar] = {
        ...bar,
        selected: bar.selected.includes(action.cell)
          ? bar.selected.filter((n) => n !== action.cell)
          : [...bar.selected, action.cell].sort((a, b) => a - b),
      };
    }
  }
  return { bars, history: [...state.history, state.bars] };
}
export function checkFractions(state: FractionState, task: FractionTask) {
  validateFractionTask(task);
  if (
    state.bars.some(
      (bar, i) =>
        !Number.isInteger(bar.parts) ||
        bar.parts < 2 ||
        bar.parts > 12 ||
        ![1, -1].includes(bar.sign) ||
        new Set(bar.selected).size !== bar.selected.length ||
        bar.selected.some(
          (n) =>
            !Number.isInteger(n) || n < 0 || n >= bar.parts * (i === 2 ? 2 : 1),
        ),
    )
  )
    return { modelMatches: false, inspect: "partition" };
  const leftMatches =
    compareRational(
      barValue(state.bars[0]),
      rational(task.left.numerator, task.left.denominator),
    ) === 0;
  const rightMatches =
    compareRational(
      barValue(state.bars[1]),
      rational(task.right.numerator, task.right.denominator),
    ) === 0;
  const equivalent =
    compareRational(barValue(state.bars[0]), barValue(state.bars[1])) === 0 &&
    state.bars[0].parts !== state.bars[1].parts;
  const common = state.bars.every((bar) => bar.parts === state.bars[0].parts);
  const resultMatches =
    compareRational(
      barValue(state.bars[2]),
      addRational(
        rational(task.left.numerator, task.left.denominator),
        rational(task.right.numerator, task.right.denominator),
      ),
    ) === 0;
  return {
    modelMatches:
      leftMatches &&
      (task.operation === "represent" ||
        (task.operation === "equivalent"
          ? equivalent
          : rightMatches && common && resultMatches)),
    inspect: !leftMatches
      ? "left"
      : task.operation === "equivalent" && !equivalent
        ? "equivalence"
        : !rightMatches
          ? "right"
          : !common
            ? "equal-parts"
            : "combined",
  };
}
