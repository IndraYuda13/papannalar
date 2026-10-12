import type { LibraryBoardState } from "@/contracts/library";
import type { PresentationState } from "@/contracts/presentation";

/**
 * One progress statement per board screen (L1).
 *
 * The rail used to read `useBoardPackage().pages.length`. That is only non-zero when the publish
 * payload carries a `package` key, which the library path never does — its payload is
 * `[schemaVersion, mode, question, taskEpoch, groups]`. So a bound 5-question library run painted
 * `Soal 1/0` with an empty rail while the same screen's own header said `Soal 5/5`.
 *
 * The fix is not a fallback number: it is to resolve the position and the total from whichever
 * source actually owns them on the path being rendered, and to paint **no** rail when no source
 * has them. A zero-segment rail is never a truthful statement about a live session.
 *
 * `source` is carried so a verification row can name which path it measured instead of inferring
 * it from the number.
 */
export type BoardProgress = {
  /** 1-based position inside the session's own sequence. */
  position: number;
  /** The sequence length. Always > 0: a progress object with no length is not a progress object. */
  total: number;
  source: "package" | "library" | "check";
};

export function boardProgress(input: {
  /** The bound library item, when `/api/v1/board/library` resolved one. */
  library?: LibraryBoardState | null;
  /** `useBoardPackage().pages.length` — non-zero only on the board-package path. */
  packagePages: number;
  /** `useBoardPackage().index` — 0-based. */
  packageIndex: number;
  /** The state the board is actually displaying. */
  state?: PresentationState;
}): BoardProgress | undefined {
  const { library, packagePages, packageIndex, state } = input;
  // Package path: the run plan is present, so it is the authority.
  if (packagePages > 0)
    return {
      position: Math.min(Math.max(packageIndex, 0) + 1, packagePages),
      total: packagePages,
      source: "package",
    };
  // Library path: the same object the library renderer prints its own `Soal n/N` from, so the
  // rail and the header agree by construction rather than by coincidence.
  if (library)
    return {
      position: library.position + 1,
      total: library.total,
      source: "library",
    };
  // Session path with a check item: the item carries its own total.
  if (state?.check && state.check.total > 0)
    return {
      position: Math.min(state.question, state.check.total),
      total: state.check.total,
      source: "check",
    };
  return undefined;
}
