import type { StudentDto } from "@/contracts/api";
import type { LocalScope } from "@/local/scope";
import { createCycleRepository } from "@/local/cycles";
import { createOralRepository } from "@/local/oral";
import { replayOralBaseline } from "@/core/oral/replay";
import { deriveTimeline } from "@/features/session/package-session";

/** Teacher orchestration: only completed placement overrides may inform a package. */
export async function loadPackagePlacements(
  scope: LocalScope,
  classId: string,
  students: readonly StudentDto[],
) {
  const assessments = createCycleRepository(scope);
  const oral = createOralRepository(scope);
  try {
    const history = await assessments.history(classId);
    const last = history
      .map((b) => b.context)
      .filter((s) => !s.parentSessionId && s.session.finalized)
      .sort((a, b) => a.session.ordinal - b.session.ordinal)
      .at(-1);
    const runs = await oral.list(classId);
    const placements = last
      ? deriveTimeline(history, last, undefined, runs).placements
      : [];
    const active = students.filter((s) => s.active);
    return (
      await Promise.all(
        active.map(async (student) => {
          if (!last) return replayOralBaseline(runs, student.id).placement;
          return placements.find((s) => s.studentId === student.id)?.displayed;
        }),
      )
    ).filter((placement) => placement !== undefined && placement !== null);
  } finally {
    assessments.close();
    oral.close();
  }
}
