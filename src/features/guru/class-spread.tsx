"use client";
import { useEffect, useState } from "react";
import type { LocalScope } from "@/local/scope";
import { createCycleRepository } from "@/local/cycles";
import { deriveTimeline } from "@/features/session/package-session";
import { getStep } from "@/content/ladder/registry";
import { getClassTarget } from "@/content/ladder/targets";

/**
 * The rung rail's data (§3.1, §9.1): a class's real 5-step distance-to-target distribution,
 * read from the same stored cycle snapshot `LearningSummary` uses. Bucket 0 means "at the class
 * target or above"; bucket 4 means "four rungs or more below", matching `--pn-jarak-*`.
 *
 * A spread belongs to exactly one class, so it is kept in a per-class map: a rail that
 * described a different class than the row it sits in would be a false statement, and several
 * home rows can each belong to a different class.
 *
 * Nothing is inferred from an unrelated score, and a class with no stored snapshot gets no
 * entry rather than an invented distribution.
 */
export type Spread = {
  counts: readonly [number, number, number, number, number];
  total: number;
  targetLabel: string;
};

export type ClassRef = { id: string; grade: number };

export function useClassSpreads(
  scope: LocalScope | undefined,
  classes: readonly ClassRef[],
) {
  const ownerId = scope?.ownerId,
    mode = scope?.mode;
  const [spreads, setSpreads] = useState<Record<string, Spread>>({});
  // Depend on the joined ids/grades rather than array identity, so a re-render cannot refetch.
  const key = classes.map((c) => `${c.id}:${c.grade}`).join(",");
  useEffect(() => {
    if (!ownerId || !mode || !key) return;
    let active = true;
    void (async () => {
      const found: Record<string, Spread> = {};
      for (const entry of key.split(",")) {
        const [classId, rawGrade] = entry.split(":"),
          grade = Number(rawGrade);
        if (!classId || !Number.isInteger(grade)) continue;
        const cycles = createCycleRepository({ ownerId, mode });
        try {
          const latest = (await cycles.list(classId))
            .filter((cycle) => cycle.classEnded || cycle.assessmentRevision)
            .at(-1);
          if (!latest) continue;
          const snapshot = await cycles.read(latest.id);
          const derived = deriveTimeline(
            snapshot.bundles,
            snapshot.parent.context,
            snapshot.cycle,
            snapshot.oralRuns,
          );
          const target = getClassTarget(grade);
          const counts = [0, 0, 0, 0, 0] as [
            number,
            number,
            number,
            number,
            number,
          ];
          let total = 0;
          for (const student of derived.placements) {
            if (!student.active || !student.displayed) continue;
            // Only a computed step is a position; `lanjut` sits at or above the target.
            const distance =
              student.displayed.kind === "lanjut"
                ? 0
                : getStep(target.stepId).index -
                  getStep(student.displayed.stepId).index;
            if (distance < 0) continue;
            counts[Math.min(4, distance)] += 1;
            total += 1;
          }
          if (total)
            found[classId] = {
              counts,
              total,
              targetLabel: getStep(target.stepId).label,
            };
        } catch {
          /* No stored snapshot for this class: no rail, rather than a guessed one. */
        } finally {
          cycles.close();
        }
      }
      if (active) setSpreads(found);
    })();
    return () => {
      active = false;
    };
  }, [ownerId, mode, key]);
  return spreads;
}

/**
 * The rail renders only when a stored cycle produced a real distribution. The ladder is the
 * product's core idea, but a placeholder rail everywhere would be noise, and `Tenang` (§2.1)
 * means the device appears when it has something true to say.
 *
 * Colour is never the only channel: bars read far-distance (left) to at-target (right) like the
 * brand's own ladder, and the whole rail carries both a spoken summary and a visible legend.
 */
export function RungRail({ spread }: { spread?: Spread }) {
  if (!spread) return null;
  const { counts } = spread,
    max = Math.max(1, ...counts);
  const described =
    `Sebaran ${spread.total} siswa terhadap ${spread.targetLabel}: ` +
    counts
      .map((count, distance) =>
        distance === 0
          ? `${count} sudah di target`
          : `${count} berjarak ${distance} anak tangga`,
      )
      .join(", ");
  return (
    <span className="inline-flex items-end gap-2" data-spread-rail>
      <span className="studio-rail" role="img" aria-label={described}>
        {[4, 3, 2, 1, 0].map((distance) => (
          <span
            key={distance}
            data-jarak={distance}
            style={{
              height: `${Math.max(12, Math.round((counts[distance] / max) * 100))}%`,
              background: `var(--pn-jarak-${distance})`,
            }}
          />
        ))}
      </span>
      <span className="studio-rail-legend" aria-hidden>
        {spread.total} siswa · target {spread.targetLabel}
      </span>
    </span>
  );
}
