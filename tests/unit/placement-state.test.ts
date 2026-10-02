import { describe, expect, it } from "vitest";
import {
  anchorInitialPlacement,
  applySessionPlacement,
  applyTeacherPlacementEvent,
  createPlacementState,
  type PlacementSession,
  type PlacementState,
} from "../../src/core/placement/state";
import {
  canonicalTeacherEvents,
  freezeTeacherEvent,
} from "../../src/core/placement/teacher-events";
import type { ComputedLevel } from "../../src/core/placement/computed-level";
import { groupMove, id, lanjut, level, override } from "../fixtures/placement";

function candidate(
  ordinal: number,
  computed: ComputedLevel,
  eligible = true,
  finalized = true,
): PlacementSession {
  return {
    sessionId: id(100 + ordinal),
    ordinal,
    computed,
    eligible,
    finalized,
    initial: false,
  };
}
const seed = () => createPlacementState(level("D1"), level("D1"));

describe("Displayed placement session state machine", () => {
  it("first eligible session sets an unassigned displayed placement immediately", () => {
    const state = applySessionPlacement(
      createPlacementState(level("D1")),
      candidate(1, level("D2")),
    );
    expect(state).toMatchObject({
      computed: level("D2"),
      displayed: level("D2"),
      pendingStreak: 0,
    });
  });
  it("D1 -> D2 -> D3 accepts the latest candidate, not necessarily identical candidates", () => {
    const first = applySessionPlacement(seed(), candidate(1, level("D2")));
    expect(first).toMatchObject({
      computed: level("D2"),
      displayed: level("D1"),
      pendingStreak: 1,
    });
    const second = applySessionPlacement(first, candidate(2, level("D3")));
    expect(second).toMatchObject({
      computed: level("D3"),
      displayed: level("D3"),
      pendingStreak: 0,
    });
  });
  it("D1 -> D2 -> D1 resets the streak, so the following differing session starts at one", () => {
    const first = applySessionPlacement(seed(), candidate(1, level("D2")));
    const second = applySessionPlacement(first, candidate(2, level("D1")));
    expect(second).toMatchObject({ displayed: level("D1"), pendingStreak: 0 });
    expect(
      applySessionPlacement(second, candidate(3, level("D3"))),
    ).toMatchObject({ displayed: level("D1"), pendingStreak: 1 });
  });
  it.each([
    [level("D1"), level("C4"), level("C3")],
    [level("D1"), level("D5"), lanjut],
    [lanjut, level("D5"), level("D4")],
    [level("D1"), lanjut, lanjut],
  ])(
    "two eligible sessions support downward changes and Lanjut %#",
    (displayed, first, second) => {
      const state = applySessionPlacement(
        createPlacementState(displayed, displayed),
        candidate(1, first),
      );
      expect(state.displayed).toEqual(displayed);
      expect(
        applySessionPlacement(state, candidate(2, second)).displayed,
      ).toEqual(second);
    },
  );
  it("open session can update computed repeatedly without advancing hysteresis", () => {
    const first = applySessionPlacement(
      seed(),
      candidate(1, level("D2"), true, false),
    );
    const revised = applySessionPlacement(
      first,
      candidate(1, level("D3"), true, false),
    );
    expect(revised).toMatchObject({
      computed: level("D3"),
      displayed: level("D1"),
      pendingStreak: 0,
      lastFinalizedSession: null,
    });
    expect(
      applySessionPlacement(revised, candidate(1, level("D3"))),
    ).toMatchObject({ displayed: level("D1"), pendingStreak: 1 });
  });
  it("finalized retries after JSON reload are idempotent; corrections must replay", () => {
    const input = candidate(1, level("D2"));
    const state = applySessionPlacement(seed(), input);
    expect(
      applySessionPlacement(JSON.parse(JSON.stringify(state)), input),
    ).toEqual(state);
    expect(() =>
      applySessionPlacement(state, candidate(1, level("D3"))),
    ).toThrow(/replay/);
    expect(() =>
      applySessionPlacement(state, candidate(1, level("D2"), true, false)),
    ).toThrow(/replay/);
    const second = applySessionPlacement(state, candidate(2, level("D3")));
    expect(() => applySessionPlacement(second, input)).toThrow(/replay/);
  });
  it("empty sessions do not provide evidence or interrupt eligible adjacency", () => {
    const first = applySessionPlacement(seed(), candidate(1, level("D2")));
    const empty = applySessionPlacement(
      first,
      candidate(2, level("D1"), false),
    );
    expect(empty).toMatchObject({
      displayed: level("D1"),
      pendingStreak: 1,
      lastEligibleSession: { ordinal: 1 },
    });
    expect(
      applySessionPlacement(empty, candidate(3, level("D3"))),
    ).toMatchObject({ displayed: level("D3"), pendingStreak: 0 });
    expect(
      applySessionPlacement(
        createPlacementState(level("D1")),
        candidate(1, level("D1"), false),
      ).displayed,
    ).toBeNull();
  });
  it("complete initial check anchors immediately, without waiting for finalization", () => {
    const anchored = anchorInitialPlacement(
      createPlacementState(level("A1")),
      level("D3"),
    );
    expect(anchored).toMatchObject({
      computed: level("D3"),
      displayed: level("D3"),
      pendingStreak: 0,
      lastFinalizedSession: null,
    });
    const closed = applySessionPlacement(anchored, {
      ...candidate(1, level("D4")),
      initial: true,
    });
    expect(closed.displayed).toEqual(level("D4"));
    expect(() => anchorInitialPlacement(closed, level("D2"))).toThrow(
      /baseline/,
    );
  });
  it("manual placement has an immediate display-only effect and protects the next closure", () => {
    const first = applySessionPlacement(seed(), candidate(1, level("D2")));
    const manual = applyTeacherPlacementEvent(first, override(1, lanjut));
    expect(manual).toMatchObject({
      computed: level("D2"),
      displayed: lanjut,
      pendingStreak: 0,
      manualOverride: { eventId: override(1).id, afterSessionOrdinal: 1 },
    });
    const next = applySessionPlacement(manual, candidate(2, level("D3")));
    expect(next).toMatchObject({
      displayed: lanjut,
      pendingStreak: 0,
      manualOverride: null,
    });
    const pending = applySessionPlacement(next, candidate(3, level("D4")));
    expect(pending).toMatchObject({ displayed: lanjut, pendingStreak: 1 });
    expect(
      applySessionPlacement(pending, candidate(4, level("D5"))).displayed,
    ).toEqual(level("D5"));
  });
  it("group move does not change computed/displayed state; old manual events require replay", () => {
    const state = applySessionPlacement(seed(), candidate(1, level("D2")));
    expect(applyTeacherPlacementEvent(state, groupMove(1))).toEqual(state);
    expect(() => applyTeacherPlacementEvent(state, override(0))).toThrow(
      /replay/,
    );
  });
  it("initial placement and the current closure cannot erase a manual hold", () => {
    const state = applyTeacherPlacementEvent(seed(), override(1, level("E1")));
    expect(anchorInitialPlacement(state, level("D3")).displayed).toEqual(
      level("E1"),
    );
    const closed = applySessionPlacement(state, candidate(1, level("D2")));
    expect(closed.manualOverride).not.toBeNull();
    expect(closed.displayed).toEqual(level("E1"));
    expect(() =>
      applySessionPlacement(
        applyTeacherPlacementEvent(seed(), override(2)),
        candidate(1, level("D2")),
      ),
    ).toThrow(/replay/);
  });
  it.each([
    { pendingStreak: 2 },
    { pendingStreak: 1 },
    {
      displayed: null,
      manualOverride: { eventId: id(90), afterSessionOrdinal: 0 },
    },
    { lastEligibleSession: { sessionId: id(101), ordinal: 1 } },
    { computed: { kind: "invalid" } },
    { displayed: { kind: "step", stepId: "A0" } },
    { nickname: "LOCAL_ONLY_CANARY" },
  ])(
    "invalid or identity-bearing state cannot enter the reducer %#",
    (patch) => {
      expect(() =>
        applySessionPlacement(
          { ...seed(), ...patch } as PlacementState,
          candidate(1, level("D2")),
        ),
      ).toThrow();
    },
  );
  it.each([
    { eligible: "true" },
    { finalized: 1 },
    { ordinal: 0 },
    { ordinal: Number.MAX_SAFE_INTEGER + 1 },
    { sessionId: null },
    { initial: true, eligible: false },
  ])("invalid session decision rejected %#", (patch) => {
    expect(() =>
      applySessionPlacement(seed(), {
        ...candidate(1, level("D2")),
        ...patch,
      } as PlacementSession),
    ).toThrow();
  });
});

