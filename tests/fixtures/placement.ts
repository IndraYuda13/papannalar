import {
  getStep,
  STEP_IDS,
  type StepId,
} from "../../src/content/ladder/registry";
import {
  freezeBinding,
  type AssessmentBinding,
} from "../../src/core/assessment/binding";
import {
  freezeRevision,
  type AssessmentRevision,
} from "../../src/core/assessment/revisions";
import type { AnswerResult } from "../../src/core/bkt/observations";
import { initialWindow, weeklyWindow } from "../../src/core/placement/windows";
import type {
  Mastery,
  ComputedLevel,
} from "../../src/core/placement/computed-level";
import type {
  SessionRecord,
  ReplayBaseline,
  PlacementHistory,
} from "../../src/core/placement/replay";
import type { TeacherPlacementEvent } from "../../src/core/placement/teacher-events";

export const id = (n: number) =>
  `00000000-0000-4000-8000-${n.toString(16).padStart(12, "0")}`;
export const STUDENT = id(1);
export const OTHER_STUDENT = id(2);
export const TEACHER = id(3);
export const level = (stepId: StepId): ComputedLevel => ({
  kind: "step",
  stepId,
});
export const lanjut: ComputedLevel = { kind: "lanjut" };

export function session(
  ordinal: number,
  target: StepId = "D5",
  finalized = true,
): SessionRecord {
  return {
    sessionId: id(100 + ordinal),
    ordinal,
    target,
    finalized,
    engineVersion: 1,
    bktConfigVersion: 1,
  };
}

export function initialBinding(
  s: SessionRecord,
  studentId = STUDENT,
): AssessmentBinding {
  return freezeBinding({
    assessmentId: id(1000 + s.ordinal),
    studentId,
    sessionId: s.sessionId,
    version: 1,
    kind: "initial",
    target: s.target,
    questions: initialWindow(s.target).map((slot) => ({
      ...slot,
      questionId: id(10000 + s.ordinal * 100 + slot.rowIndex),
    })),
  });
}

export function weeklyBinding(
  s: SessionRecord,
  steps: readonly StepId[] = weeklyWindow(s.target, [level("D1")]),
  studentId = STUDENT,
): AssessmentBinding {
  return freezeBinding({
    assessmentId: id(2000 + s.ordinal),
    studentId,
    sessionId: s.sessionId,
    version: 1,
    kind: "weekly",
    target: s.target,
    questions: steps.map((stepId, i) => ({
      rowIndex: i + 1,
      stepId,
      questionId: id(20000 + s.ordinal * 100 + i),
    })),
  });
}

export function exitBinding(
  s: SessionRecord,
  exitBaseStep: StepId = "D1",
  exitContextStep: StepId = exitBaseStep,
  activityStep: StepId = exitBaseStep,
  studentId = STUDENT,
): AssessmentBinding {
  return freezeBinding({
    assessmentId: id(3000 + s.ordinal),
    studentId,
    sessionId: s.sessionId,
    version: 1,
    kind: "exit",
    target: s.target,
    groupId: id(4),
    activityStep,
    exitBaseStep,
    exitContextStep,
    questions: [exitBaseStep, exitBaseStep, exitContextStep].map(
      (stepId, i) => ({
        rowIndex: i + 1,
        stepId,
        questionId: id(30000 + s.ordinal * 100 + i),
      }),
    ),
  });
}

export function revision(
  binding: AssessmentBinding,
  results: readonly AnswerResult[],
  version = 1,
  source: AssessmentRevision["source"] = "omr",
): AssessmentRevision {
  return freezeRevision(binding, {
    assessmentId: binding.assessmentId,
    studentId: binding.studentId,
    sessionId: binding.sessionId,
    bindingVersion: binding.version,
    revision: version,
    baseRevision: version - 1,
    source,
    responses: binding.questions.map((q, i) => ({
      rowIndex: q.rowIndex,
      questionId: q.questionId,
      result: results[i] ?? "missing",
    })),
  });
}

export function baseline(step: StepId = "D1"): ReplayBaseline {
  return {
    studentId: STUDENT,
    target: "D5",
    displayed: level(step),
    mastery: Object.freeze(
      Object.fromEntries(
        STEP_IDS.map((id, i) => [id, i < getStep(step).index ? 0.85 : 0.3]),
      ) as Record<StepId, number>,
    ) as Mastery,
  };
}

export function history(
  sessions: readonly SessionRecord[] = [],
  bindings: readonly AssessmentBinding[] = [],
  revisions: readonly AssessmentRevision[] = [],
  teacherEvents: readonly TeacherPlacementEvent[] = [],
): PlacementHistory {
  return { sessions, bindings, revisions, teacherEvents };
}

export function override(
  afterSessionOrdinal: number,
  placement: ComputedLevel = level("D4"),
  sequence = 1,
): Extract<TeacherPlacementEvent, { kind: "placement-override" }> {
  return {
    kind: "placement-override",
    id: id(40000 + afterSessionOrdinal * 100 + sequence),
    studentId: STUDENT,
    actorTeacherId: TEACHER,
    afterSessionOrdinal,
    sequence,
    placement,
    reasonCode: "teacher-assessment",
  };
}

export function groupMove(
  afterSessionOrdinal: number,
): Extract<TeacherPlacementEvent, { kind: "group-move" }> {
  return {
    kind: "group-move",
    id: id(50000 + afterSessionOrdinal),
    studentId: STUDENT,
    actorTeacherId: TEACHER,
    afterSessionOrdinal,
    sequence: 2,
    groupId: id(99),
    reasonCode: "participation-adjustment",
  };
}
