import { createCycleRepository } from "@/local/cycles";
import { createOralRepository } from "@/local/oral";
import type { LocalScope } from "@/local/scope";
import { replayOralBaseline } from "@/core/oral/replay";
import { deriveTimeline } from "@/features/session/package-session";
export async function loadOralBaseline(
  scope: LocalScope,
  classId: string,
  studentId: string,
) {
  const repo = createCycleRepository(scope),
    oral = createOralRepository(scope);
  try {
    const history = await repo.history(classId);
    const latest = history
      .map((b) => b.context)
      .filter((s) => !s.parentSessionId && s.session.finalized)
      .sort((a, b) => a.session.ordinal - b.session.ordinal)
      .at(-1);
    const runs = await oral.list(classId);
    const ordinal = latest?.session.ordinal ?? 0;
    if (!latest) {
      const result = replayOralBaseline(runs, studentId);
      return {
        baseline: result.mastery,
        recorded:
          result.placement?.kind === "step"
            ? result.placement.stepId
            : undefined,
        afterSessionOrdinal: ordinal,
      };
    }
    const result = deriveTimeline(
      history,
      latest,
      undefined,
      runs,
    ).placements.find((p) => p.studentId === studentId)?.replay;
    if (!result) return { afterSessionOrdinal: ordinal };
    return {
      baseline: result.mastery,
      recorded:
        result.placement.displayed?.kind === "step"
          ? result.placement.displayed.stepId
          : undefined,
      afterSessionOrdinal: ordinal,
    };
  } finally {
    repo.close();
    oral.close();
  }
}
