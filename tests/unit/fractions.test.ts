import { expect, it } from "vitest";
import {
  initialFractions,
  reduceFractions,
  checkFractions,
  commonParts,
  barValue,
  type FractionTask,
  type FractionState,
} from "../../src/core/tools/fractions";
import { rational } from "../../src/core/math/rational";
import { generateQuestion } from "../../src/core/package/question";
import { publicTool } from "../../src/contracts/tools";
const task: FractionTask = {
  kind: "fractions",
  operation: "add",
  left: { numerator: 1, denominator: 2 },
  right: { numerator: 1, denominator: 3 },
};
function fill(
  state: FractionState,
  bar: 0 | 1 | 2,
  count: number,
  input = task,
) {
  let next = state;
  for (let i = 0; i < count; i++)
    next = reduceFractions(next, { type: "paint", bar, cell: i }, input);
  return next;
}
it("TOOL02 1/2+1/3=5/6 checks operands and equal-sized model, not only result", () => {
  let state = fill(fill(initialFractions(task), 0, 1), 1, 1);
  const before = state;
  state = reduceFractions(state, { type: "equalize" }, task);
  expect(state.bars.map(barValue)).toEqual([
    rational(1, 2),
    rational(1, 3),
    rational(0),
  ]);
  expect(state.bars.map((b) => b.parts)).toEqual([6, 6, 6]);
  expect(reduceFractions(state, { type: "undo" }, task).bars).toEqual(
    before.bars,
  );
  state = fill(state, 2, 5);
  expect(checkFractions(state, task).modelMatches).toBe(true);
  const missingOperand = reduceFractions(
    state,
    { type: "paint", bar: 0, cell: 0 },
    task,
  );
  expect(checkFractions(missingOperand, task).modelMatches).toBe(false);
  const misconception = reduceFractions(
    state,
    { type: "partition", bar: 2, parts: 5 },
    task,
  );
  expect(checkFractions(fill(misconception, 2, 2), task).modelMatches).toBe(
    false,
  );
});
it("TOOL02 2/3+1/4=11/12, signed amounts, values above a whole and undo/reset", () => {
  for (const [a, b, c, d] of [
    [2, 3, 1, 4],
    [-1, 2, 3, 4],
    [2, 3, 3, 4],
    [-1, 2, -1, 3],
  ]) {
    const input: FractionTask = {
      ...task,
      left: { numerator: a, denominator: b },
      right: { numerator: c, denominator: d },
    };
    let state = fill(
      fill(initialFractions(input), 0, Math.abs(a), input),
      1,
      Math.abs(c),
      input,
    );
    if (a < 0) state = reduceFractions(state, { type: "sign", bar: 0 }, input);
    if (c < 0) state = reduceFractions(state, { type: "sign", bar: 1 }, input);
    state = reduceFractions(state, { type: "equalize" }, input);
    const parts = state.bars[2].parts,
      result = (a * parts) / b + (c * parts) / d;
    state = fill(state, 2, Math.abs(result), input);
    if (result < 0)
      state = reduceFractions(state, { type: "sign", bar: 2 }, input);
    expect(checkFractions(state, input).modelMatches).toBe(true);
    const moved = reduceFractions(
      state,
      { type: "move", bar: 0, offset: 24 },
      input,
    );
    expect(barValue(moved.bars[0])).toEqual(barValue(state.bars[0]));
    expect(reduceFractions(moved, { type: "undo" }, input)).toEqual(state);
    expect(reduceFractions(state, { type: "reset" }, input)).toEqual(
      initialFractions(input),
    );
  }
});
it("represent/equivalent models preserve whole, and reject unsupported partition", () => {
  const equivalent: FractionTask = {
    ...task,
    operation: "equivalent",
    right: { numerator: 0, denominator: 4 },
  };
  const state = fill(
    fill(initialFractions(equivalent), 0, 1, equivalent),
    1,
    2,
    equivalent,
  );
  expect(checkFractions(state, equivalent).modelMatches).toBe(true);
  expect(
    checkFractions(state, { ...equivalent, operation: "represent" })
      .modelMatches,
  ).toBe(true);
  expect(() => commonParts(5, 12)).toThrow("exceeds");
  expect(() => commonParts(1, 2)).toThrow();
  expect(() =>
    reduceFractions(state, { type: "paint", bar: 0, cell: 5 }, equivalent),
  ).toThrow();
  expect(() =>
    reduceFractions(state, { type: "move", bar: 0, offset: NaN }, equivalent),
  ).toThrow();
});
it("500 seeds per C3/D2 stay within renderable common partition and public allowlist", () => {
  for (const step of ["C3", "D2"] as const)
    for (let seed = 0; seed < 500; seed++) {
      const q = generateQuestion(step, seed),
        { a, b, c, d } = q.params;
      const descriptor = publicTool({
        ...task,
        left: { numerator: a, denominator: b },
        right: { numerator: c, denominator: d },
        name: "LOCAL_CANARY",
        answerKey: q.answerKey,
      } as typeof task);
      if (descriptor.kind !== "fractions")
        throw new Error("Expected fraction descriptor");
      expect(
        commonParts(descriptor.left.denominator, descriptor.right.denominator),
      ).toBeLessThanOrEqual(12);
      expect(JSON.stringify(descriptor)).not.toMatch(
        /LOCAL_CANARY|answerKey|stepId|name/,
      );
    }
});
it("content v2 has a new identity while legacy oral v1 parameters remain stable", () => {
  const old = generateQuestion("C3", 71, 1),
    current = generateQuestion("C3", 71);
  expect(old.metadata.version).toBe("1.0.0");
  expect(current.metadata.version).toBe("2.0.0");
  expect(current.id).not.toBe(old.id);
  expect(old).toEqual(generateQuestion("C3", 71, 1));
});
