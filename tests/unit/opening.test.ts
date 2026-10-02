import { it, expect } from "vitest";
import {
  demoOpening,
  openingFromPackage,
} from "../../src/core/package/opening";
import { publicLesson, lessonSchema } from "../../src/contracts/lesson";
import { exampleFrames, modelResult } from "../../src/core/tools/patterns";
import {
  planTurns,
  startTurn,
  turnCounts,
} from "../../src/core/turns/scheduler";
it("catalog opening preserves context/objective, SD intuition and oral reflection without a target key", () => {
  const lift = demoOpening(7),
    sd = demoOpening(5),
    sma = demoOpening(10);
  expect(lift.prompt).toContain("basement −2");
  expect(lift.tool?.kind).toBe("number-line");
  expect(modelResult(exampleFrames(lift.tool!).at(-1)!)).toBe("5");
  expect(lift.intuitiveOnly).toBe(false);
  expect(sd.intuitiveOnly).toBe(true);
  expect(sd.tool?.kind).toBe("fractions");
  expect(sma.prompt).toContain("Paket A");
  expect(
    openingFromPackage({
      grade: 2,
      opening: {
        prompt: "Bandingkan 2 dan 3.",
        followup: "Mana lebih banyak?",
        objective: "Membandingkan jumlah.",
        why: "Bagaimana caramu?",
      },
    }).oralReflection,
  ).toBe(true);
  const enriched = {
    ...lift,
    studentName: "CANARY",
    stepId: "D1",
    answerKey: "A",
  };
  expect(publicLesson(enriched)).toEqual(lift);
  expect(lessonSchema.safeParse(enriched).success).toBe(false);
});
it("opening uses the same semester ledger, all class members eligible, preview no count and actual-start idempotent", () => {
  const id = (n: number) =>
    `10000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
  const students = Array.from({ length: 32 }, (_, i) => ({
    studentId: id(i + 1),
    attendanceNumber: i + 1,
    present: true,
    navigatorFirst: i === 0,
  }));
  const event = planTurns({
    id: id(90),
    sessionId: id(80),
    groupId: null,
    taskIndex: 0,
    seed: 7,
    students,
    events: [],
    teams: [students.map((s) => s.studentId)],
    verifiedTouches: 2,
  });
  expect(event.pilots).not.toContain(id(1));
  expect(event.pilots).toHaveLength(2);
  expect(turnCounts([], event.pilots[0]).pilot).toBe(0);
  const actual = startTurn([], event);
  expect(startTurn(actual, event)).toEqual(actual);
  const next = planTurns({
    id: id(91),
    sessionId: id(81),
    groupId: null,
    taskIndex: 0,
    seed: 7,
    students,
    events: actual,
    teams: [students.map((s) => s.studentId)],
    verifiedTouches: 2,
  });
  expect(next.pilots.every((p) => !event.pilots.includes(p))).toBe(true);
});
