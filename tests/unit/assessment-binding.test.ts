import { describe, expect, it } from "vitest";
import {
  canonicalBindings,
  freezeBinding,
} from "../../src/core/assessment/binding";
import {
  bindObservations,
  canonicalRevisions,
  freezeRevision,
} from "../../src/core/assessment/revisions";
import { observeBkt, type AnswerResult } from "../../src/core/bkt/observations";
import {
  STUDENT,
  OTHER_STUDENT,
  id,
  session,
  initialBinding,
  weeklyBinding,
  exitBinding,
  revision,
} from "../fixtures/placement";

describe("Frozen assessment and exit observation binding", () => {
  const outcomes: readonly AnswerResult[] = [
    "correct",
    "incorrect",
    "?",
    "missing",
  ];
  it.each(
    outcomes.flatMap((answer) =>
      outcomes.map((reason) => ({ answer, reason })),
    ),
  )(
    "exit $answer + $reason produces one pair plus separate context",
    ({ answer, reason }) => {
      const binding = exitBinding(session(1), "D1", "D4", "D3");
      const events = bindObservations(
        binding,
        revision(binding, [answer, reason, "correct"]),
        1,
      );
      expect(events).toHaveLength(2);
      expect(events[0]).toMatchObject({
        studentId: STUDENT,
        sessionId: session(1).sessionId,
        cardType: "exit",
        stepId: "D1",
        bindingVersion: 1,
        revision: 1,
        bktConfigVersion: 1,
        observationOrder: 0,
      });
      expect(events[0].outcome).toEqual({ kind: "exit-pair", answer, reason });
      expect(events[1]).toMatchObject({
        stepId: "D4",
        observationOrder: 1,
        outcome: { kind: "regular", answer: "correct" },
      });
      expect(events[0].questionIds).toHaveLength(2);
      expect(events[1].questionIds).toHaveLength(1);
      const result = observeBkt(0.3, events[0].outcome);
      if (answer === "missing" || reason === "missing")
        expect(result).toEqual({ status: "pending", probability: 0.3 });
      else if (answer === "?" || reason === "?")
        expect(result.probability).toBeCloseTo(0.171052631579, 9);
      else
        expect(result.probability).toBeCloseTo(
          answer === "correct" && reason === "correct"
            ? 0.796774193548
            : 0.178260869565,
          9,
        );
    },
  );
  it("pair + context on same step uses exactly two updates, not three", () => {
    const binding = exitBinding(session(1));
    const events = bindObservations(
      binding,
      revision(binding, ["correct", "correct", "correct"]),
      1,
    );
    expect(
      events.reduce(
        (p, event) => observeBkt(p, event.outcome).probability,
        0.3,
      ),
    ).toBeCloseTo(0.951724137931, 9);
  });
  it("initial emits no BKT observations; weekly emits five row identities", () => {
    const s = session(1);
    const initial = initialBinding(s);
    expect(
      bindObservations(
        initial,
        revision(initial, Array(10).fill("correct")),
        1,
      ),
    ).toEqual([]);
    const weekly = weeklyBinding(s);
    const events = bindObservations(
      weekly,
      revision(weekly, ["correct", "?", "missing", "incorrect", "correct"]),
      1,
    );
    expect(events.map((event) => event.stepId)).toEqual([
      "C3",
      "C4",
      "D1",
      "D2",
      "D3",
    ]);
    expect(new Set(events.map((event) => event.id)).size).toBe(5);
    expect(
      events.every(
        (event) => event.assessmentOrder === 1 && event.cardType === "weekly",
      ),
    ).toBe(true);
  });
  it("identity stable across corrections; same assessment supports different students", () => {
    const binding = exitBinding(session(1));
    const before = bindObservations(
      binding,
      revision(binding, ["correct", "correct", "correct"]),
      1,
    );
    const after = bindObservations(
      binding,
      revision(binding, ["incorrect", "correct", "correct"], 2, "manual"),
      1,
    );
    expect(after.map((event) => event.id)).toEqual(
      before.map((event) => event.id),
    );
    expect(after[0]).toMatchObject({ source: "manual", revision: 2 });
    const other = exitBinding(session(1), "D2", "D2", "D2", OTHER_STUDENT);
    expect(canonicalBindings([binding, other])).toHaveLength(2);
    expect(
      bindObservations(
        other,
        revision(other, ["correct", "correct", "correct"]),
        1,
      )[0].id,
    ).not.toBe(before[0].id);
  });
  it("binding cloned/deep frozen; changing current group cannot rewrite it", () => {
    const original = JSON.parse(JSON.stringify(exitBinding(session(1))));
    const binding = freezeBinding(original);
    original.questions[0].stepId = "E4";
    original.activityStep = "E4";
    expect(binding.questions[0].stepId).toBe("D1");
    expect(Reflect.set(binding.questions[0], "stepId", "E4")).toBe(false);
    expect(Reflect.set(binding, "version", 2)).toBe(false);
    expect(canonicalBindings([binding, binding])).toEqual([binding]);
    expect(() =>
      canonicalBindings([binding, { ...binding, version: 2 }]),
    ).toThrow(/conflict/);
    expect(() =>
      canonicalBindings([binding, { ...binding, assessmentId: id(98) }]),
    ).toThrow(/slot/);
  });
  it("duplicate row IDs, wrong steps and malformed source bindings rejected", () => {
    const binding = exitBinding(session(1));
    expect(() =>
      freezeBinding({ ...binding, questions: binding.questions.slice(1) }),
    ).toThrow();
    expect(() =>
      freezeBinding({
        ...binding,
        questions: binding.questions.map((row) => ({ ...row, rowIndex: 1 })),
      }),
    ).toThrow();
    expect(() =>
      freezeBinding({
        ...binding,
        questions: binding.questions.map((row) => ({
          ...row,
          questionId: id(8),
        })),
      }),
    ).toThrow();
    expect(() => freezeBinding({ ...binding, exitBaseStep: "D2" })).toThrow();
    expect(() =>
      freezeBinding({
        ...binding,
        exitContextStep: "C4",
        questions: binding.questions.map((row) =>
          row.rowIndex === 3 ? { ...row, stepId: "C4" } : row,
        ),
      }),
    ).toThrow();
    const initial = initialBinding(session(1));
    expect(() => freezeBinding({ ...initial, target: "D4" })).toThrow();
    const weekly = weeklyBinding(session(1));
    expect(() =>
      freezeBinding({
        ...weekly,
        questions: weekly.questions.map((row) =>
          row.rowIndex === 3 ? { ...row, stepId: "E4" } : row,
        ),
      }),
    ).toThrow();
    expect(() => freezeBinding({ ...weekly, questions: null })).toThrow();
  });
});

