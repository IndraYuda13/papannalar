import type { GeneratedQuestion } from "../../content/templates/types";
import type { StepId } from "../../content/ladder/registry";
import type { TeacherPackage } from "../package/build";
import type { GroupSnapshot, GroupLabel } from "../groups/grouping";
import { seededGroupId } from "../math/seed";
import { randomId } from "../validation";
import { freezeBinding } from "./binding";
import { gradeCard, type CardChoice } from "./card-response";
import { canonicalRevisions, type AssessmentRevision } from "./revisions";
export type ExitGroup = Readonly<{
  id: string;
  label: GroupLabel;
  members: readonly { studentId: string; attendanceNumber: number }[];
  activityStep: StepId;
  exitBaseStep: StepId;
  exitContextStep: StepId;
  base: GeneratedQuestion;
  context: GeneratedQuestion;
  reasonId: string;
}>;
export type ExitPlan = Readonly<{
  schemaVersion: 1;
  id: string;
  sessionId: string;
  classId: string;
  packageId: string;
  target: StepId;
  delivery: "card" | "oral";
  groups: readonly ExitGroup[];
}>;
export function createExitPlan(input: {
  id: string;
  sessionId: string;
  package: TeacherPackage;
  groups: readonly GroupSnapshot[];
}): ExitPlan {
  if (!input.groups.length || input.groups.length > 4)
    throw new Error("Exit needs groups");
  const seen = new Set<string>();
  const groups = input.groups.map((g) => {
    const base = input.package.activities.find(
      (a) => a.stepId === g.exitBaseStep,
    )?.exit;
    const context = input.package.activities.find(
      (a) => a.stepId === g.exitContextStep,
    )?.exitContext;
    if (!base || !context)
      throw new Error("Prepared package lacks exit coverage");
    const members = g.members
      .filter((s) => s.active)
      .map((s) => {
        if (seen.has(s.studentId))
          throw new Error("Student in two exit groups");
        seen.add(randomId(s.studentId));
        return { studentId: s.studentId, attendanceNumber: s.attendanceNumber };
      });
    if (!members.length) throw new Error("Empty exit group");
    return {
      id: randomId(g.id),
      label: g.label,
      members,
      activityStep: g.activityStep,
      exitBaseStep: g.exitBaseStep,
      exitContextStep: g.exitContextStep,
      base,
      context,
      reasonId: seededGroupId(base.seed, 9000),
    };
  });
  const plan: ExitPlan = {
    schemaVersion: 1,
    id: randomId(input.id),
    sessionId: randomId(input.sessionId),
    classId: input.package.classId,
    packageId: input.package.id,
    target: input.package.target,
    delivery: input.package.grade <= 3 ? "oral" : "card",
    groups,
  };
  exitBindings(plan);
  return plan;
}
export function exitBindings(plan: ExitPlan) {
  return plan.groups.flatMap((g) =>
    g.members.map((s) =>
      freezeBinding({
        assessmentId: plan.id,
        studentId: s.studentId,
        sessionId: plan.sessionId,
        version: plan.delivery === "oral" ? 2 : 1,
        kind: "exit",
        ...(plan.delivery === "oral" ? { delivery: "oral" } : {}),
        target: plan.target,
        groupId: g.id,
        activityStep: g.activityStep,
        exitBaseStep: g.exitBaseStep,
        exitContextStep: g.exitContextStep,
        questions: [
          { rowIndex: 1, questionId: g.base.id, stepId: g.exitBaseStep },
          { rowIndex: 2, questionId: g.reasonId, stepId: g.exitBaseStep },
          ...(plan.delivery === "oral"
            ? []
            : [
                {
                  rowIndex: 3,
                  questionId: g.context.id,
                  stepId: g.exitContextStep,
                },
              ]),
        ],
      }),
    ),
  );
}
export function exitKeys(plan: ExitPlan, studentId: string) {
  const group = plan.groups.find((g) =>
    g.members.some((s) => s.studentId === studentId),
  );
  if (!group) throw new Error("Student absent from frozen exit");
  return [
    group.base.answerKey,
    group.base.reasonKey,
    ...(plan.delivery === "oral" ? [] : [group.context.answerKey]),
  ];
}
export function gradeExit(
  plan: ExitPlan,
  studentId: string,
  choices: readonly CardChoice[],
  revision: number,
  source: AssessmentRevision["source"],
) {
  const binding = exitBindings(plan).find((b) => b.studentId === studentId);
  if (!binding) throw new Error("Unknown exit student");
  return gradeCard(
    binding,
    exitKeys(plan, studentId),
    choices,
    revision,
    source,
  );
}
export function summarizeExit(
  plan: ExitPlan,
  revisions: readonly AssessmentRevision[],
) {
  const latest = canonicalRevisions(exitBindings(plan), revisions);
  const levels = new Map<
    StepId,
    {
      stepId: StepId;
      expected: number;
      assessed: number;
      understood: number;
      pending: number;
      percent: number | null;
    }
  >();
  for (const group of plan.groups) {
    const row = levels.get(group.exitBaseStep) ?? {
      stepId: group.exitBaseStep,
      expected: 0,
      assessed: 0,
      understood: 0,
      pending: 0,
      percent: null,
    };
    for (const member of group.members) {
      row.expected++;
      const response = latest.find((r) => r.studentId === member.studentId);
      if (
        !response ||
        response.responses.slice(0, 2).some((r) => r.result === "missing")
      )
        row.pending++;
      else {
        row.assessed++;
        if (response.responses.slice(0, 2).every((r) => r.result === "correct"))
          row.understood++;
      }
    }
    row.percent = row.assessed ? (100 * row.understood) / row.assessed : null;
    levels.set(group.exitBaseStep, row);
  }
  return [...levels.values()];
}
export function exitDiagnosis(
  plan: ExitPlan,
  studentId: string,
  choices: readonly CardChoice[],
) {
  const group = plan.groups.find((g) =>
    g.members.some((s) => s.studentId === studentId),
  );
  if (!group) throw new Error("Unknown exit student");
  return [
    ...new Set(
      [
        group.base.options.find((o) => o.label === choices[0])
          ?.misconceptionCode,
        group.base.reasons.find((o) => o.label === choices[1])
          ?.misconceptionCode,
      ].filter((code): code is string => Boolean(code)),
    ),
  ];
}
