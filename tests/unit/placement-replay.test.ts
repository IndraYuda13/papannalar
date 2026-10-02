import { describe, expect, it } from "vitest";
import {
  canonicalSessions,
  replayPlacement,
  type PlacementHistory,
  type ReplayBaseline,
  type SessionRecord,
} from "../../src/core/placement/replay";
import {
  createMastery,
  type Mastery,
} from "../../src/core/placement/computed-level";
import {
  STUDENT,
  OTHER_STUDENT,
  baseline,
  history,
  session,
  initialBinding,
  weeklyBinding,
  exitBinding,
  revision,
  level,
  lanjut,
  override,
  groupMove,
  id,
} from "../fixtures/placement";

const allCorrect = Array<"correct">(10).fill("correct");
const thresholdBase = (): ReplayBaseline => ({
  ...baseline(),
  mastery: { ...baseline().mastery, D1: 0.79, D2: 0.79, D3: 0.79 },
});
function permutations<T>(values: readonly T[]): T[][] {
  if (values.length === 0) return [[]];
  return values.flatMap((value, index) =>
    permutations(values.filter((_, i) => i !== index)).map((tail) => [
      value,
      ...tail,
    ]),
  );
}

describe("Initial anchor and immutable exit replay", () => {
  it("empty history is safe; inputs are copied and output can be reloaded without hidden state", () => {
    const base = baseline();
    const result = replayPlacement(base, history());
    expect(result.mastery).toEqual(base.mastery);
    expect(result.placement).toMatchObject({
      computed: level("D1"),
      displayed: level("D1"),
      pendingStreak: 0,
    });
    expect(result.sessions).toEqual([]);
    expect(result.observations).toEqual([]);
    expect(result.teacherEvents).toEqual([]);
    expect(result.mastery).not.toBe(base.mastery);
    expect(Reflect.set(result.mastery, "D1", 1)).toBe(false);
    expect(
      replayPlacement(
        JSON.parse(JSON.stringify(base)),
        JSON.parse(JSON.stringify(history())),
      ),
    ).toEqual(result);
  });
  it.each([false, true])(
    "initial placement initializes once, not ten BKT updates; finalized=%s",
    (finalized) => {
      const s = session(1, "D5", finalized);
      const b = initialBinding(s);
      const r = revision(b, ["incorrect", ...allCorrect.slice(1)]);
      const result = replayPlacement(
        { ...baseline(), displayed: null },
        history([s], [b], [r]),
      );
      expect(result.placement).toMatchObject({
        computed: level("B4"),
        displayed: level("B4"),
        pendingStreak: 0,
      });
      expect(result.mastery).toMatchObject({
        A1: 0.85,
        B3: 0.85,
        B4: 0.3,
        E4: 0.3,
      });
      expect(result.belowRange).toEqual({
        kind: "below-range",
        lowestTestedStep: "B4",
      });
      expect(result.observations).toEqual([]);
      expect(result.sessions[0]).toMatchObject({
        initialStatus: "placed",
        appliedObservations: 0,
      });
    },
  );
  it("all correct initial answers anchor Lanjut; pending/missing cannot anchor", () => {
    const s = session(1);
    const b = initialBinding(s);
    const base = { ...baseline(), displayed: null };
    expect(
      replayPlacement(base, history([s], [b], [revision(b, allCorrect)]))
        .placement.displayed,
    ).toEqual(lanjut);
    for (const revisions of [[], [revision(b, ["?"])], [revision(b, [])]]) {
      const result = replayPlacement(base, history([s], [b], revisions));
      expect(result.placement.displayed).toBeNull();
      expect(result.mastery).toEqual(base.mastery);
      expect(result.belowRange).toEqual({ kind: "none" });
      expect(result.sessions[0].initialStatus).toBe("pending");
    }
  });
  it("correcting an initial anchor rebuilds all later BKT from the replacement anchor", () => {
    const first = session(1);
    const next = session(2);
    const b = initialBinding(first);
    const exit = exitBinding(next);
    const old = revision(b, allCorrect);
    const corrected = revision(
      b,
      ["incorrect", ...allCorrect.slice(1)],
      2,
      "manual",
    );
    const exitResult = revision(exit, ["correct", "correct", "correct"]);
    const result = replayPlacement(
      baseline(),
      history([first, next], [b, exit], [old, exitResult, corrected]),
    );
    const onlyCorrected = replayPlacement(
      baseline(),
      history([first, next], [b, exit], [corrected, exitResult]),
    );
    expect(result).toEqual(onlyCorrected);
    expect(result.mastery.D1).toBeCloseTo(0.951724137931, 9);
    expect(result.placement.displayed).toEqual(level("B4"));
    expect(result.belowRange.kind).toBe("below-range");
  });
  it("pair and context use their frozen steps, independent of activity or teacher group moves", () => {
    const s = session(1);
    const b = exitBinding(s, "D1", "D4", "D3");
    const r = revision(b, ["correct", "correct", "correct"]);
    const result = replayPlacement(
      baseline(),
      history([s], [b], [r], [groupMove(0)]),
    );
    expect(result.mastery.D1).toBeCloseTo(0.796774193548, 9);
    expect(result.mastery.D4).toBeCloseTo(0.692682926829, 9);
    expect(result.mastery.D3).toBe(0.3);
    expect(result.observations.map((o) => o.stepId)).toEqual(["D1", "D4"]);
    expect(result.sessions[0].appliedObservations).toBe(2);
    const noMove = replayPlacement(baseline(), history([s], [b], [r]));
    expect(result.mastery).toEqual(noMove.mastery);
    expect(result.placement).toEqual(noMove.placement);
  });
  it("weekly then pair then context is the canonical order, even on the same step", () => {
    const s = session(1);
    const weekly = weeklyBinding(s);
    const exit = exitBinding(s);
    const result = replayPlacement(
      baseline(),
      history(
        [s],
        [exit, weekly],
        [
          revision(exit, ["correct", "correct", "correct"]),
          revision(weekly, ["missing", "missing", "incorrect"]),
        ],
      ),
    );
    expect(
      result.observations.map((o) => [o.assessmentOrder, o.observationOrder]),
    ).toEqual([
      [1, 0],
      [1, 1],
      [1, 2],
      [1, 3],
      [1, 4],
      [2, 0],
      [2, 1],
    ]);
    // Independent rational arithmetic: 3/10 -> 43/295 (regular wrong)
    // -> 923/1490 (pair correct) -> 4678/5245 (regular correct).
    expect(result.mastery.D1).toBeCloseTo(4678 / 5245, 12);
    expect(result.sessions[0].appliedObservations).toBe(3);
  });
  it("pair missing leaves only context evidence, whereas ? supplies a failed pair", () => {
    const s = session(1);
    const b = exitBinding(s);
    const missing = replayPlacement(
      baseline(),
      history([s], [b], [revision(b, ["missing", "correct", "correct"])]),
    );
    const questionMark = replayPlacement(
      baseline(),
      history([s], [b], [revision(b, ["?", "correct", "correct"])]),
    );
    expect(missing.sessions[0].appliedObservations).toBe(1);
    expect(missing.mastery.D1).toBeCloseTo(0.692682926829, 9);
    expect(questionMark.sessions[0].appliedObservations).toBe(2);
    expect(questionMark.mastery.D1).not.toBe(missing.mastery.D1);
  });
});

