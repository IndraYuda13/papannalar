"use client";
import { useMinWidth } from "@/ui/use-min-width";

/**
 * The lesson axis (INTERACTION_DELTA_V4 §J.3 D3.3 / A45). MEJA's conductor strip kept as a
 * **sub-system**: at ≥1024 the two session surfaces carry the lesson's own moments in the
 * authored order, with the current one marked.
 *
 * It is deliberately *not* a control surface and not a landmark:
 *  - it renders no `button`/`a`/`input`, so nothing here can change the lesson — the projected
 *    board follows the run's position, and orientation must never become a second way to drive it;
 *  - it is an `<ol>`, never a `<nav>`, so the shell keeps exactly one navigation landmark
 *    (`Menu utama`) and this cannot register as a second one;
 *  - it does not replace the `A24` rail (`Siapkan soal · Tampilkan · Tutup sesi`), which stays on
 *    the same screen: that rail answers *which phase*, this axis answers *where in the lesson*.
 *
 * Below 1024 it returns `null` — absent, not hidden — because the phone shell is one column and
 * the single-line `WorkflowSteps` orientation already answers the same question there.
 */
export function LessonAxis({
  moments,
  current,
}: {
  /** The lesson's moments, in `package-navigation.ts` order (see `lessonMoments`). */
  moments: readonly string[];
  /** Index of the current moment; clamped, so a stale position cannot blank the axis. */
  current: number;
}) {
  const wide = useMinWidth(1024);
  if (!wide || moments.length === 0) return null;
  const index = Math.min(Math.max(current, 0), moments.length - 1);
  return (
    <div className="studio-lesson-axis" data-lesson-axis>
      <ol aria-label="Alur pelajaran">
        {moments.map((moment, position) => (
          <li
            key={moment}
            data-lesson-axis-item
            data-state={
              position === index
                ? "current"
                : position < index
                  ? "done"
                  : "pending"
            }
            aria-current={position === index ? "step" : undefined}
          >
            <span aria-hidden>{position + 1}</span>
            <span>{moment}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
