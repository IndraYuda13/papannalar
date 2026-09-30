import { it, expect } from "vitest";
import { exitFixture, exitId } from "../fixtures/exit";
import {
  exitBindings,
  exitKeys,
  gradeExit,
  summarizeExit,
  exitDiagnosis,
} from "../../src/core/assessment/exit";
import { bindObservations } from "../../src/core/assessment/revisions";
import { observeBkt } from "../../src/core/bkt/observations";
import {
  exitContext,
  parseExitPlan,
  publicExit,
  publicExitSchema,
} from "../../src/contracts/exit";
import {
  parseAssessmentContext,
  responseEvent,
  parseSavedCard,
} from "../../src/contracts/assessment";
import { replayPlacement } from "../../src/core/placement/replay";
import { gradeCard } from "../../src/core/assessment/card-response";
import { generateQuestion } from "../../src/core/package/question";
it("K05 frozen merged group uses lower base, higher context and two observations", () => {
  const { plan, group, students } = exitFixture(),
    binding = exitBindings(plan)[0],
    keys = exitKeys(plan, students[0].id);
  expect(binding.questions.map((q) => q.stepId)).toEqual(["C3", "C3", "D1"]);
  const revision = gradeExit(plan, students[0].id, keys, 1, "omr"),
    obs = bindObservations(binding, revision, 1);
  expect(obs.map((o) => o.outcome.kind)).toEqual(["exit-pair", "regular"]);
  expect(obs[0].questionIds).toHaveLength(2);
  expect(group.activityStep).toBe("D1");
  expect(Object.isFrozen(binding)).toBe(true);
});
it("correct answer with incorrect reason is incorrect, missing pending and ? G0", () => {
  const { plan, students } = exitFixture(),
    binding = exitBindings(plan)[0],
    keys = exitKeys(plan, students[0].id),
    wrong = keys[1] === "A" ? "B" : "A";
  const failed = gradeExit(
    plan,
    students[0].id,
    [keys[0], wrong, keys[2]],
    1,
    "manual",
  );
  const outcome = bindObservations(binding, failed, 1)[0].outcome;
  expect(observeBkt(0.3, outcome)).toMatchObject({
    status: "updated",
    correct: false,
    parameters: { G: 0.1, S: 0.2 },
  });
  const missing = gradeExit(
    plan,
    students[0].id,
    [keys[0], "missing", keys[2]],
    2,
    "manual",
  );
  expect(
    observeBkt(0.3, bindObservations(binding, missing, 1)[0].outcome).status,
  ).toBe("pending");
  const unknown = gradeExit(
    plan,
    students[0].id,
    [keys[0], "?", keys[2]],
    3,
    "manual",
  );
  expect(
    observeBkt(0.3, bindObservations(binding, unknown, 1)[0].outcome),
  ).toMatchObject({ status: "updated", parameters: { G: 0 } });
});
it("summary denominator excludes missing but includes ?; correction replaces pair", () => {
  const { plan, students } = exitFixture();
  const a = gradeExit(
    plan,
    students[0].id,
    exitKeys(plan, students[0].id),
    1,
    "omr",
  );
  const b = gradeExit(plan, students[1].id, ["?", "?", "missing"], 1, "manual");
  const c = gradeExit(
    plan,
    students[2].id,
    ["missing", "missing", "missing"],
    1,
    "manual",
  );
  expect(summarizeExit(plan, [a, a, b, c])).toEqual([
    {
      stepId: "C3",
      expected: 3,
      assessed: 2,
      understood: 1,
      pending: 1,
      percent: 50,
    },
  ]);
  const corrected = gradeExit(
    plan,
    students[1].id,
    exitKeys(plan, students[1].id),
    2,
    "manual",
  );
  expect(summarizeExit(plan, [a, b, c, corrected])[0]).toMatchObject({
    assessed: 2,
    understood: 2,
    percent: 100,
    pending: 1,
  });
});
it("reason diagnosis comes from explicit choice; unknown has no invented diagnosis", () => {
  const { plan: original, students } = exitFixture(),
    plan = parseExitPlan({
      ...original,
      groups: original.groups.map((g) => ({
        ...g,
        exitBaseStep: "D1",
        base: generateQuestion("D1", 123),
      })),
    }),
    reason = plan.groups[0].base.reasons.find((r) => r.misconceptionCode);
  expect(reason).toBeDefined();
  expect(
    exitDiagnosis(plan, students[0].id, ["?", reason!.label, "?"]),
  ).toEqual([reason!.misconceptionCode]);
  expect(exitDiagnosis(plan, students[0].id, ["?", "?", "?"])).toEqual([]);
});
it("check plus exit share one logical session; correction replay never advances twice", () => {
  const { plan, parent, students } = exitFixture(),
    ctx = exitContext(plan, parent);
  const check = gradeCard(
      parent.bindings[0],
      parent.keys,
      parent.keys,
      1,
      "omr",
    ),
    card = gradeExit(
      plan,
      students[0].id,
      exitKeys(plan, students[0].id),
      1,
      "manual",
    );
  const saved = parseSavedCard(ctx, {
    id: `${ctx.id}/${students[0].id}`,
    sessionId: ctx.id,
    studentId: students[0].id,
    choices: exitKeys(plan, students[0].id),
    graded: card,
  });
  expect(responseEvent(ctx, saved)).toMatchObject({
    sessionId: parent.id,
    recordId: ctx.id,
  });
  const history = {
    sessions: [parent.session],
    bindings: [parent.bindings[0], ctx.bindings[0]],
    revisions: [check, card, card],
    teacherEvents: [],
  };
  const replay = replayPlacement(parent.baselines[0], history);
  expect(replay.sessions).toHaveLength(1);
  expect(replay.observations).toHaveLength(7);
  expect(replayPlacement(parent.baselines[0], history)).toEqual(replay);
  expect(() => parseAssessmentContext({ ...ctx, keysByStudent: [] })).toThrow();
});
it("oral short exit is one pair with provisional K12 G.05 and no card/context row", () => {
  const { plan, students } = exitFixture(),
    oral = parseExitPlan({ ...plan, delivery: "oral" }),
    binding = exitBindings(oral)[0];
  const card = gradeExit(
    oral,
    students[0].id,
    exitKeys(oral, students[0].id),
    1,
    "manual",
  );
  const obs = bindObservations(binding, card, 1);
  expect(binding.questions).toHaveLength(2);
  expect(obs).toHaveLength(1);
  expect(observeBkt(0.3, obs[0].outcome)).toMatchObject({
    status: "updated",
    parameters: { G: 0.05, S: 0.2 },
  });
  expect(() => publicExit(oral, 1)).toThrow();
});
it("exit public payload allows only question/options, IDs and frozen attendance; no private keys", () => {
  const { plan } = exitFixture();
  const value = publicExit(plan, 2),
    wire = JSON.stringify(value);
  for (const forbidden of [
    "stepId",
    "answerKey",
    "reasonKey",
    "mastery",
    "studentId",
    "classification",
    "CANARY",
  ])
    expect(wire).not.toContain(forbidden);
  expect(value.groups[0].question.id).not.toBe(plan.groups[0].base.id);
  expect(value.groups[0].attendanceNumbers).toEqual([1, 2, 3]);
  expect(publicExitSchema.safeParse({ ...value, ink: [1, 2] }).success).toBe(
    false,
  );
  expect(() =>
    parseExitPlan({
      ...plan,
      groups: [...plan.groups, { ...plan.groups[0], id: exitId(99) }],
    }),
  ).toThrow();
});
