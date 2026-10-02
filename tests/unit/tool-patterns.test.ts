import { describe, it, expect } from "vitest";
import {
  checkModel,
  exampleFrames,
  mistakenModel,
  modelResult,
  openAnswer,
  twinTask,
  type ToolTask,
} from "../../src/core/tools/patterns";
import { PointerOwnership } from "../../src/core/tools/pointers";
import { publicTool, publicToolSchema } from "../../src/contracts/tools";
import { reduceFractions } from "../../src/core/tools/fractions";
import {
  initialNumberLine,
  reduceNumberLine,
} from "../../src/core/tools/number-line";
import { rational } from "../../src/core/math/rational";
import { presentationStateSchema } from "../../src/contracts/presentation";
import { GRAPH_EXAMPLES } from "../../src/core/tools/graph-tasks";

const tasks: ToolTask[] = [
  {
    kind: "fractions",
    operation: "add",
    left: { numerator: 1, denominator: 2 },
    right: { numerator: 1, denominator: 3 },
  },
  {
    kind: "fractions",
    operation: "equivalent",
    left: { numerator: 1, denominator: 2 },
    right: { numerator: 1, denominator: 4 },
  },
  {
    kind: "fractions",
    operation: "represent",
    left: { numerator: 3, denominator: 4 },
    right: { numerator: 1, denominator: 4 },
  },
  { kind: "ratio", baseX: 2, baseY: 3, targetX: 6 },
  { kind: "ratio", baseX: 10000, baseY: 3, targetX: 1 },
  { kind: "algebra", groups: 3, xPerGroup: 1, constantPerGroup: 4 },
  {
    kind: "number-line",
    origin: { numerator: -3, denominator: 1 },
    delta: { numerator: -5, denominator: 1 },
    orientation: "horizontal",
  },
  {
    kind: "balance",
    left: { x: 3, constant: -7 },
    right: { x: 0, constant: 11 },
  },
  {
    kind: "balance",
    left: { x: 0, constant: 4 },
    right: { x: 2, constant: -7 },
  },
  {
    kind: "balance",
    left: { x: 2, constant: 0 },
    right: { x: 0, constant: 4 },
  },
  ...Object.values(GRAPH_EXAMPLES),
];
describe("M09 shared patterns", () => {
  it("Nala shows source misconceptions 2/5, 6:7, and 3x+4 without solved undo history", () => {
    const fraction = mistakenModel(tasks[0]),
      ratio = mistakenModel(tasks[3]),
      algebra = mistakenModel(tasks[5]);
    expect(modelResult(fraction)).toBe("1/2 · 1/3 · 2/5");
    expect(modelResult(ratio)).toBe("6 : 7");
    expect(modelResult(algebra)).toBe("3x + 4");
    if (fraction.kind === "fractions")
      expect(fraction.state.history).toEqual([]);
    if (algebra.kind === "algebra") expect(algebra.state.history).toEqual([]);
  });
  it.each(tasks)(
    "different worked example, exact frames, editable wrong model: %j",
    (task) => {
      const twin = twinTask(task);
      expect(twin).not.toEqual(task);
      expect(checkModel(twin, exampleFrames(twin).at(-1)!)).toBe(true);
      const solved = exampleFrames(task).at(-1)!;
      expect(checkModel(task, solved)).toBe(true);
      expect(checkModel(task, mistakenModel(task))).toBe(false);
      expect(modelResult(solved).length).toBeGreaterThan(0);
    },
  );
  it("open fractions deduplicate numeric equivalence, not cell IDs or denominators", () => {
    const task = {
      kind: "fractions",
      operation: "add",
      left: { numerator: 1, denominator: 2 },
      right: { numerator: 1, denominator: 2 },
    } as const;
    const model = exampleFrames(task).at(-1)!;
    if (model.kind !== "fractions") throw new Error("Wrong model");
    const first = openAnswer(task, model);
    let state = model.state;
    for (const bar of [0, 1, 2] as const)
      state = reduceFractions(
        state,
        { type: "partition", bar, parts: 12 },
        task,
      );
    expect(openAnswer(task, { kind: "fractions", state })).toBe(first);
    expect(first).toBe("1/2 + 1/2");
    expect(openAnswer(task, mistakenModel(task))).toBeNull();
  });
  it("open ratios reject inconsistent models; different scales are different pairs", () => {
    const task = tasks[3];
    expect(openAnswer(task, mistakenModel(task))).toBeNull();
    expect(openAnswer(task, exampleFrames(task).at(-1)!)).toBe("6 : 9");
  });
  it("number-line accepts two different exact paths, rejects wrong direction and keeps separate states", () => {
    const task = tasks[6];
    const t = {
      origin: rational(-3),
      delta: rational(-5),
      orientation: "horizontal" as const,
    };
    const first = initialNumberLine(t);
    const a = reduceNumberLine(
      first,
      { type: "jump", amount: rational(-5) },
      t,
    );
    const b = reduceNumberLine(
      reduceNumberLine(first, { type: "jump", amount: rational(-2) }, t),
      { type: "jump", amount: rational(-3) },
      t,
    );
    expect(openAnswer(task, { kind: "number-line", state: a })).not.toEqual(
      openAnswer(task, { kind: "number-line", state: b }),
    );
    expect(first.jumps).toHaveLength(0);
    expect(openAnswer(task, mistakenModel(task))).toBeNull();
  });
  it("public patterns do not carry a model, name, or key; unsupported equivalent partition rejected", () => {
    const task = tasks[6];
    const local = { ...task, name: "CANARY", answerKey: "A" };
    expect(publicTool(local)).toEqual(task);
    expect(
      publicToolSchema.safeParse({ ...task, name: "CANARY" }).success,
    ).toBe(false);
    expect(
      publicToolSchema.safeParse({
        kind: "fractions",
        operation: "equivalent",
        left: { numerator: 1, denominator: 7 },
        right: { numerator: 1, denominator: 2 },
      }).success,
    ).toBe(false);
    const base = {
      schemaVersion: 1,
      mode: "station",
      question: 1,
      taskEpoch: "10000000-0000-4000-8000-000000000001",
      groups: [],
      pattern: "build",
    };
    expect(presentationStateSchema.safeParse(base).success).toBe(false);
    expect(
      presentationStateSchema.safeParse({ ...base, tool: task }).success,
    ).toBe(true);
    expect(
      presentationStateSchema.safeParse({
        ...base,
        tool: task,
        studentName: "CANARY",
      }).success,
    ).toBe(false);
  });
  it("two pointer ownerships are independent; collision, palm, cancel and recapture", () => {
    const locks = new PointerOwnership();
    expect(locks.claim(1, "bar-a", 10, 10)).toBe(true);
    expect(locks.claim(2, "bar-a", 10, 10)).toBe(false);
    expect(locks.claim(1, "bar-b", 10, 10)).toBe(false);
    expect(locks.claim(2, "bar-b", 10, 10)).toBe(true);
    expect(locks.claim(3, "bar-c", 81, 10)).toBe(false);
    expect(locks.release(1)).toBe("bar-a");
    expect(locks.claim(3, "bar-a", 10, 10)).toBe(true);
    expect(locks.release(2)).toBe("bar-b");
    expect(locks.release(2)).toBeUndefined();
  });
});