describe("Manual placement provenance", () => {
  it("requires a closed reason, actor and separate group/placement types", () => {
    const event = override(1);
    expect(freezeTeacherEvent(event)).toMatchObject({
      actorTeacherId: event.actorTeacherId,
      reasonCode: "teacher-assessment",
    });
    expect(
      freezeTeacherEvent({ ...event, reasonCode: "placement-correction" }),
    ).toMatchObject({ reasonCode: "placement-correction" });
    for (const patch of [
      { reasonCode: "" },
      { actorTeacherId: null },
      { reasonCode: "LOCAL_ONLY_CANARY" },
      { notes: "LOCAL_ONLY_CANARY" },
      { kind: "group-move" },
    ])
      expect(() => freezeTeacherEvent({ ...event, ...patch })).toThrow();
    expect(() => freezeTeacherEvent(null)).toThrow();
  });
  it("deduplicates identity, orders by anchor/sequence and rejects conflicts", () => {
    const early = override(0);
    const later = override(1);
    const move = groupMove(1);
    expect(canonicalTeacherEvents([move, later, early, later])).toEqual([
      freezeTeacherEvent(early),
      freezeTeacherEvent(later),
      freezeTeacherEvent(move),
    ]);
    expect(() =>
      canonicalTeacherEvents([
        early,
        { ...early, reasonCode: "placement-correction" },
      ]),
    ).toThrow(/identity conflict/);
    expect(() =>
      canonicalTeacherEvents([early, { ...early, id: id(92) }]),
    ).toThrow(/sequence conflict/);
  });
});
