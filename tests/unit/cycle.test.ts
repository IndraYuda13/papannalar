import { expect, it } from "vitest";
import { exitId, exitFixture } from "../fixtures/exit";
import { buildPackage, freezePackage } from "../../src/core/package/build";
import {
  packageSession,
  deriveTimeline,
} from "../../src/features/session/package-session";
import {
  createCycle,
  closeCycle,
  finalizeCycle,
  freezeCycleGroups,
  reviseCycle,
  setAttendance,
} from "../../src/core/session/cycle";
import { gradeCard } from "../../src/core/assessment/card-response";
import { parseCycle } from "../../src/contracts/cycle";
import {
  parseSavedCard,
  parseAssessmentContext,
} from "../../src/contracts/assessment";
import { questionTool } from "../../src/core/package/tool-task";
import { generateQuestion } from "../../src/core/package/question";
import { publicPresentation } from "../../src/contracts/presentation";
import { toPublicQuestion } from "../../src/contracts/package";
import type { CardChoice } from "../../src/core/assessment/card-response";
function fixture() {
  const { classroom, students } = exitFixture();
  const p = buildPackage({
    id: exitId(60),
    classId: classroom.id,
    grade: 7,
    variant: "initial",
    seed: 412,
    occupied: [],
  });
  const parent = packageSession({
    id: exitId(61),
    classroom,
    students,
    package: freezePackage(p),
    ordinal: 1,
  });
  const cycle = createCycle({
    id: parent.id,
    classId: classroom.id,
    packageId: p.id,
    ordinal: 1,
  });
  const cards = parent.roster.map((s) => {
    const choices: CardChoice[] = [...parent.keys];
    choices[5] = "?";
    const binding = parent.bindings.find((b) => b.studentId === s.id)!;
    return parseSavedCard(parent, {
      id: `${parent.id}/${s.id}`,
      sessionId: parent.id,
      studentId: s.id,
      choices,
      graded: gradeCard(binding, parent.keys, choices, 1, "manual"),
    });
  });
  return { p, parent, cycle, cards };
}
it("fresh package creates ten immutable slots and no preloaded answers or placement", () => {
  const { parent, cycle } = fixture();
  expect(parent.bindings[0].questions).toHaveLength(10);
  expect(parent.session.finalized).toBe(false);
  const result = deriveTimeline(
    [{ context: parent, cards: [] }],
    parent,
    cycle,
  );
  expect(result.ready).toBe(false);
  expect(
    result.placements.every(
      (p) => p.displayed === null && p.replay.observations.length === 0,
    ),
  ).toBe(true);
  expect(() =>
    packageSession({
      id: exitId(64),
      classroom: parent.classroom,
      students: parent.roster,
      package: fixture().p,
      ordinal: 1,
    }),
  ).toThrow("Freeze");
});
it("initial placement is usable before class closure but closure never finalizes assessment", () => {
  const { parent, cards, cycle } = fixture(),
    result = deriveTimeline([{ context: parent, cards }], parent, cycle);
  expect(result.ready).toBe(true);
  expect(result.placements.map((p) => p.displayed)).toEqual(
    Array(3).fill({ kind: "step", stepId: "D1" }),
  );
  const frozen = freezeCycleGroups(cycle, result.grouping.groups),
    ended = closeCycle(frozen);
  expect(ended.assessmentRevision).toBe(0);
  expect(() => finalizeCycle(frozen, 0, false)).toThrow();
  expect(() => finalizeCycle(ended, 1, false)).toThrow();
  const final = finalizeCycle(ended, 1, true);
  expect(finalizeCycle(final, 1, true)).toBe(final);
  expect(reviseCycle(final).assessmentRevision).toBe(2);
  expect(reviseCycle(cycle)).toBe(cycle);
  expect(() =>
    setAttendance(
      frozen,
      [parent.roster[0].id],
      parent.roster.map((s) => s.id),
    ),
  ).toThrow();
});
it("missing never places; explicit absence excludes only that student and freezes independently", () => {
  const { parent, cards, cycle } = fixture();
  const absent = setAttendance(
    cycle,
    [parent.roster[2].id],
    parent.roster.map((s) => s.id),
  );
  const partial = [{ context: parent, cards: cards.slice(0, 2) }];
  expect(deriveTimeline(partial, parent, cycle).ready).toBe(false);
  const result = deriveTimeline(partial, parent, absent);
  expect(result.ready).toBe(true);
  expect(result.grouping.groups.flatMap((g) => g.members)).toHaveLength(2);
  expect(result.placements[2].replay.observations).toEqual([]);
  expect(() => setAttendance(cycle, [exitId(900)], [])).toThrow();
  expect(() => parseCycle({ ...absent, nickname: "prohibited" })).toThrow();
});
it("full timeline retains hysteresis across sessions and duplicate snapshots do not add observations", () => {
  const { parent, cards } = fixture();
  const initial = parseAssessmentContext({
    ...parent,
    session: { ...parent.session, finalized: true },
  });
  const pkg = freezePackage(
    buildPackage({
      id: exitId(62),
      classId: parent.classroom.id,
      grade: 7,
      variant: "weekly",
      seed: 822,
      occupied: [{ kind: "step", stepId: "D1" }],
    }),
  );
  const next = packageSession({
    id: exitId(63),
    classroom: parent.classroom,
    students: parent.roster,
    package: pkg,
    ordinal: 2,
  });
  const bundles = [
    { context: initial, cards },
    { context: next, cards: [] },
  ];
  const result = deriveTimeline(bundles, next);
  expect(result.placements[0].displayed).toEqual({
    kind: "step",
    stepId: "D1",
  });
  expect(result.placements[0].replay.sessions).toHaveLength(2);
  expect(
    deriveTimeline([...bundles, bundles[0]], next).placements[0].replay,
  ).toEqual(result.placements[0].replay);
});
it("oral-only parent has no mass check; forged empty secondary checks are rejected", () => {
  const { parent } = fixture();
  expect(() =>
    parseAssessmentContext({ ...parent, keys: [], bindings: [] }),
  ).toThrow();
  expect(() =>
    parseAssessmentContext({
      ...parent,
      oralOnly: true,
      keys: [],
      bindings: [],
    }),
  ).toThrow();
  const classroom = { ...parent.classroom, grade: 2 };
  const p = freezePackage(
    buildPackage({
      id: exitId(64),
      classId: classroom.id,
      grade: 2,
      variant: "oral",
      seed: 112,
      occupied: [],
    }),
  );
  expect(
    packageSession({
      id: exitId(65),
      classroom,
      students: parent.roster,
      package: p,
      ordinal: 1,
    }),
  ).toMatchObject({ oralOnly: true, keys: [], bindings: [] });
});
it("check projection carries question 10 and allowlists remove injected private fields", () => {
  const { p } = fixture();
  const payload = publicPresentation({
    schemaVersion: 1,
    mode: "check",
    question: 10,
    taskEpoch: exitId(78),
    groups: [],
    package: { id: p.id, revision: 1 },
    check: {
      packageId: p.id,
      revision: 1,
      total: 10,
      seconds: 75,
      question: {
        ...toPublicQuestion(p.assessment[9]),
        ...{ answerKey: "A", name: "forbidden", level: "D1" },
      },
    },
  });
  expect(payload.question).toBe(10);
  expect(JSON.stringify(payload)).not.toMatch(
    /answerKey|forbidden|level|stepId/,
  );
  expect(() => publicPresentation({ ...payload, check: undefined })).toThrow();
});
it("package tool descriptors use actual parameters, unsupported concepts are explicit", () => {
  for (const step of ["D1", "C3", "D2", "C4", "D3", "D4", "D5"] as const) {
    const q = generateQuestion(step, 411),
      tool = questionTool(q);
    expect(tool).toBeDefined();
    if (tool?.kind === "algebra") expect(tool.groups).toBe(q.params.a);
    if (tool?.kind === "number-line")
      expect(tool.delta.numerator).toBe(-q.params.b);
    if (tool?.kind === "fractions")
      expect(tool.left.numerator).toBe(q.params.a);
    if (tool?.kind === "balance") {
      expect(tool.left).toEqual({ x: q.params.a, constant: q.params.b });
      expect(tool.right).toEqual({
        x: 0,
        constant: q.params.a * q.params.c + q.params.b,
      });
    }
  }
  expect(questionTool(generateQuestion("C2", 19))).toBeUndefined();
});
