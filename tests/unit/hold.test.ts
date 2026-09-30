import { expect, it } from "vitest";
import {
  createRotation,
  rotationAction,
  validSchedule,
} from "../../src/core/stations/rotation";
import { confirmHold, previewHold } from "../../src/core/stations/hold";
import { seededGroupId } from "../../src/core/math/seed";
const ids = Array.from({ length: 4 }, (_, i) => seededGroupId(29, i));
const state = rotationAction(
  createRotation({ id: ids[0], groupIds: ids, grade: 7 }),
  "start",
  100,
);
it("K07 preview reschedules four-group Mandiri hold without changing current/history or budget", () => {
  const before = JSON.stringify(state),
    preview = previewHold(state, ids[1]);
  expect(preview.kind).toBe("safe");
  expect(JSON.stringify(state)).toBe(before);
  const next = confirmHold(state, preview);
  expect(next.revision).toBe(state.revision + 1);
  expect(next.schedule[1][1]).toBe("Mandiri");
  expect(validSchedule(next.schedule)).toBe(true);
  expect(next.deadlineAt).toBe(state.deadlineAt);
  expect(next.schedule.map((r) => r[0])).toEqual(
    state.schedule.map((r) => r[0]),
  );
  expect(next.round).toBe(0);
});
it("K07 rejects stale/forged previews and offers alternatives to Guru/Papan collisions", () => {
  const preview = previewHold(state, ids[1]);
  expect(() =>
    confirmHold(rotationAction(state, "extend", 200), preview),
  ).toThrow("Stale");
  if (preview.kind !== "safe") throw new Error("Expected safe preview");
  expect(() =>
    confirmHold(state, { ...preview, schedule: state.schedule }),
  ).toThrow("changed");
  for (const group of [ids[0], ids[3]])
    expect(previewHold(state, group)).toEqual({
      kind: "blocked",
      reason: "no-safe-schedule",
      alternatives: ["extend", "end"],
    });
  expect(() => confirmHold(state, previewHold(state, ids[0]))).toThrow();
});
it.each([1, 2, 3, 4])(
  "K07 every round/group for K=%i either collision-free or explicit fallback",
  (count) => {
    let current = rotationAction(
      createRotation({ id: ids[0], groupIds: ids.slice(0, count), grade: 7 }),
      "start",
      100,
    );
    while (current.phase !== "complete") {
      for (const group of current.groupIds) {
        const preview = previewHold(current, group);
        if (preview.kind === "safe")
          expect(validSchedule(confirmHold(current, preview).schedule)).toBe(
            true,
          );
        else expect(preview.alternatives).toEqual(["extend", "end"]);
      }
      current = rotationAction(
        rotationAction(current, "end", 100),
        "next",
        101,
      );
    }
    expect(previewHold(current, ids[0]).kind).toBe("blocked");
  },
);
