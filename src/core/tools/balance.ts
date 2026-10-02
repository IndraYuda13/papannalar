import {
  rational,
  addRational,
  subtractRational,
  multiplyRational,
  divideRational,
  compareRational,
  type Rational,
} from "../math/rational";

export type BalanceTask = Readonly<{
  kind: "balance";
  left: Readonly<{ x: number; constant: number }>;
  right: Readonly<{ x: number; constant: number }>;
}>;
/** A normalized linear AST. x is a symbolic term, never an invented weight. */
export type LinearExpression = Readonly<{
  kind: "linear";
  x: Rational;
  constant: Rational;
}>;
export type BalanceOperation =
  | Readonly<{ kind: "add"; term: "x" | "constant"; value: Rational }>
  | Readonly<{ kind: "multiply" | "divide"; value: Rational }>;
export type BalanceFrame = Readonly<{
  left: LinearExpression;
  right: LinearExpression;
  operation: BalanceOperation | null;
}>;
export type BalanceState = Readonly<{
  frame: BalanceFrame;
  history: readonly BalanceFrame[];
}>;
export type BalanceAction =
  | { type: "operate"; operation: BalanceOperation }
  | { type: "undo" }
  | { type: "reset" };
const eq = (a: Rational, b: Rational) => compareRational(a, b) === 0;
const zero = rational(0),
  one = rational(1);
function bounded(value: Rational) {
  const v = rational(value.numerator, value.denominator);
  if (
    (v.numerator < 0n ? -v.numerator : v.numerator) > 1000000n ||
    v.denominator > 1000000n
  )
    throw new RangeError("Balance value bounds");
  return v;
}
export function validateBalanceTask(task: BalanceTask) {
  if (
    task.kind !== "balance" ||
    task.left.x === task.right.x ||
    [task.left, task.right].some(
      (side) =>
        !Number.isInteger(side.x) ||
        Math.abs(side.x) > 12 ||
        !Number.isInteger(side.constant) ||
        Math.abs(side.constant) > 1000,
    )
  )
    throw new RangeError("Balance task bounds or no unique solution");
  return task;
}
export function initialBalance(task: BalanceTask): BalanceState {
  validateBalanceTask(task);
  return {
    frame: {
      left: {
        kind: "linear",
        x: rational(task.left.x),
        constant: rational(task.left.constant),
      },
      right: {
        kind: "linear",
        x: rational(task.right.x),
        constant: rational(task.right.constant),
      },
      operation: null,
    },
    history: [],
  };
}
function operate(
  expression: LinearExpression,
  raw: BalanceOperation,
): LinearExpression {
  const value = bounded(raw.value);
  if (!["add", "multiply", "divide"].includes(raw.kind))
    throw new RangeError("Unknown balance operation");
  if (raw.kind !== "add" && value.numerator === 0n)
    throw new RangeError("Cannot scale equation by zero");
  if (raw.kind === "add") {
    if (!["x", "constant"].includes(raw.term))
      throw new RangeError("Unknown balance term");
    return {
      kind: "linear",
      x: bounded(
        raw.term === "x" ? addRational(expression.x, value) : expression.x,
      ),
      constant: bounded(
        raw.term === "constant"
          ? addRational(expression.constant, value)
          : expression.constant,
      ),
    };
  }
  const operation = raw.kind === "divide" ? divideRational : multiplyRational;
  return {
    kind: "linear",
    x: bounded(operation(expression.x, value)),
    constant: bounded(operation(expression.constant, value)),
  };
}
const same = (a: LinearExpression, b: LinearExpression) =>
  a.kind === "linear" &&
  b.kind === "linear" &&
  eq(a.x, b.x) &&
  eq(a.constant, b.constant);
