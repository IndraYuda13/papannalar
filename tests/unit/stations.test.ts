import { describe, expect, it } from "vitest";
import {
  createRotation,
  stationSchedule,
  validSchedule,
  rotationAction,
  remainingSeconds,
} from "../../src/core/stations/rotation";
import {
  rotationProjection,
  toPublicStation,
} from "../../src/contracts/stations";
import { seededGroupId } from "../../src/core/math/seed";
import { clockOffset } from "../../src/core/stations/clock";
const ids = Array.from({ length: 4 }, (_, i) => seededGroupId(88, i));
describe("ROT01 rotation", () => {
  it("estimates clock skew by RTT midpoint and rejects invalid/slow samples", () => {
    expect(clockOffset(20000, 20200, 30000)).toBe(9900);
    expect(clockOffset(0, 6000, 3000)).toBeNull();
    expect(clockOffset(1, 0, 0)).toBeNull();
    expect(clockOffset(0, 10, NaN)).toBeNull();
  });
  it.each([1, 2, 3, 4])(
    "%i groups never collide and all visit teacher/board once",
    (count) => {
      const schedule = stationSchedule(count);
      expect(validSchedule(schedule)).toBe(true);
      for (const row of schedule) {
        expect(row.filter((s) => s === "Guru")).toHaveLength(1);
        expect(row.filter((s) => s === "Papan")).toHaveLength(1);
      }
      expect(schedule[0][0]).toBe("Guru");
      if (count > 1) expect(schedule[count - 1][0]).toBe("Papan");
    },
  );
  it("matches exact 7B source table", () =>
    expect(stationSchedule(3)).toEqual([
      ["Guru", "Papan", "Mandiri"],
      ["Mandiri", "Guru", "Papan"],
      ["Papan", "Mandiri", "Guru"],
    ]));
  it.each([
    [5, 36],
    [7, 48],
    [10, 57],
    [2, 54],
  ])(
    "grade %i preserves %i minute budget including transitions/reserve",
    (grade, budget) => {
      for (const count of [1, 2, 3, 4])
        for (const initial of [false, true]) {
          const state = createRotation({
            id: ids[0],
            groupIds: ids.slice(0, count),
            grade,
            initial,
          });
          const rounds = state.schedule[0].length;
          expect(
            (state.workSeconds * rounds + state.reserveSeconds) / 60 + rounds,
          ).toBe((grade <= 3 && initial ? 36 : budget) - (initial ? 6 : 0));
        }
    },
  );
  it("short is 22 minutes with no forced rotation", () => {
    let state = createRotation({
      id: ids[0],
      groupIds: ids,
      grade: 7,
      short: true,
    });
    state = rotationAction(state, "start", 100);
    expect(remainingSeconds(state, 100)).toBe(1320);
    expect(rotationProjection(state).total).toBe(1);
    expect(rotationAction(state, "end", 1000).phase).toBe("complete");
  });
  it("zero never moves, extends from now, includes last transition, no automatic reveal", () => {
    let state = rotationAction(
      createRotation({ id: ids[0], groupIds: ids.slice(0, 3), grade: 7 }),
      "start",
      0,
    );
    expect(remainingSeconds(state, 9999999)).toBe(0);
    expect(state.round).toBe(0);
    state = rotationAction(state, "extend", 9999999);
    expect(remainingSeconds(state, 9999999)).toBe(180);
    expect(state.addedSeconds).toBe(180);
    for (let i = 0; i < 3; i++) {
      state = rotationAction(state, "end", 10000000);
      expect(state.phase).toBe("transition");
      state = rotationAction(state, "next", 10060000);
    }
    expect(state.phase).toBe("complete");
    expect(() => rotationAction(state, "extend", 100)).toThrow();
  });
  it("projects only allowlisted timing/stations, rejecting bad schedules", () => {
    const state = createRotation({
      id: ids[0],
      groupIds: ids.slice(0, 3),
      grade: 7,
    });
    const p = rotationProjection(state);
    expect(toPublicStation({ ...p, name: "LOCAL_CANARY" } as typeof p)).toEqual(
      p,
    );
    expect(JSON.stringify(p)).not.toMatch(
      /name|mastery|stepId|revision|LOCAL_CANARY/,
    );
    expect(
      validSchedule([
        ["Guru", "Papan", "Mandiri"],
        ["Guru", "Papan", "Mandiri"],
      ]),
    ).toBe(false);
    expect(() => stationSchedule(0)).toThrow();
    expect(() => stationSchedule(5)).toThrow();
  });
});
