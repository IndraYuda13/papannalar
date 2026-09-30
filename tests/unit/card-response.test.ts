import { describe, expect, it } from "vitest";
import { gradeCard } from "../../src/core/assessment/card-response";
import {
  demoAnswers,
  DEMO_KEYS,
  DEMO_TEMPLATE,
} from "../../src/content/demo/weekly";
import { weeklyBinding, session } from "../fixtures/placement";
import {
  parseAssessmentContext,
  responseEvent,
} from "../../src/contracts/assessment";
import {
  createDemoContext,
  deriveSession,
} from "../../src/features/session/demo-session";
import { demoGroupRoster } from "../../src/content/demo/class-7b";
import { id } from "../fixtures/placement";

export function demoContext() {
  let n = 1000;
  const classroom = {
    id: id(90),
    label: "7B",
    grade: 7,
    count: 32,
    mode: "demo" as const,
    revision: 1,
  };
  return createDemoContext(
    classroom,
    demoGroupRoster().map((s) => ({
      schemaVersion: 1,
      id: s.studentId,
      classId: classroom.id,
      attendanceNumber: s.attendanceNumber,
      active: true,
    })),
    () => id(n++),
  );
}
describe("Card grading and PRELIM input", () => {
  it("grades 5 slots including selected unknown and genuinely missing", () => {
    expect(
      gradeCard(
        weeklyBinding(session(1)),
        ["A", "B", "C", "D", "A"],
        ["A", "A", "?", "missing", "A"],
        1,
        "omr",
      ).responses.map((r) => r.result),
    ).toEqual(["correct", "incorrect", "?", "missing", "correct"]);
  });
  it("rejects incomplete, invalid keys and revisions", () => {
    const b = weeklyBinding(session(1));
    expect(() => gradeCard(b, DEMO_KEYS, ["A"], 1, "omr")).toThrow();
    expect(() =>
      gradeCard(b, ["?", ...DEMO_KEYS.slice(1)], demoAnswers(7), 1, "omr"),
    ).toThrow();
    expect(() => gradeCard(b, DEMO_KEYS, demoAnswers(7), 0, "omr")).toThrow();
  });
  it("generates keys and exactly five D1.2 distractors; metadata stays draft", () => {
    expect(DEMO_KEYS).toEqual(["A", "B", "C", "D", "A"]);
    expect(
      Array.from({ length: 7 }, (_, i) => demoAnswers(i + 1)[2]).filter(
        (a) => a === "B",
      ),
    ).toHaveLength(5);
    expect(DEMO_TEMPLATE).toMatchObject({ status: "draft", reviewer: null });
  });
  it("freezes context and rejects extra identity fields or mismatched roster", () => {
    const ctx = demoContext();
    expect(() =>
      parseAssessmentContext({ ...ctx, name: "prohibited" }),
    ).toThrow();
    expect(() =>
      parseAssessmentContext({
        ...ctx,
        roster: ctx.roster.map((s, i) => (i ? s : { ...s, classId: id(99) })),
      }),
    ).toThrow();
  });
  it("all 32 responses go through replay before grouping; corrections replace observations", () => {
    const ctx = demoContext();
    const cards = ctx.roster.map((s) => ({
      id: `${ctx.id}/${s.id}`,
      sessionId: ctx.id,
      studentId: s.id,
      choices: [...demoAnswers(s.attendanceNumber)],
      graded: gradeCard(
        ctx.bindings.find((b) => b.studentId === s.id)!,
        ctx.keys,
        demoAnswers(s.attendanceNumber),
        1,
        "demo",
      ),
    }));
    const result = deriveSession(ctx, cards);
    expect(result.grouping.groups.map((g) => g.members.length)).toEqual([
      7, 13, 12,
    ]);
    expect(result.placements.every((p) => p.observations === 5)).toBe(true);
    const card = cards[0];
    const corrected = {
      ...card,
      graded: gradeCard(ctx.bindings[0], ctx.keys, card.choices, 2, "manual"),
    };
    expect(
      deriveSession(ctx, [corrected, ...cards.slice(1)]).placements[0]
        .observations,
    ).toBe(5);
    const event = responseEvent(ctx, corrected);
    expect(Object.keys(event)).toEqual([
      "schemaVersion",
      "eventId",
      "classId",
      "sessionId",
      "studentId",
      "operation",
      "baseRevision",
      "revision",
      "source",
      "assessmentId",
      "bindingVersion",
      "choices",
      "responses",
    ]);
    expect(() =>
      responseEvent(ctx, {
        ...corrected,
        photo: "data:image",
      } as typeof corrected),
    ).toThrow();
  });
  it("never injects demo seed into a pilot class", () => {
    const ctx = demoContext();
    expect(() =>
      createDemoContext(
        { ...ctx.classroom, mode: "pilot" },
        ctx.roster.map((s) => ({ schemaVersion: 1, ...s })),
        () => id(1),
      ),
    ).toThrow();
  });
});