export function reduceBalance(
  state: BalanceState,
  action: BalanceAction,
  task: BalanceTask,
): BalanceState {
  validateBalanceTask(task);
  if (action.type === "reset") return initialBalance(task);
  if (action.type === "undo")
    return state.history.length
      ? { frame: state.history.at(-1)!, history: state.history.slice(0, -1) }
      : state;
  if (state.history.length >= 60)
    throw new RangeError("Undo or reset before more operations");
  const left = operate(state.frame.left, action.operation),
    right = operate(state.frame.right, action.operation);
  if (same(left, state.frame.left) && same(right, state.frame.right))
    return state;
  const operation: BalanceOperation =
    action.operation.kind === "add"
      ? {
          kind: "add",
          term: action.operation.term,
          value: bounded(action.operation.value),
        }
      : { kind: action.operation.kind, value: bounded(action.operation.value) };
  return {
    frame: { left, right, operation },
    history: [...state.history, state.frame],
  };
}
export function equivalentBalance(
  frame: BalanceFrame,
  task: BalanceTask,
): boolean {
  try {
    validateBalanceTask(task);
    const x = subtractRational(bounded(frame.left.x), bounded(frame.right.x));
    const c = subtractRational(
      bounded(frame.left.constant),
      bounded(frame.right.constant),
    );
    const originalX = rational(task.left.x - task.right.x),
      originalC = rational(task.left.constant - task.right.constant);
    return (
      x.numerator !== 0n &&
      eq(multiplyRational(x, originalC), multiplyRational(c, originalX))
    );
  } catch {
    return false;
  }
}
export function checkBalance(state: BalanceState, task: BalanceTask) {
  const mismatchedSides = new Set<"left" | "right">();
  let legalHistory = state.history.length > 0 && state.history.length <= 60;
  const frames = [...state.history, state.frame],
    original = initialBalance(task).frame;
  if (!same(frames[0].left, original.left)) mismatchedSides.add("left");
  if (!same(frames[0].right, original.right)) mismatchedSides.add("right");
  for (let index = 1; index < frames.length; index++) {
    const previous = frames[index - 1],
      current = frames[index];
    if (!current.operation) {
      legalHistory = false;
      continue;
    }
    try {
      for (const side of ["left", "right"] as const)
        if (!same(operate(previous[side], current.operation), current[side]))
          mismatchedSides.add(side);
    } catch {
      legalHistory = false;
    }
  }
  const { left, right } = state.frame;
  const isolated =
    (eq(left.x, one) && eq(left.constant, zero) && eq(right.x, zero)) ||
    (eq(right.x, one) && eq(right.constant, zero) && eq(left.x, zero));
  const equivalent = equivalentBalance(state.frame, task);
  return {
    modelMatches:
      legalHistory && !mismatchedSides.size && equivalent && isolated,
    equivalent,
    isolated,
    legalHistory: legalHistory && !mismatchedSides.size,
    mismatchedSides: [...mismatchedSides],
  };
}
export function exampleBalance(task: BalanceTask): BalanceState[] {
  let state = initialBalance(task);
  const frames = [state];
  const step = (operation: BalanceOperation) => {
    const next = reduceBalance(state, { type: "operate", operation }, task);
    if (next !== state) {
      state = next;
      frames.push(state);
    }
  };
  step({
    kind: "add",
    term: "x",
    value: rational(
      -state.frame.right.x.numerator,
      state.frame.right.x.denominator,
    ),
  });
  step({
    kind: "add",
    term: "constant",
    value: rational(
      -state.frame.left.constant.numerator,
      state.frame.left.constant.denominator,
    ),
  });
  step({ kind: "divide", value: state.frame.left.x });
  if (frames.length === 1) {
    step({ kind: "add", term: "constant", value: one });
    step({ kind: "add", term: "constant", value: rational(-1) });
  }
  return frames;
}
/** Deliberately inconsistent Nala frame; undo returns to its exact valid parent. */
export function mistakenBalance(
  task: BalanceTask,
  code: "D5.1" | "D5.2" | "D5.3" = task.left.constant ? "D5.1" : "D5.3",
): BalanceState {
  let state = initialBalance(task);
  if (task.right.x !== 0) {
    state = reduceBalance(
      state,
      {
        type: "operate",
        operation: {
          kind: "add",
          term: "x",
          value: rational(-task.right.x),
        },
      },
      task,
    );
  }
  let frame: BalanceFrame;
  if (code === "D5.1") {
    if (!task.left.constant) throw new RangeError("No constant to transfer");
    const operation: BalanceOperation = {
      kind: "add",
      term: "constant",
      value: rational(-task.left.constant),
    };
    frame = {
      operation,
      left: operate(state.frame.left, operation),
      right: {
        ...state.frame.right,
        constant: rational(task.right.constant + task.left.constant),
      },
    };
  } else if (code === "D5.2") {
    if (!task.left.constant) throw new RangeError("No unscaled constant");
    const operation: BalanceOperation = {
      kind: "divide",
      value: rational(
        Math.abs(task.left.x - task.right.x) >= 2
          ? task.left.x - task.right.x
          : 2,
      ),
    };
    frame = {
      operation,
      left: {
        ...operate(state.frame.left, operation),
        constant: state.frame.left.constant,
      },
      right: operate(state.frame.right, operation),
    };
  } else {
    state = reduceBalance(
      state,
      {
        type: "operate",
        operation: {
          kind: "add",
          term: "constant",
          value: rational(-task.left.constant),
        },
      },
      task,
    );
    // Nala subtracts the coefficient instead of dividing. Preserve that
    // attempted operation even if the final number happens to coincide.
    const operation: BalanceOperation = {
      kind: "add",
      term: "constant",
      value: rational(
        -state.frame.left.x.numerator,
        state.frame.left.x.denominator,
      ),
    };
    frame = {
      operation,
      left: { kind: "linear", x: one, constant: zero },
      right: operate(state.frame.right, operation),
    };
  }
  return { frame, history: [...state.history, state.frame] };
}
