import { describe, expect, it } from "vitest";
import {
  answerOral,
  createOralRun,
  evaluateOral,
  resumeOral,
  skipOral,
  undoOral,
  type OralRun,
  type OralResult,
} from "../../src/core/oral/state";
import { parseOralRun, toOralDto } from "../../src/contracts/oral";
import { seededGroupId } from "../../src/core/math/seed";
const input = {
  id: seededGroupId(1, 0),
  classId: seededGroupId(1, 1),
  studentId: seededGroupId(1, 2),
  attendanceNumber: 1,
  grade: 7,
  seed: 123,
};
const answer = (run: OralRun, result: OralResult) =>
  answerOral(run, {
    questionId: evaluateOral(run).question!.id,
    result,
    misconceptionCode: null,
  });
describe("ORAL01 deterministic search and raw evidence", () => {
  it("starts target-2, ascends to target, and all correct yields Lanjut with G=.05", () => {
    let run = createOralRun(input);
    expect(run.start).toBe("D3");
    run = answer(run, "correct");
    expect(evaluateOral(run).mastery.D3).toBeCloseTo(0.896721311475, 9);
    expect(evaluateOral(run).currentStep).toBe("D4");
    run = answer(answer(run, "correct"), "correct");
    const result = evaluateOral(run);
    expect(result.placement).toEqual({ kind: "lanjut" });
    expect(result.mastery.A1).toBe(0.3); // placement is not an invented mastery anchor
    expect(result.override).toMatchObject({
      source: "oral-placement",
      provisional: "K13",
    });
    expect(result.observationCount).toBe(3);
  });
  it("first wrong descends until correct and returns lowest failure", () => {
    let run = createOralRun(input);
    run = answer(run, "incorrect");
    expect(evaluateOral(run).currentStep).toBe("D2");
    run = answer(run, "silent");
    expect(evaluateOral(run).currentStep).toBe("D1");
    run = answer(run, "correct");
    expect(evaluateOral(run).placement).toEqual({ kind: "step", stepId: "D2" });
  });
  it("wrong after climbing stops immediately; A1 is the floor", () => {
    const run = answer(answer(createOralRun(input), "correct"), "incorrect");
    expect(evaluateOral(run).placement).toEqual({ kind: "step", stepId: "D4" });
    const low = createOralRun({ ...input, grade: 1 });
    expect(low.start).toBe("A1");
    expect(evaluateOral(answer(low, "silent")).placement).toEqual({
      kind: "step",
      stepId: "A1",
    });
  });
  it("below-range starts recorded-2 and every trajectory is bounded by 22", () => {
    expect(createOralRun({ ...input, recorded: "B4" }).start).toBe("B2");
    for (let grade = 1; grade <= 12; grade++)
      for (const result of ["correct", "incorrect", "silent"] as const) {
        let run = createOralRun({ ...input, grade });
        while (evaluateOral(run).status === "active") {
          run = answer(run, result);
          expect(run.answers.length).toBeLessThanOrEqual(22);
        }
        expect(evaluateOral(run).status).toBe("complete");
      }
  });
  it("absence creates no observation and resume preserves current question", () => {
    const first = createOralRun(input),
      skipped = skipOral(first);
    expect(evaluateOral(skipped).observationCount).toBe(0);
    expect(evaluateOral(skipped).mastery).toEqual(first.baseline);
    expect(evaluateOral(resumeOral(skipped)).question).toEqual(
      evaluateOral(first).question,
    );
    expect(() => answer(skipped, "correct")).toThrow();
  });
  it("duplicate is idempotent, undo replays baseline, divergent retry is refused", () => {
    const first = createOralRun(input),
      updated = answer(first, "correct"),
      q = evaluateOral(first).question!;
    expect(
      answerOral(updated, {
        questionId: q.id,
        result: "correct",
        misconceptionCode: null,
      }),
    ).toBe(updated);
    expect(() =>
      answerOral(updated, {
        questionId: q.id,
        result: "incorrect",
        misconceptionCode: null,
      }),
    ).toThrow();
    const undone = undoOral(updated);
    expect(evaluateOral(undone).mastery).toEqual(first.baseline);
    expect(evaluateOral(answer(undone, "incorrect")).observationCount).toBe(1);
    expect(undoOral(first)).toBe(first);
    expect(resumeOral(first)).toBe(first);
  });
  it("only mapped distractor diagnosis is accepted; schema rejects local identity and invalid paths", () => {
    const run = createOralRun({ ...input, target: "D3" });
    const q = evaluateOral(run).question!,
      code =
        q.options.find((o) => o.misconceptionCode)?.misconceptionCode ?? null;
    const graded = answerOral(run, {
      questionId: q.id,
      result: "incorrect",
      misconceptionCode: code,
    });
    expect(parseOralRun(graded)).toEqual(graded);
    expect(() =>
      answerOral(run, {
        questionId: q.id,
        result: "incorrect",
        misconceptionCode: "D9.9",
      }),
    ).toThrow();
    expect(() =>
      answerOral(run, {
        questionId: seededGroupId(87, 0),
        result: "correct",
        misconceptionCode: null,
      }),
    ).toThrow();
    expect(() => parseOralRun({ ...run, name: "PRIVATE_SENTINEL" })).toThrow();
    expect(
      JSON.stringify(
        toOralDto({ ...run, name: "PRIVATE_SENTINEL" } as OralRun),
      ),
    ).not.toContain("PRIVATE_SENTINEL");
    expect(() =>
      parseOralRun({
        ...graded,
        answers: [...graded.answers, ...graded.answers],
      }),
    ).toThrow();
  });
});