describe("Canonical idempotency, revisions and placement replay", () => {
  const first = session(1);
  const second = session(2);
  const b1 = weeklyBinding(first);
  const b2 = weeklyBinding(second);
  const r1 = revision(b1, ["missing", "missing", "correct"]);
  const r2 = revision(b2, ["missing", "missing", "missing", "correct"]);

  it("real mastery candidates D2 then D3 obey the two-session display rule", () => {
    const result = replayPlacement(
      thresholdBase(),
      history([first, second], [b1, b2], [r1, r2]),
    );
    expect(result.sessions[0].placement).toMatchObject({
      computed: level("D2"),
      displayed: level("D1"),
      pendingStreak: 1,
    });
    expect(result.placement).toMatchObject({
      computed: level("D3"),
      displayed: level("D3"),
      pendingStreak: 0,
    });
  });
  it("a later incorrect answer returning computed to D1 resets the streak", () => {
    const result = replayPlacement(
      thresholdBase(),
      history(
        [first, second],
        [b1, b2],
        [r1, revision(b2, ["missing", "missing", "incorrect"])],
      ),
    );
    expect(result.placement).toMatchObject({
      computed: level("D1"),
      displayed: level("D1"),
      pendingStreak: 0,
    });
  });
  it("duplicate scans/sync and a new revision with identical answers cannot add a session", () => {
    const once = replayPlacement(thresholdBase(), history([first], [b1], [r1]));
    const duplicated = history([first, first], [b1, b1], [r1, r1, r1]);
    expect(replayPlacement(thresholdBase(), duplicated)).toEqual(once);
    expect(
      replayPlacement(thresholdBase(), JSON.parse(JSON.stringify(duplicated))),
    ).toEqual(once);
    const higher = replayPlacement(
      thresholdBase(),
      history(
        [first],
        [b1],
        [r1, revision(b1, ["missing", "missing", "correct"], 2)],
      ),
    );
    expect(higher.mastery).toEqual(once.mastery);
    expect(higher.placement).toEqual(once.placement);
    expect(higher.sessions).toEqual(once.sessions);
    expect(higher.placement.pendingStreak).toBe(1);
  });
  it("correction A -> B is identical to B-only, including downstream sessions", () => {
    const corrected = revision(
      b1,
      ["missing", "missing", "incorrect"],
      2,
      "manual",
    );
    const correctedHistory = history(
      [first, second],
      [b1, b2],
      [r1, r2, corrected, corrected],
    );
    const result = replayPlacement(thresholdBase(), correctedHistory);
    expect(result).toEqual(
      replayPlacement(
        thresholdBase(),
        history([first, second], [b1, b2], [corrected, r2]),
      ),
    );
    const bFromStart = replayPlacement(
      thresholdBase(),
      history(
        [first, second],
        [b1, b2],
        [revision(b1, ["missing", "missing", "incorrect"]), r2],
      ),
    );
    expect(result.mastery).toEqual(bFromStart.mastery);
    expect(result.placement).toEqual(bFromStart.placement);
    expect(result.sessions).toEqual(bFromStart.sessions);
  });
  it("three revisions in all 24 arrival orders give exactly the same replay", () => {
    const v2 = revision(b1, ["missing", "missing", "incorrect"], 2, "manual");
    const v3 = revision(b1, ["missing", "missing", "?"], 3, "manual");
    const expected = replayPlacement(
      thresholdBase(),
      history([first, second], [b1, b2], [v3, r2]),
    );
    const variants = permutations([r1, v2, v3, r2]);
    expect(variants).toHaveLength(24);
    for (const revisions of variants) {
      const result = replayPlacement(
        thresholdBase(),
        history([second, first], [b2, b1], revisions),
      );
      expect(result).toEqual(expected);
    }
  });
  it("correction to missing removes old evidence and its hysteresis contribution", () => {
    const missing = revision(b1, [], 2, "manual");
    const result = replayPlacement(
      thresholdBase(),
      history([first, second], [b1, b2], [r1, missing, r2]),
    );
    expect(result).toEqual(
      replayPlacement(
        thresholdBase(),
        history([first, second], [b1, b2], [missing, r2]),
      ),
    );
    expect(result.mastery.D1).toBe(0.79);
    expect(result.sessions[0]).toMatchObject({
      appliedObservations: 0,
      placement: { pendingStreak: 0, lastEligibleSession: null },
    });
    expect(result.placement.displayed).toEqual(level("D1"));
  });
  it("late exit in an earlier session is replayed before the following session", () => {
    const exit = exitBinding(first, "D2", "D2", "D4");
    const late = revision(exit, ["correct", "correct", "correct"]);
    const expected = replayPlacement(
      thresholdBase(),
      history([first, second], [b1, exit, b2], [r1, late, r2]),
    );
    const result = replayPlacement(
      thresholdBase(),
      history([second, first], [b2, b1, exit], [r2, r1, late, late]),
    );
    expect(result).toEqual(expected);
    expect(result.sessions[0].placement.pendingStreak).toBe(1);
    expect(result.sessions[0].placement.displayed).toEqual(level("D1"));
    expect(result.placement.displayed).toEqual(level("D3"));
  });
  it("open snapshot updates computed; replacing it with finalized counts exactly once", () => {
    const open = { ...first, finalized: false };
    const pending = replayPlacement(
      thresholdBase(),
      history([open], [b1], [r1]),
    );
    expect(pending.placement).toMatchObject({
      computed: level("D2"),
      displayed: level("D1"),
      pendingStreak: 0,
    });
    const closed = replayPlacement(
      thresholdBase(),
      history([first], [b1], [r1]),
    );
    expect(closed.mastery).toEqual(pending.mastery);
    expect(closed.placement.pendingStreak).toBe(1);
  });
  it("manual placement events replay deterministically and never change probabilities", () => {
    const events = [groupMove(1), override(1, lanjut)];
    const automatic = replayPlacement(
      thresholdBase(),
      history([first, second], [b1, b2], [r1, r2]),
    );
    const result = replayPlacement(
      thresholdBase(),
      history([first, second], [b1, b2], [r1, r2], events),
    );
    expect(result.mastery).toEqual(automatic.mastery);
    expect(result.placement).toMatchObject({
      computed: level("D3"),
      displayed: lanjut,
      pendingStreak: 0,
      manualOverride: null,
    });
    expect(result).toEqual(
      replayPlacement(
        thresholdBase(),
        history(
          [second, first],
          [b2, b1],
          [r2, r1],
          [...events.toReversed(), events[1]],
        ),
      ),
    );
    expect(result.teacherEvents.map((event) => event.kind)).toEqual([
      "placement-override",
      "group-move",
    ]);
  });
  it("same assessment ID on another student never copies evidence or manual placement", () => {
    const other = weeklyBinding(first, undefined, OTHER_STUDENT);
    const result = replayPlacement(
      thresholdBase(),
      history(
        [first],
        [b1, other],
        [r1, revision(other, Array(5).fill("incorrect"))],
        [{ ...override(0), studentId: OTHER_STUDENT }],
      ),
    );
    expect(result).toEqual(
      replayPlacement(thresholdBase(), history([first], [b1], [r1])),
    );
    expect(result.observations.every((o) => o.studentId === STUDENT)).toBe(
      true,
    );
    const absent = replayPlacement(
      thresholdBase(),
      history([first], [other], [revision(other, Array(5).fill("correct"))]),
    );
    expect(absent.mastery).toEqual(thresholdBase().mastery);
    expect(absent.sessions[0].appliedObservations).toBe(0);
  });
  it("changing a target without valid observations is not learning evidence", () => {
    const base = {
      ...baseline(),
      mastery: createMastery(0.85),
      displayed: lanjut,
    };
    const result = replayPlacement(
      base,
      history([session(1, "D5"), session(2, "E4")]),
    );
    expect(result.mastery).toEqual(base.mastery);
    expect(result.placement).toMatchObject({
      displayed: lanjut,
      pendingStreak: 0,
      lastEligibleSession: null,
    });
  });
});

