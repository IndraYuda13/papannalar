"use client";
import { useEffect, useState } from "react";

/**
 * A width-driven composition switch, in one place.
 *
 * v4 re-authors the composition at two boundaries instead of letting content stretch: the
 * desktop rail at 1024 (§6.1/D3.1) and the two-track working canvas at 1280 (D3.2). Both are
 * *absence* rules — the element must not be in the DOM below the boundary, not merely hidden —
 * so the decision cannot be made by CSS alone.
 *
 * It reports `false` until it has measured, which is also the phone-safe answer: a phone renders
 * the small composition and a wider client upgrades after hydration, so no wider-than-phone
 * markup is ever server-rendered into the phone document.
 */
export function useMinWidth(px: number) {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const media = matchMedia(`(min-width: ${px}px)`);
    const sync = () => setMatches(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, [px]);
  return matches;
}
