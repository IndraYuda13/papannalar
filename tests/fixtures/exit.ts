import { buildPackage } from "../../src/core/package/build";
import { createExitPlan } from "../../src/core/assessment/exit";
import { parseAssessmentContext } from "../../src/contracts/assessment";
import { STEP_IDS } from "../../src/content/ladder/registry";
import type { GroupSnapshot } from "../../src/core/groups/grouping";
import type { Mastery } from "../../src/core/placement/computed-level";
export const exitId = (n: number) =>
  `10000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
export function exitFixture() {
  const classroom = {
    id: exitId(1),
    label: "QA",
    grade: 7,
    count: 3,
    mode: "demo" as const,
    revision: 1,
  };
  const students = Array.from({ length: 3 }, (_, i) => ({
    id: exitId(i + 2),
    classId: classroom.id,
    attendanceNumber: i + 1,
    active: true,
  }));
  const group: GroupSnapshot = {
    id: exitId(10),
    label: "Segitiga Biru",
    activityStep: "D1",
    exitBaseStep: "C3",
    exitContextStep: "D1",
    members: students.map((s, i) => ({
      studentId: s.id,
      attendanceNumber: s.attendanceNumber,
      active: true,
      displayed: { kind: "step", stepId: i === 0 ? "C3" : "D1" },
    })),
    composition: [
      { placement: { kind: "step", stepId: "C3" }, count: 1 },
      { placement: { kind: "step", stepId: "D1" }, count: 2 },
    ],
    extensionSteps: [],
    supportStudentIds: [students[0].id],
    enrichmentStudentIds: [],
  };
  const p = buildPackage({
    id: exitId(11),
    classId: classroom.id,
    grade: 7,
    target: "D5",
    variant: "weekly",
    seed: 47,
    occupied: group.members.map((m) => m.displayed),
  });
  const parent = parseAssessmentContext({
    id: exitId(12),
    classroom,
    seed: 47,
    session: {
      sessionId: exitId(12),
      ordinal: 1,
      target: "D5",
      finalized: true,
      engineVersion: 1,
      bktConfigVersion: 1,
    },
    roster: students,
    keys: p.assessment.map((q) => q.answerKey),
    bindings: students.map((s) => ({
      assessmentId: exitId(13),
      studentId: s.id,
      sessionId: exitId(12),
      version: 1,
      kind: "weekly",
      target: "D5",
      questions: p.assessment.map((q, i) => ({
        rowIndex: i + 1,
        questionId: q.id,
        stepId: q.stepId,
      })),
    })),
    baselines: students.map((s) => ({
      studentId: s.id,
      target: "D5",
      mastery: Object.fromEntries(
        STEP_IDS.map((step) => [step, 0.3]),
      ) as Mastery,
      displayed: { kind: "step", stepId: "C3" },
    })),
  });
  const plan = createExitPlan({
    id: exitId(14),
    sessionId: parent.id,
    package: p,
    groups: [group],
  });
  return { classroom, students, group, package: p, parent, plan };
}
