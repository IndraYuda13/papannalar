import { describe, expect, it } from "vitest";
import { rational } from "../../src/core/math/rational";
import {
  initialNumberLine,
  reduceNumberLine,
  checkNumberLine,
  serializeNumberLine,
  type NumberLineTask,
} from "../../src/core/tools/number-line";
const task: NumberLineTask = {
  origin: rational(-3),
  delta: rational(-5),
  orientation: "horizontal",
};
describe("Number Line deterministic model", () => {
  it("−3 − 5 ends at −8 without changing initial state", () => {
    const first = initialNumberLine(task),
      last = reduceNumberLine(
        first,
        { type: "jump", amount: rational(-5) },
        task,
      );
    expect(last.current).toEqual(rational(-8));
    expect(first.jumps).toHaveLength(0);
    expect(checkNumberLine(last, task).modelMatches).toBe(true);
  });
  it("lift −2 to 5 is a positive displacement of 7", () => {
    const lift: NumberLineTask = {
      origin: rational(-2),
      delta: rational(7),
      orientation: "vertical",
    };
    const state = reduceNumberLine(
      initialNumberLine(lift),
      { type: "move", to: rational(5) },
      lift,
    );
    expect(checkNumberLine(state, lift).modelMatches).toBe(true);
    expect(state.orientation).toBe("vertical");
  });
  it("unit jumps work, wrong direction plus compensation does not pass", () => {
    let state = initialNumberLine(task);
    for (let i = 0; i < 5; i++)
      state = reduceNumberLine(
        state,
        { type: "jump", amount: rational(-1) },
        task,
      );
    expect(checkNumberLine(state, task).modelMatches).toBe(true);
    state = reduceNumberLine(
      initialNumberLine(task),
      { type: "jump", amount: rational(2) },
      task,
    );
    state = reduceNumberLine(
      state,
      { type: "jump", amount: rational(-7) },
      task,
    );
    expect(checkNumberLine(state, task).modelMatches).toBe(false);
  });
  it("matching final label without a matching path never passes", () => {
    const state = initialNumberLine(task);
    expect(
      checkNumberLine({ ...state, current: rational(-8) }, task).modelMatches,
    ).toBe(false);
    const moved = reduceNumberLine(
      state,
      { type: "jump", amount: rational(-1) },
      task,
    );
    expect(
      checkNumberLine({ ...moved, current: rational(-8) }, task).modelMatches,
    ).toBe(false);
  });
  it("one completed drag is one undo; empty undo safe, reset clears", () => {
    const first = initialNumberLine(task);
    expect(reduceNumberLine(first, { type: "undo" }, task)).toBe(first);
    const move = reduceNumberLine(
      first,
      { type: "move", to: rational(-8) },
      task,
    );
    expect(reduceNumberLine(move, { type: "undo" }, task)).toEqual(first);
    expect(reduceNumberLine(move, { type: "reset" }, task)).toEqual(first);
    expect(
      reduceNumberLine(first, { type: "move", to: rational(-3) }, task),
    ).toBe(first);
  });
  it("starting point changes reset history and are checked against the task", () => {
    const wrong = reduceNumberLine(
      initialNumberLine(task),
      { type: "start", at: rational(2) },
      task,
    );
    expect(
      checkNumberLine(
        reduceNumberLine(wrong, { type: "move", to: rational(-8) }, task),
        task,
      ).modelMatches,
    ).toBe(false);
  });
  it("supports exact rational jumps; serialization includes no arbitrary data", () => {
    const fractional: NumberLineTask = {
      origin: rational(1, 3),
      delta: rational(-1, 6),
      orientation: "horizontal",
    };
    const state = reduceNumberLine(
      initialNumberLine(fractional),
      { type: "jump", amount: rational(-1, 6) },
      fractional,
    );
    expect(state.current).toEqual(rational(1, 6));
    expect(checkNumberLine(state, fractional).modelMatches).toBe(true);
    expect(
      Object.keys(
        serializeNumberLine({ ...state, name: "CANARY" } as typeof state),
      ),
    ).toEqual(["origin", "current", "orientation", "jumps"]);
    expect(JSON.stringify(serializeNumberLine(state))).not.toContain("CANARY");
  });
  it("caps undo history and validates task orientation", () => {
    let state = initialNumberLine(task);
    for (let i = 0; i < 40; i++)
      state = reduceNumberLine(
        state,
        { type: "jump", amount: rational(1) },
        task,
      );
    expect(() =>
      reduceNumberLine(state, { type: "jump", amount: rational(1) }, task),
    ).toThrow();
    expect(() =>
      initialNumberLine({
        ...task,
        orientation: "other",
      } as unknown as NumberLineTask),
    ).toThrow();
  });
});