describe("Canonical revisions", () => {
  const binding = exitBinding(session(1));
  const first = revision(binding, ["correct", "correct", "correct"]);
  const second = revision(
    binding,
    ["incorrect", "correct", "missing"],
    2,
    "manual",
  );
  const third = revision(binding, ["?", "correct", "incorrect"], 3, "demo");
  it("latest revision, repeat retries, row order and log order are deterministic", () => {
    expect(
      canonicalRevisions([binding], [second, first, third, second, third]),
    ).toEqual([third]);
    expect(canonicalRevisions([binding], [third])).toEqual([third]);
    expect(
      canonicalRevisions(
        [binding],
        [first, { ...first, responses: first.responses.toReversed() }],
      ),
    ).toEqual([first]);
  });
  it("conflicting same revision rejected even when a later revision exists", () => {
    const conflict = revision(binding, ["incorrect", "incorrect", "incorrect"]);
    for (const inputs of [
      [first, conflict, third],
      [third, conflict, first],
    ])
      expect(() => canonicalRevisions([binding], inputs)).toThrow(/conflict/);
    expect(() =>
      canonicalRevisions([binding, { ...binding, version: 2 }], [first]),
    ).toThrow(/conflict/);
  });
  it.each([
    { assessmentId: id(99) },
    { studentId: OTHER_STUDENT },
    { sessionId: id(99) },
    { bindingVersion: 2 },
    { revision: 0 },
    { revision: 2 },
    { baseRevision: -1 },
    { source: "invented" },
    { responses: null },
    { responses: [] },
    { name: "LOCAL_ONLY_CANARY" },
  ])("invalid revision or privacy extra field rejected %#", (patch) => {
    expect(() => freezeRevision(binding, { ...first, ...patch })).toThrow();
  });
  it("wrong question id, duplicate/missing rows, invalid answer and unbound log fail", () => {
    expect(() =>
      freezeRevision(binding, {
        ...first,
        responses: first.responses.map((row) => ({
          ...row,
          questionId: id(99),
        })),
      }),
    ).toThrow();
    expect(() =>
      freezeRevision(binding, {
        ...first,
        responses: first.responses.map((row) => ({ ...row, rowIndex: 1 })),
      }),
    ).toThrow();
    expect(() =>
      freezeRevision(binding, {
        ...first,
        responses: first.responses.map((row) => ({ ...row, result: "empty" })),
      }),
    ).toThrow();
    expect(() => canonicalRevisions([], [first])).toThrow(/Unbound/);
    expect(() => bindObservations(binding, first, 0)).toThrow();
  });
  it("names/nicknames/prototypes cannot enter frozen bindings or error output", () => {
    for (const field of ["name", "nickname", "displayName", "toJSON"]) {
      expect(() =>
        freezeBinding({ ...binding, [field]: "LOCAL_ONLY_CANARY" }),
      ).toThrow();
    }
    expect(() =>
      freezeBinding({ ...binding, studentId: "LOCAL_ONLY_CANARY" }),
    ).toThrow("Invalid random identity");
    expect(() =>
      freezeBinding(
        Object.assign(
          Object.create({ nickname: "LOCAL_ONLY_CANARY" }),
          binding,
        ),
      ),
    ).toThrow();
  });
});
