import { it, expect } from "vitest";
import { localToolModelSchema } from "../../src/local/library-board-progress";
import { emptyModel, type ToolTask } from "../../src/core/tools/patterns";
import { GRAPH_EXAMPLES } from "../../src/core/tools/graph-tasks";
const tasks: ToolTask[] = [
  {
    kind: "number-line",
    origin: { numerator: -3, denominator: 1 },
    delta: { numerator: -5, denominator: 1 },
    orientation: "horizontal",
  },
  {
    kind: "fractions",
    operation: "represent",
    left: { numerator: 1, denominator: 2 },
    right: { numerator: 0, denominator: 2 },
  },
  { kind: "ratio", baseX: 2, baseY: 3, targetX: 4 },
  { kind: "algebra", groups: 2, xPerGroup: 1, constantPerGroup: 2 },
  {
    kind: "balance",
    left: { x: 2, constant: 4 },
    right: { x: 0, constant: 10 },
  },
  Object.values(GRAPH_EXAMPLES)[0],
];
it.each(tasks)(
  "restores exact public tool progress for $kind without identity or ink",
  (task) => {
    const model = emptyModel(task);
    expect(localToolModelSchema.parse(structuredClone(model))).toEqual(model);
    expect(
      localToolModelSchema.safeParse({ ...model, nickname: "LOCAL_ONLY" })
        .success,
    ).toBe(false);
    expect(
      localToolModelSchema.safeParse({
        ...model,
        state: { ...model.state, ink: [[1, 2]] },
      }).success,
    ).toBe(false);
  },
);
it("refuses writing/free text as persisted progress", () => {
  expect(
    localToolModelSchema.safeParse({
      kind: "writing",
      state: { text: "PRIVATE" },
    }).success,
  ).toBe(false);
});
