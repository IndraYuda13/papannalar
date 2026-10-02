import { evaluateOral, type OralRun } from "./state";
import { compareIdentity } from "../assessment/binding";
import { STEP_IDS } from "../../content/ladder/registry";
import type { Mastery, ComputedLevel } from "../placement/computed-level";
/** Arrival time never changes the pedagogical order. Old stores use stable ID ties. */
export function canonicalOralRuns(runs: readonly OralRun[]) {
  const byId = new Map<string, OralRun>();
  for (const run of runs) {
    evaluateOral(run);
    const previous = byId.get(run.id);
    if (
      previous &&
      previous.revision === run.revision &&
      JSON.stringify(previous) !== JSON.stringify(run)
    )
      throw new Error("Oral revision conflict");
    if (!previous || run.revision > previous.revision) byId.set(run.id, run);
  }
  return [...byId.values()].sort(
    (a, b) =>
      a.afterSessionOrdinal - b.afterSessionOrdinal ||
      (a.sequence ?? 0) - (b.sequence ?? 0) ||
      compareIdentity(a.id, b.id),
  );
}
export function replayOralBaseline(
  runs: readonly OralRun[],
  studentId: string,
) {
  let mastery = Object.fromEntries(STEP_IDS.map((s) => [s, 0.3])) as Mastery;
  let placement: ComputedLevel | null = null;
  for (const run of canonicalOralRuns(runs).filter(
    (r) => r.studentId === studentId && r.afterSessionOrdinal === 0,
  )) {
    const result = evaluateOral({ ...run, baseline: mastery });
    if (result.status === "complete") {
      mastery = result.mastery;
      placement = result.placement;
    }
  }
  return { mastery, placement };
}