describe("Replay guards and privacy", () => {
  it("rejects ambiguous session histories and unsupported engine versions", () => {
    const s = session(1);
    expect(canonicalSessions([session(2), s, s])).toEqual([s, session(2)]);
    expect(() => canonicalSessions([s, { ...s, finalized: false }])).toThrow(
      /snapshot conflict/,
    );
    expect(() => canonicalSessions([s, { ...s, sessionId: id(88) }])).toThrow(
      /ordinal conflict/,
    );
    for (const patch of [
      { engineVersion: 2 },
      { bktConfigVersion: 2 },
      { finalized: "false" },
      { ordinal: -1 },
      { name: "LOCAL_ONLY_CANARY" },
    ])
      expect(() =>
        canonicalSessions([{ ...s, ...patch } as SessionRecord]),
      ).toThrow();
  });
  it("requires binding/session target identity and a first-session initial anchor", () => {
    const s = session(1);
    const b = weeklyBinding(s);
    expect(() => replayPlacement(baseline(), history([], [b]))).toThrow(
      /mismatch/,
    );
    expect(() =>
      replayPlacement(baseline(), history([session(1, "E4")], [b])),
    ).toThrow(/mismatch/);
    expect(() =>
      replayPlacement(
        baseline(),
        history([s, session(2)], [initialBinding(session(2))]),
      ),
    ).toThrow(/first session/);
    expect(() =>
      replayPlacement(baseline(), history([s], [initialBinding(s), b])),
    ).toThrow(/cannot share/);
    expect(() =>
      replayPlacement(baseline(), history([s], [], [], [override(2)])),
    ).toThrow(/no session anchor/);
  });
  it("rejects names/free text and malformed mastery/history instead of carrying them forward", () => {
    const base = baseline();
    for (const patch of [
      { studentId: "LOCAL_ONLY_CANARY" },
      { displayName: "LOCAL_ONLY_CANARY" },
      { displayed: { kind: "lanjut", nickname: "LOCAL_ONLY_CANARY" } },
      { mastery: { ...base.mastery, name: "LOCAL_ONLY_CANARY" } },
    ])
      expect(() =>
        replayPlacement({ ...base, ...patch } as ReplayBaseline, history()),
      ).toThrow();
    for (const collection of [
      "sessions",
      "bindings",
      "revisions",
      "teacherEvents",
    ])
      expect(() =>
        replayPlacement(base, {
          ...history(),
          [collection]: null,
        } as PlacementHistory),
      ).toThrow(/collections/);
    for (const probability of [
      Number.NaN,
      Number.POSITIVE_INFINITY,
      -0.01,
      1.01,
    ])
      expect(() =>
        replayPlacement(
          { ...base, mastery: { ...base.mastery, D1: probability } },
          history(),
        ),
      ).toThrow();
    expect(() =>
      replayPlacement({ ...base, mastery: {} as Mastery }, history()),
    ).toThrow();
    expect(() =>
      replayPlacement(base, {
        ...history(),
        name: "LOCAL_ONLY_CANARY",
      } as PlacementHistory),
    ).toThrow();
    expect(() =>
      replayPlacement(null as unknown as ReplayBaseline, history()),
    ).toThrow();
  });
});
