import { describe, expect, it } from "vitest";
import { rational } from "../../src/core/math/rational";
import { publicTool, publicToolSchema } from "../../src/contracts/tools";
import {
  checkModel,
  openAnswer,
  exampleFrames,
} from "../../src/core/tools/patterns";
import {
  initialBalance,
  reduceBalance,
  checkBalance,
  equivalentBalance,
  exampleBalance,
  mistakenBalance,
  validateBalanceTask,
  type BalanceTask,
} from "../../src/core/tools/balance";
const task: BalanceTask = {
  kind: "balance",
  left: { x: 3, constant: -7 },
  right: { x: 0, constant: 11 },
};
describe("TOOL05 symbolic equation balance", () => {
  it("public allowlist drops local identity, solution and operation history recursively", () => {
    const local = {
      ...task,
      name: "CANARY",
      solution: 6,
      history: [],
      left: { ...task.left, stepId: "D5", name: "CANARY" },
    };
    expect(publicTool(local)).toEqual(task);
    expect(publicToolSchema.safeParse(local).success).toBe(false);
    expect(
      publicToolSchema.safeParse({
        ...task,
        left: { ...task.left, constant: 1001 },
      }).success,
    ).toBe(false);
    expect(
      publicToolSchema.safeParse({ ...task, right: { ...task.left } }).success,
    ).toBe(false);
  });
  it("D5.3 cannot pass by coincidence (2x=4, x=4−2)", () => {
    const t = {
      kind: "balance",
      left: { x: 2, constant: 0 },
      right: { x: 0, constant: 4 },
    } as const;
    const wrong = mistakenBalance(t, "D5.3");
    expect(checkBalance(wrong, t)).toMatchObject({
      equivalent: true,
      isolated: true,
      legalHistory: false,
      modelMatches: false,
    });
  });
  it("open challenge accepts distinct exact operation paths, with independent model states", () => {
    const first = exampleFrames(task).at(-1)!;
    let second = reduceBalance(
      initialBalance(task),
      { type: "operate", operation: { kind: "divide", value: rational(3) } },
      task,
    );
    second = reduceBalance(
      second,
      {
        type: "operate",
        operation: { kind: "add", term: "constant", value: rational(7, 3) },
      },
      task,
    );
    const model = { kind: "balance", state: second } as const;
    expect(checkModel(task, model)).toBe(true);
    expect(openAnswer(task, model)).not.toEqual(openAnswer(task, first));
    expect(
      openAnswer(task, { kind: "balance", state: mistakenBalance(task) }),
    ).toBeNull();
    expect(initialBalance(task).history).toHaveLength(0);
  });
  it("3x − 7 = 11 preserves both sides and solves x=6 exactly", () => {
    const original = initialBalance(task);
    expect(checkBalance(original, task).modelMatches).toBe(false);
    const moved = reduceBalance(
      original,
      {
        type: "operate",
        operation: { kind: "add", term: "constant", value: rational(7) },
      },
      task,
    );
    expect(moved.frame.left).toMatchObject({
      x: rational(3),
      constant: rational(0),
    });
    expect(moved.frame.right.constant).toEqual(rational(18));
    expect(checkBalance(moved, task)).toMatchObject({
      equivalent: true,
      isolated: false,
      modelMatches: false,
    });
    const solved = reduceBalance(
      moved,
      { type: "operate", operation: { kind: "divide", value: rational(3) } },
      task,
    );
    expect(solved.frame.right.constant).toEqual(rational(6));
    expect(checkBalance(solved, task).modelMatches).toBe(true);
    expect(reduceBalance(solved, { type: "undo" }, task)).toEqual(moved);
    expect(reduceBalance(solved, { type: "reset" }, task)).toEqual(original);
    expect(original.frame.left.constant).toEqual(rational(-7));
  });
  it.each([
    ["D5.1", { left: { x: 1, constant: 5 }, right: { x: 0, constant: 12 } }],
    ["D5.2", { left: { x: 2, constant: 6 }, right: { x: 0, constant: 10 } }],
    ["D5.3", { left: { x: 3, constant: 0 }, right: { x: 0, constant: 12 } }],
  ] as const)(
    "%s is rejected even if a numerical guess is supplied; undo repairs the model",
    (code, sides) => {
      const t: BalanceTask = { kind: "balance", ...sides },
        mistake = mistakenBalance(t, code);
      expect(checkBalance(mistake, t)).toMatchObject({
        modelMatches: false,
        equivalent: false,
        legalHistory: false,
      });
      expect(checkBalance(mistake, t).mismatchedSides.length).toBeGreaterThan(
        0,
      );
      expect(
        equivalentBalance(reduceBalance(mistake, { type: "undo" }, t).frame, t),
      ).toBe(true);
      expect(checkBalance(exampleBalance(t).at(-1)!, t).modelMatches).toBe(
        true,
      );
    },
  );
  it("a correct final value with a fabricated/asymmetric transition is not a valid model", () => {
    const solved = exampleBalance(task).at(-1)!;
    expect(
      checkBalance({ ...solved, history: [initialBalance(task).frame] }, task)
        .modelMatches,
    ).toBe(false);
    expect(checkBalance({ ...solved, history: [] }, task).modelMatches).toBe(
      false,
    );
  });
  it("fractions, negative scaling and variables on both sides remain exact", () => {
    for (let a = -6; a <= 6; a++)
      for (let d = -3; d <= 3; d++) {
        if (a === d) continue;
        const t: BalanceTask = {
          kind: "balance",
          left: { x: a, constant: -7 },
          right: { x: d, constant: 4 },
        };
        const frames = exampleBalance(t),
          end = frames.at(-1)!;
        expect(end.frame.right.constant).toEqual(rational(11, a - d));
        expect(frames.every((s) => equivalentBalance(s.frame, t))).toBe(true);
        expect(checkBalance(end, t).modelMatches).toBe(true);
      }
    const state = reduceBalance(
      initialBalance(task),
      {
        type: "operate",
        operation: { kind: "multiply", value: rational(-1, 2) },
      },
      task,
    );
    expect(equivalentBalance(state.frame, task)).toBe(true);
  });
  it("zero scaling/division, runaway bounds and nonunique tasks cannot fabricate a solution", () => {
    for (const kind of ["divide", "multiply"] as const)
      expect(() =>
        reduceBalance(
          initialBalance(task),
          { type: "operate", operation: { kind, value: rational(0) } },
          task,
        ),
      ).toThrow();
    expect(() =>
      validateBalanceTask({ ...task, right: { x: 3, constant: 11 } }),
    ).toThrow();
    expect(() =>
      reduceBalance(
        initialBalance(task),
        {
          type: "operate",
          operation: { kind: "multiply", value: rational(1000000) },
        },
        task,
      ),
    ).toThrow();
    const state = initialBalance(task);
    expect(
      reduceBalance(
        state,
        {
          type: "operate",
          operation: { kind: "add", term: "constant", value: rational(0) },
        },
        task,
      ),
    ).toBe(state);
    expect(reduceBalance(state, { type: "undo" }, task)).toBe(state);
  });
});
