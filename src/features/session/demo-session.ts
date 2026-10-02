import type { ClassDto } from "../../contracts/classes";
import {
  parseAssessmentContext,
  type AssessmentContext,
  type SavedCard,
} from "../../contracts/assessment";
import type { StudentDto } from "../../contracts/api";
import { STEP_IDS, getStep } from "../../content/ladder/registry";
import { demoStep, DEMO_LABEL_SEED } from "../../content/demo/class-7b";
import { DEMO_KEYS, DEMO_WEEKLY } from "../../content/demo/weekly";
import { groupStudents } from "../../core/groups/grouping";
import { replayPlacement } from "../../core/placement/replay";
import type { Mastery } from "../../core/placement/computed-level";

export function createDemoContext(
  classroom: ClassDto,
  students: readonly StudentDto[],
  randomId: () => string,
): AssessmentContext {
  if (
    classroom.mode !== "demo" ||
    classroom.grade !== 7 ||
    classroom.count !== 32 ||
    students.length !== 32 ||
    students.some((s) => !s.active) ||
    new Set(students.map((s) => s.attendanceNumber)).size !== 32
  )
    throw new Error("Demo requires separate 7B roster");
  const id = randomId(),
    assessmentId = randomId();
  const questions = DEMO_WEEKLY.map((q, i) => ({
    rowIndex: i + 1,
    questionId: randomId(),
    stepId: q.stepId,
  }));
  return parseAssessmentContext({
    id,
    classroom,
    seed: DEMO_LABEL_SEED,
    session: {
      sessionId: id,
      ordinal: 1,
      target: "D5",
      finalized: true,
      engineVersion: 1,
      bktConfigVersion: 1,
    },
    roster: students.map((s) => ({
      id: s.id,
      classId: s.classId,
      attendanceNumber: s.attendanceNumber,
      active: s.active,
    })),
    keys: DEMO_KEYS,
    bindings: students.map((s) => ({
      assessmentId,
      studentId: s.id,
      sessionId: id,
      version: 1,
      kind: "weekly",
      target: "D5",
      questions,
    })),
    baselines: students.map((s) => ({
      studentId: s.id,
      target: "D5",
      mastery: Object.fromEntries(
        STEP_IDS.map((step) => [
          step,
          getStep(step).index < getStep(demoStep(s.attendanceNumber)).index
            ? 0.85
            : 0.3,
        ]),
      ) as Mastery,
      displayed: { kind: "step", stepId: demoStep(s.attendanceNumber) },
    })),
  });
}
export function deriveSession(
  context: AssessmentContext,
  cards: readonly SavedCard[],
) {
  const placements = context.roster.map((student) => {
    const baseline = context.baselines.find((b) => b.studentId === student.id)!;
    const result = replayPlacement(baseline, {
      sessions: [context.session],
      bindings: context.bindings.filter((b) => b.studentId === student.id),
      revisions: cards
        .filter((c) => c.studentId === student.id)
        .map((c) => c.graded),
      teacherEvents: [],
    });
    return {
      studentId: student.id,
      attendanceNumber: student.attendanceNumber,
      active: student.active,
      displayed: result.placement.displayed!,
      observations: result.observations.length,
    };
  });
  const grouping = groupStudents(
    placements.map((s) => ({
      studentId: s.studentId,
      attendanceNumber: s.attendanceNumber,
      active: s.active,
      displayed: s.displayed,
    })),
    { target: context.session.target, seed: context.seed },
  );
  return {
    placements,
    grouping,
    received: cards.length,
    complete:
      cards.length === context.roster.length &&
      cards.every((card) =>
        card.choices.every((choice) => choice !== "missing"),
      ),
  };
}
