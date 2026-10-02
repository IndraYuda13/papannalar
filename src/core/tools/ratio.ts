import {
  rational,
  multiplyRational,
  compareRational,
  type Rational,
} from "../math/rational";
export type RatioTask = Readonly<{
  kind: "ratio";
  baseX: number;
  baseY: number;
  targetX: number;
}>;
export type RatioColumn = Readonly<{
  multiplier: Rational;
  x: Rational;
  y: Rational;
}>;
export type RatioState = Readonly<{
  columns: readonly RatioColumn[];
  history: readonly (readonly RatioColumn[])[];
}>;
export type RatioAction =
  | { type: "scale"; multiplier: Rational }
  | { type: "cell"; column: number; axis: "x" | "y"; value: Rational }
  | { type: "undo" }
  | { type: "reset" };
export function validateRatioTask(task: RatioTask) {
  if (
    task.kind !== "ratio" ||
    ![task.baseX, task.targetX].every(
      (n) => Number.isInteger(n) && n > 0 && n <= 10000,
    ) ||
    !Number.isInteger(task.baseY) ||
    task.baseY < 1 ||
    task.baseY > 50000
  )
    throw new RangeError("Invalid ratio task");
  return task;
}
export function initialRatio(task: RatioTask): RatioState {
  validateRatioTask(task);
  return {
    columns: [
      {
        multiplier: rational(1),
        x: rational(task.baseX),
        y: rational(task.baseY),
      },
    ],
    history: [],
  };
}
export function reduceRatio(
  state: RatioState,
  action: RatioAction,
  task: RatioTask,
): RatioState {
  if (action.type === "reset") return initialRatio(task);
  if (action.type === "undo")
    return state.history.length
      ? { columns: state.history.at(-1)!, history: state.history.slice(0, -1) }
      : state;
  if (state.history.length >= 100) throw new RangeError("Undo or reset first");
  let columns = [...state.columns];
  if (action.type === "scale") {
    const m = rational(
      action.multiplier.numerator,
      action.multiplier.denominator,
    );
    if (
      m.numerator <= 0n ||
      m.numerator > 10000n ||
      m.denominator > 10000n ||
      columns.length >= 6
    )
      throw new RangeError("Multiplier/column limit");
    columns.push({
      multiplier: m,
      x: multiplyRational(rational(task.baseX), m),
      y: multiplyRational(rational(task.baseY), m),
    });
  } else {
    if (
      !Number.isInteger(action.column) ||
      action.column < 1 ||
      action.column >= columns.length
    )
      throw new RangeError("Base column is fixed");
    const value = rational(action.value.numerator, action.value.denominator);
    if (
      value.numerator < 0n ||
      value.numerator > 1000000n ||
      value.denominator > 10000n
    )
      throw new RangeError("Cell limit");
    columns = columns.map((c, i) =>
      i === action.column ? { ...c, [action.axis]: value } : c,
    );
  }
  return { columns, history: [...state.history, state.columns] };
}
export function checkRatio(state: RatioState, task: RatioTask) {
  validateRatioTask(task);
  const mismatchedColumns = state.columns.flatMap((column, i) =>
    compareRational(
      column.x,
      multiplyRational(rational(task.baseX), column.multiplier),
    ) === 0 &&
    compareRational(
      column.y,
      multiplyRational(rational(task.baseY), column.multiplier),
    ) === 0
      ? []
      : [i],
  );
  return {
    modelMatches:
      mismatchedColumns.length === 0 &&
      state.columns
        .slice(1)
        .some((c) => compareRational(c.x, rational(task.targetX)) === 0),
    mismatchedColumns,
  };
}
