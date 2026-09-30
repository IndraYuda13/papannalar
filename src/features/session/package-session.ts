import type { ClassDto } from "../../contracts/classes";
import type { StudentDto } from "../../contracts/api";
import {
  parseAssessmentContext,
  type AssessmentContext,
  type SavedCard,
} from "../../contracts/assessment";
import type { TeacherPackage } from "../../core/package/build";
import { STEP_IDS } from "../../content/ladder/registry";
import { INITIAL_MASTERY } from "../../core/bkt/update";
import {
  replayPlacement,
  type ReplayBaseline,
} from "../../core/placement/replay";
import { groupStudents } from "../../core/groups/grouping";
import type { Cycle } from "../../core/session/cycle";
import type { OralRun } from "../../core/oral/state";

/** Teacher adapter: explicit references only, no local identity data. */
export function packageSession(input: {
  id: string;
  classroom: ClassDto;
  students: readonly Omit<StudentDto, "schemaVersion">[];
  package: TeacherPackage;
  ordinal: number;
  baselines?: readonly ReplayBaseline[];
}): AssessmentContext {
  const { id, classroom, package: pkg, ordinal } = input;
  if (
    pkg.classId !== classroom.id ||
    pkg.grade !== classroom.grade ||
    !pkg.frozen
  )
    throw new Error("Freeze the matching package first");
  const oralOnly = pkg.assessment.length === 0;
  if (oralOnly && classroom.grade > 3)
    throw new Error("Oral cycle requires SD 1–3");
  const roster = input.students
    .filter((s) => s.active)
    .map((s) => ({
      id: s.id,
      classId: s.classId,
      attendanceNumber: s.attendanceNumber,
      active: s.active,
    }));
  return parseAssessmentContext({
    id,
    packageId: pkg.id,
    classroom,
    seed: pkg.seed,
    ...(oralOnly ? { oralOnly: true } : {}),
    session: {
      sessionId: id,
      ordinal,
      target: pkg.target,
      finalized: false,
      engineVersion: 1,
      bktConfigVersion: 1,
    },
    roster,
    keys: pkg.assessment.map((q) => q.answerKey),
    bindings: oralOnly
      ? []
      : roster.map((s) => ({
          assessmentId: id,
          studentId: s.id,
          sessionId: id,
          version: 1,
          kind: pkg.variant === "initial" ? "initial" : "weekly",
          target: pkg.target,
          questions: pkg.assessment.map((q, i) => ({
            rowIndex: i + 1,
            questionId: q.id,
            stepId: q.stepId,
          })),
        })),
    baselines: roster.map(
      (s) =>
        input.baselines?.find((b) => b.studentId === s.id) ?? {
          studentId: s.id,
          target: pkg.target,
          mastery: Object.fromEntries(
            STEP_IDS.map((step) => [step, INITIAL_MASTERY]),
          ),
          displayed: null,
        },
    ),
  });
}
export type AssessmentBundle = Readonly<{
  context: AssessmentContext;
  cards: readonly SavedCard[];
}>;
/** Replay the whole logical timeline so revisions never become extra sessions. */
export function deriveTimeline(
  bundles: readonly AssessmentBundle[],
  target: AssessmentContext,
  cycle?: Cycle,
  oralRuns: readonly OralRun[] = [],
) {
  const parents = bundles
    .filter(
      (b) =>
        !b.context.parentSessionId &&
        b.context.classroom.id === target.classroom.id &&
        b.context.session.ordinal <= target.session.ordinal,
    )
    .sort((a, b) => a.context.session.ordinal - b.context.session.ordinal);
  const parentIds = new Set(parents.map((b) => b.context.id));
  const related = bundles.filter((b) =>
    parentIds.has(b.context.session.sessionId),
  );
  const placements = target.roster.map((student) => {
    let baseline =
      parents
        .flatMap((b) => b.context.baselines)
        .find((b) => b.studentId === student.id) ??
      target.baselines.find((b) => b.studentId === student.id)!;
    const oral = oralRuns.filter(
      (r) =>
        r.classId === target.classroom.id &&
        r.studentId === student.id &&
        r.afterSessionOrdinal <= target.session.ordinal,
    );
    if (oral.some((r) => r.afterSessionOrdinal === 0))
      baseline = {
        studentId: student.id,
        target: baseline.target,
        mastery: Object.fromEntries(
          STEP_IDS.map((s) => [s, INITIAL_MASTERY]),
        ) as ReplayBaseline["mastery"],
        displayed: null,
      };
    const replay = replayPlacement(
      baseline,
      {
        sessions: parents.map((b) => b.context.session),
        bindings: related
          .flatMap((b) => b.context.bindings)
          .filter((b) => b.studentId === student.id),
        revisions: related
          .flatMap((b) => b.cards)
          .filter((c) => c.studentId === student.id)
          .map((c) => c.graded),
        teacherEvents: [],
      },
      oral,
    );
    return {
      studentId: student.id,
      attendanceNumber: student.attendanceNumber,
      active: student.active && !cycle?.absentStudentIds.includes(student.id),
      displayed: replay.placement.displayed,
      replay,
    };
  });
  const ready = placements
    .filter((p) => p.active)
    .every((p) => p.displayed !== null);
  const grouping = groupStudents(
    placements.flatMap((p) =>
      p.displayed
        ? [
            {
              studentId: p.studentId,
              attendanceNumber: p.attendanceNumber,
              active: p.active,
              displayed: p.displayed,
            },
          ]
        : [],
    ),
    { target: target.session.target, seed: target.seed },
  );
  return { placements, grouping, ready };
}
