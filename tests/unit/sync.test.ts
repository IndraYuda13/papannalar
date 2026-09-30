import { expect, it } from "vitest";
import { syncFixture, syncHistoryFixture } from "../fixtures/sync";
import { fromSyncOral, toSyncOral } from "../../src/contracts/sync-history";
import { observeBkt } from "../../src/core/bkt/observations";
import {
  toSessionSync,
  sessionSyncSchema,
  syncBatchSchema,
} from "../../src/contracts/sync";
import {
  toSyncPackage,
  fromSyncPackage,
} from "../../src/contracts/sync-package";
import {
  hydrateSyncSession,
  replaySyncHistory,
} from "../../src/features/session/sync-replay";
import { syncFailure, retryDelay } from "../../src/core/session/sync-policy";
import { exitId } from "../fixtures/exit";
import {
  chooseLocalResponses,
  reviewSyncConflict,
} from "../../src/contracts/sync-conflict";

it("compact package reconstructs frozen keys, reasoning and context exactly", () => {
  const f = syncFixture(),
    restored = fromSyncPackage(toSyncPackage(f.pkg));
  expect(restored.assessment).toEqual(f.pkg.assessment);
  expect(restored.activities).toEqual(f.pkg.activities);
  expect(restored.opening).toEqual(f.pkg.opening);
  expect(JSON.stringify(f.mutation).length).toBeLessThan(262144);
});
it("explicit serializer excludes canaries and never transmits keys or client mastery", () => {
  const f = syncFixture(),
    canary = "PRIVATE_CANARY_NEVER_SEND";
  const value = toSessionSync({
    cycle: { ...f.cycle, nickname: canary },
    package: { ...f.pkg, localName: canary },
    bundles: [
      {
        context: {
          ...f.parent,
          roster: f.parent.roster.map((s) => ({ ...s, name: canary })),
        },
        cards: f.cards,
      },
    ],
  } as Parameters<typeof toSessionSync>[0]);
  const text = JSON.stringify(value);
  expect(text).not.toContain(canary);
  for (const key of [
    "answerKey",
    "reasonKey",
    "mastery",
    "baselines",
    "graded",
    "prompt",
  ])
    expect(text).not.toContain(`"${key}"`);
  expect(() =>
    sessionSyncSchema.parse({ ...f.payload, nickname: canary }),
  ).toThrow();
  expect(() =>
    sessionSyncSchema.parse({
      ...f.payload,
      roster: [{ ...f.payload.roster[0], nickname: canary }],
    }),
  ).toThrow();
});
it("server regrades choices and exit pair is one observation, missing stays pending", () => {
  const f = syncFixture(),
    restored = hydrateSyncSession(f.payload, f.classroom);
  expect(restored.bundles[0].cards).toEqual(f.cards);
  expect(restored.bundles[1].cards).toEqual(f.exitCards);
  const result = replaySyncHistory([f.payload], f.classroom)!;
  // Initial placement seeds the anchor; its ten rows are not ten BKT updates.
  expect(result.placements[0].replay.observations).toHaveLength(2);
  expect(result.placements[1].replay.observations).toHaveLength(0);
  expect(result.placements[1].displayed).toEqual({
    kind: "step",
    stepId: "D1",
  });
  expect(() =>
    hydrateSyncSession(
      { ...f.payload, cards: [...f.payload.cards, f.payload.cards[0]] },
      f.classroom,
    ),
  ).toThrow("Duplicate response");
  expect(() =>
    hydrateSyncSession(
      {
        ...f.payload,
        cards: [{ ...f.payload.cards[0], studentId: exitId(999) }],
      },
      f.classroom,
    ),
  ).toThrow("Unbound");
});
it("unknown parent, conflicting ordinal and unsupported engine fail closed", () => {
  const f = syncFixture();
  expect(() =>
    hydrateSyncSession(
      { ...f.payload, cycle: { ...f.payload.cycle, classId: exitId(990) } },
      f.classroom,
    ),
  ).toThrow();
  expect(() => replaySyncHistory([f.payload, f.payload], f.classroom)).toThrow(
    "Duplicate ordinal",
  );
  expect(() =>
    sessionSyncSchema.parse({ ...f.payload, engineVersion: 2 }),
  ).toThrow();
  expect(() =>
    syncBatchSchema.parse({ mutations: Array(51).fill(f.mutation) }),
  ).toThrow();
});
it.each([
  [401, "login"],
  [403, "forbidden"],
  [404, "forbidden"],
  [409, "review"],
  [422, "invalid"],
  [413, "invalid"],
  [429, "retry"],
  [503, "retry"],
])("HTTP %s has bounded recovery %s", (status, expected) => {
  expect(syncFailure(Number(status))).toBe(expected);
});
it("backoff honors Retry-After and caps exponential growth with jitter", () => {
  expect(Array.from({ length: 7 }, (_, i) => retryDelay(i, 0.5))).toEqual([
    1000, 2000, 4000, 8000, 16000, 30000, 30000,
  ]);
  expect(retryDelay(0, 0, 120)).toBe(120000);
  expect(() => retryDelay(-1, 0)).toThrow();
});
it("explicit conflict choice preserves unrelated canonical answers and increments only changed cards", () => {
  const { payload } = syncFixture();
  const local = structuredClone(payload),
    canonical = structuredClone(payload);
  local.cards[0].choices[0] = "?";
  canonical.cards[1].choices[0] = "?";
  canonical.cards[1].revision = 3;
  // Local student 2 matches the reviewed canonical answer; only student 1 is chosen.
  local.cards[1] = structuredClone(canonical.cards[1]);
  expect(reviewSyncConflict(local, canonical).changes).toHaveLength(1);
  const selected = chooseLocalResponses(local, canonical);
  expect(selected.cards[0].revision).toBe(2);
  expect(selected.cards[1]).toEqual(canonical.cards[1]);
  expect(selected.cards[2]).toEqual(canonical.cards[2]);
  expect(selected.cycle.groups).toEqual(canonical.cycle.groups);
  expect(selected.cycle.assessmentRevision).toBe(
    canonical.cycle.assessmentRevision + 1,
  );
  const replay = replaySyncHistory([selected], syncFixture().classroom)!;
  expect(replay.placements[0].replay.sessions).toHaveLength(1);
  expect(replay.placements[0].replay.observations).toHaveLength(2);
});
it("frozen package conflicts cannot be resolved by relabeling old choices", () => {
  const { payload } = syncFixture(),
    other = structuredClone(payload);
  other.package.seed++;
  expect(reviewSyncConflict(payload, other).compatible).toBe(false);
  expect(() => chooseLocalResponses(payload, other)).toThrow("Frozen");
});
it("oral wire contains raw answers and deterministically rebuilds question binding, never a mastery checkpoint", () => {
  const f = syncHistoryFixture(),
    wire = toSyncOral(f.run);
  expect(JSON.stringify(wire)).not.toContain("baseline");
  const restored = fromSyncOral(wire, f.classroom.id);
  expect(restored.answers).toEqual(f.run.answers);
  expect(toSyncOral(restored)).toEqual(wire);
  const next = hydrateSyncSession(f.payload, f.classroom);
  expect(next.oralRuns[0].answers).toEqual(f.run.answers);
  expect(next.turns[0].events).toHaveLength(1);
});
it("late correction before oral evidence rebases mastery while historical groups and session count stay frozen", () => {
  const f = syncHistoryFixture(),
    baseline = syncFixture();
  const before = replaySyncHistory([baseline.payload], f.classroom)!
    .placements[0].replay.mastery;
  const original = replaySyncHistory([f.payload], f.classroom)!.placements[0]
    .replay;
  const step = f.run.answers[0].stepId;
  expect(original.mastery[step]).toBe(
    observeBkt(before[step], { kind: "oral", answer: "correct" }).probability,
  );
  const corrected = structuredClone(f.payload);
  corrected.cards[0].choices = [...f.parent.keys];
  corrected.cards[0].revision++;
  corrected.cycle.assessmentRevision++;
  const replay = replaySyncHistory([corrected], f.classroom)!.placements[0]
    .replay;
  expect(replay.mastery[step]).not.toBe(original.mastery[step]);
  expect(replay.sessions).toHaveLength(1);
  expect(replay.placement.displayed).toEqual(original.placement.displayed);
  expect(corrected.cycle.groups).toEqual(f.payload.cycle.groups);
  expect(
    replaySyncHistory(
      [{ ...corrected, oral: [corrected.oral[0], corrected.oral[0]] }],
      f.classroom,
    )!.placements[0].replay.mastery,
  ).toEqual(replay.mastery);
});
