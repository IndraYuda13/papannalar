import { expect, it } from "vitest";
import { rational } from "../../src/core/math/rational";
import { publicTool, publicToolSchema } from "../../src/contracts/tools";
import {
  initialRatio,
  reduceRatio,
  checkRatio,
  type RatioTask,
} from "../../src/core/tools/ratio";
import {
  initialAlgebra,
  reduceAlgebra,
  checkAlgebra,
  coefficients,
  type AlgebraTask,
  type AlgebraState,
} from "../../src/core/tools/algebra";
const ratio: RatioTask = { kind: "ratio", baseX: 2, baseY: 3, targetX: 6 };
it("tool projection strips private fields and strict schema rejects unknown fields", () => {
  expect(
    publicTool({ ...ratio, name: "LOCAL_CANARY", mastery: 0.8 } as RatioTask),
  ).toEqual(ratio);
  expect(
    publicTool({
      kind: "algebra",
      groups: 3,
      xPerGroup: 1,
      constantPerGroup: 4,
      answerKey: "A",
    } as AlgebraTask),
  ).toEqual({ kind: "algebra", groups: 3, xPerGroup: 1, constantPerGroup: 4 });
  expect(
    publicToolSchema.safeParse({ ...ratio, nickname: "LOCAL_CANARY" }).success,
  ).toBe(false);
});
it("TOOL03 scales both rows, rejects additive 6:7 even with target 6, and undoes", () => {
  const start = initialRatio(ratio),
    scaled = reduceRatio(
      start,
      { type: "scale", multiplier: rational(3) },
      ratio,
    );
  expect(scaled.columns[1]).toEqual({
    multiplier: rational(3),
    x: rational(6),
    y: rational(9),
  });
  expect(checkRatio(scaled, ratio).modelMatches).toBe(true);
  const additive = reduceRatio(
    scaled,
    { type: "cell", column: 1, axis: "y", value: rational(7) },
    ratio,
  );
  expect(checkRatio(additive, ratio)).toEqual({
    modelMatches: false,
    mismatchedColumns: [1],
  });
  expect(reduceRatio(additive, { type: "undo" }, ratio)).toEqual(scaled);
  expect(
    checkRatio(
      reduceRatio(start, { type: "scale", multiplier: rational(2) }, ratio),
      ratio,
    ).modelMatches,
  ).toBe(false);
});
it("TOOL03 exact fractional/unit-price multiplier and range guards", () => {
  const task: RatioTask = { kind: "ratio", baseX: 3, baseY: 1200, targetX: 1 };
  const state = reduceRatio(
    initialRatio(task),
    { type: "scale", multiplier: rational(1, 3) },
    task,
  );
  expect(state.columns[1].y).toEqual(rational(400));
  expect(checkRatio(state, task).modelMatches).toBe(true);
  expect(() =>
    reduceRatio(state, { type: "scale", multiplier: rational(0) }, task),
  ).toThrow();
  expect(() =>
    reduceRatio(
      state,
      { type: "cell", column: 0, axis: "x", value: rational(9) },
      task,
    ),
  ).toThrow();
  expect(reduceRatio(state, { type: "reset" }, task)).toEqual(
    initialRatio(task),
  );
});
const algebra: AlgebraTask = {
  kind: "algebra",
  groups: 3,
  xPerGroup: 1,
  constantPerGroup: 4,
};
function model(constants = [4, 4, 4]) {
  let state = initialAlgebra();
  constants.forEach((count, i) => {
    const groupId = `g${i}`;
    state = reduceAlgebra(state, { type: "group", id: groupId });
    state = reduceAlgebra(state, {
      type: "add",
      groupId,
      tile: { id: `x${i}`, kind: "x", sign: 1 },
    });
    for (let n = 0; n < count; n++)
      state = reduceAlgebra(state, {
        type: "add",
        groupId,
        tile: { id: `u${i}-${n}`, kind: "unit", sign: 1 },
      });
  });
  return state;
}
it("TOOL04 3(x+4) checks three groups, rejects 3x+4 and correct totals placed into wrong groups", () => {
  expect(checkAlgebra(model(), algebra).modelMatches).toBe(true);
  expect(checkAlgebra(model([4, 0, 0]), algebra).modelMatches).toBe(false);
  const misplaced = model([2, 6, 4]);
  expect(checkAlgebra(misplaced, algebra).total).toEqual({
    x: 3,
    constant: 12,
  });
  expect(checkAlgebra(misplaced, algebra).modelMatches).toBe(false);
  const moved = reduceAlgebra(model(), {
    type: "move",
    tileId: "u0-0",
    groupId: "g1",
  });
  expect(checkAlgebra(moved, algebra).modelMatches).toBe(false);
  expect(
    checkAlgebra(reduceAlgebra(moved, { type: "undo" }), algebra).modelMatches,
  ).toBe(true);
});
it("TOOL04 cancels only equal opposite tiles in same group and undo restores the pair", () => {
  let state: AlgebraState = reduceAlgebra(initialAlgebra(), {
    type: "group",
    id: "g",
  });
  for (const tile of [
    { id: "p", kind: "unit" as const, sign: 1 as const },
    { id: "n", kind: "unit" as const, sign: -1 as const },
    { id: "x", kind: "x" as const, sign: -1 as const },
  ])
    state = reduceAlgebra(state, { type: "add", groupId: "g", tile });
  expect(() =>
    reduceAlgebra(state, { type: "cancel", leftId: "p", rightId: "x" }),
  ).toThrow("Zero pairs");
  const cancelled = reduceAlgebra(state, {
    type: "cancel",
    leftId: "p",
    rightId: "n",
  });
  expect(cancelled.groups[0].tiles).toHaveLength(1);
  expect(coefficients(cancelled.groups[0].tiles)).toEqual(
    coefficients(state.groups[0].tiles),
  );
  expect(reduceAlgebra(cancelled, { type: "undo" })).toEqual(state);
  expect(reduceAlgebra(state, { type: "reset" })).toEqual(initialAlgebra());
});
