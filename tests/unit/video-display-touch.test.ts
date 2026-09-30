import { describe, expect, it } from "vitest";
import { measuredTouches } from "../../src/core/tools/capabilities";
import {
  initialTouchCheck,
  reduceTouchCheck,
  touchCheckDelay,
  type TouchCheck,
} from "../../src/features/layar/profile-touch-check";
function down(
  state: TouchCheck,
  id: number,
  zone: number,
  now = 0,
  pointerType = "touch",
) {
  return reduceTouchCheck(state, {
    type: "down",
    id,
    zone,
    now,
    pointerType,
    width: 10,
    height: 10,
  });
}
const release = (state: TouchCheck, id: number, now: number) =>
  reduceTouchCheck(state, { type: "release", id, now });
const tick = (state: TouchCheck, now: number) =>
  reduceTouchCheck(state, { type: "tick", now });
function pass(state: TouchCheck, now: number) {
  const count = [1, 2, 4][state.stage];
  for (let i = 0; i < count; i++) state = down(state, i, i, now);
  for (let i = 0; i < count; i++) state = release(state, i, now + 10);
  return tick(state, now + 750);
}
describe("capability auto-next", () => {
  it.each(["mouse", "pen", ""])(
    "does not pass from %s events",
    (pointerType) => {
      const state = down(initialTouchCheck(), 1, 0, 0, pointerType);
      expect(state.passed).toEqual([false, false, false]);
      expect(state.active).toEqual([]);
      expect(tick(state, 5000).stage).toBe(0);
    },
  );
  it("rejects large contacts and nonexistent targets", () => {
    const state = initialTouchCheck();
    expect(
      reduceTouchCheck(state, {
        type: "down",
        id: 1,
        zone: 0,
        pointerType: "touch",
        width: 81,
        height: 10,
        now: 0,
      }),
    ).toBe(state);
    expect(down(state, 1, 1)).toBe(state);
  });
  it("shows success for 750ms after early release, then advances exactly once", () => {
    let state = down(initialTouchCheck(), 1, 0);
    state = release(state, 1, 10);
    expect(touchCheckDelay(state, 10)).toBe(740);
    expect(tick(state, 749).stage).toBe(0);
    state = tick(state, 750);
    expect(state.stage).toBe(1);
    expect(state.active).toEqual([]);
    expect(tick(state, 5000).stage).toBe(1);
    expect(release(state, 1, 6000).passed).toEqual([true, false, false]);
  });
  it("waits for held fingers, plus 120ms release debounce", () => {
    let state = down(initialTouchCheck(), 1, 0);
    expect(touchCheckDelay(state, 1000)).toBeNull();
    expect(tick(state, 1000).stage).toBe(0);
    state = release(state, 1, 2000);
    expect(tick(state, 2119).stage).toBe(0);
    expect(tick(state, 2120).stage).toBe(1);
  });
  it("a new contact during success restarts release debounce", () => {
    let state = release(down(initialTouchCheck(), 1, 0), 1, 10);
    state = down(state, 2, 0, 700);
    expect(tick(state, 750).stage).toBe(0);
    state = release(state, 2, 800);
    expect(tick(state, 919).stage).toBe(0);
    expect(tick(state, 920).stage).toBe(1);
  });
  it("requires distinct simultaneous touch pointers and cleans cancel/lost-capture releases", () => {
    let state = pass(initialTouchCheck(), 0);
    state = down(state, 1, 0, 1000);
    state = down(state, 1, 1, 1001);
    expect(state.active).toHaveLength(1);
    state = down(state, 2, 0, 1002);
    expect(state.passed[1]).toBe(false);
    state = release(state, 1, 1003);
    state = release(state, 2, 1004);
    state = down(state, 3, 1, 1005);
    expect(state.passed[1]).toBe(false);
    state = down(state, 4, 0, 1006);
    expect(state.passed[1]).toBe(true);
    expect(state.matchedAt).toBe(1006);
  });
  it("completes one, two and four stages using fresh contacts", () => {
    let state = initialTouchCheck();
    for (let i = 0; i < 3; i++) {
      state = pass(state, i * 1000);
      expect(state.stage).toBe(i + 1);
    }
    expect(measuredTouches(...state.passed)).toBe(4);
    expect(tick(state, 10000)).toBe(state);
  });
  it.each([0, 1, 2])(
    "fallback after %i passed stages records only observed capabilities",
    (completed) => {
      let state = initialTouchCheck();
      for (let i = 0; i < completed; i++) state = pass(state, i * 1000);
      state = reduceTouchCheck(state, { type: "fallback" });
      expect(state.stage).toBe(3);
      expect(measuredTouches(...state.passed)).toBe([0, 1, 2][completed]);
      expect(state.active).toEqual([]);
    },
  );
});
