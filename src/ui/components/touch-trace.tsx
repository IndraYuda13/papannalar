"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useVisualPreferences } from "./visual-preferences";

/**
 * §B7 `Sentuh` — the touch trace (INTERACTION_DELTA_V4 §B7, card `t_2ea7f16f`).
 *
 * `globals.css` has carried `@keyframes pn-ring-trace` and `.board-touch-ring` since `dc5242b`
 * with **no producer anywhere in `src/`**, so the beat, and the acceptance rows that name it
 * (`A11`, `A12`), described a thing the product never made. This module is that producer.
 *
 * Three decisions are worth stating, because each one is a reading of the delta rather than an
 * implementation convenience:
 *
 *  1. **The ring is emitted on release, not on press.** §A.4 forbids motion while a pointer is
 *     down ("a target that moves under a child's finger is a missed tap"), and `A11`/`A12` both
 *     read the ring *after* the pointer is up ("on release, exactly one ring animation per
 *     pointer"; "a ring with `opacity < 0.6` exists and is gone after 400 ms"). Emitting on
 *     `pointerup` is the only reading that satisfies both: no ring ever animates while any
 *     pointer is down, and the ring is on screen exactly when the rows look for it. The ring is
 *     placed at the **touch point** — where the finger landed, recorded on `pointerdown` — not
 *     at the release point, so a drag still traces the object that was touched.
 *  2. **The trace is not a target.** The ring container is `pointer-events: none` and
 *     `aria-hidden`, so it can never intercept a tap or be announced: it answers "who touched
 *     what" to the *room*, never to the finger.
 *  3. **It is never the only feedback channel.** Every §B7 object keeps its existing press path
 *     (the Control's `pn-press` for button-based objects, the marker's own pressed state) and its
 *     existing single-pointer alternative (tap-to-nudge, `RemoteControls` trackpad). With motion
 *     off there is no ring at all — §B7's reduced-motion row: "only the press offset remains as
 *     an instant state change".
 */

/**
 * §B7's named objects, as they exist in the shipped tools. A board object that has no entry here
 * gets no trace; that is deliberate — the beat is defined over the six interactive objects
 * (`number-line.tsx`, `fractions.tsx`, `algebra.tsx`, `balance.tsx`, `ratio.tsx`, `graphs.tsx`),
 * not over "anything clickable on the board".
 */
export const TOUCH_TARGET_SELECTOR = [
  // number-line.tsx — the marker's own hit target.
  '[data-testid="number-marker"]',
  // fractions.tsx — the bar handle ("Geser batang {n}").
  '[aria-label^="Geser batang"]',
  // algebra.tsx — a tile, in the palette or inside a group.
  "[data-algebra-tile]",
  '[aria-label^="Tambah ubin "]',
  // balance.tsx — a weight.
  '[aria-label^="Beban "]',
  // ratio.tsx — the multiplier handle.
  '[aria-label="Seret pengali rasio"]',
  // graphs.tsx — the test point.
  '[aria-label="Seret titik uji grafik"]',
].join(",");

/** §B7: "Max 4 concurrent rings (one per pointer)". */
export const TOUCH_RING_MAX = 4;
/** The ring's own duration — `--pn-t-4`, §B7's 300 ms. */
const RING_MS = 300;
/** `A12`: the ring "is gone after 400 ms". The fallback removal, in case `animationend` never fires. */
const RING_TTL_MS = 400;
/** "No ring while another ring is at full size": full size is the end of the 300 ms expansion. */
const FULL_SIZE_AT_MS = RING_MS * 0.9;

type Ring = { id: number; pointer: number; x: number; y: number };

export function TouchTrace() {
  const { ready, reduced, light, saveData } = useVisualPreferences();
  const [rings, setRings] = useState<Ring[]>([]);
  const points = useRef(new Map<number, { x: number; y: number }>());
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());
  const spawned = useRef<Ring[]>([]);
  const seq = useRef(0);
  const motionOff = !ready || reduced || light || saveData;

  const drop = useCallback((id: number) => {
    const timer = timers.current.get(id);
    if (timer !== undefined) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
    spawned.current = spawned.current.filter((ring) => ring.id !== id);
    setRings((current) =>
      current.some((ring) => ring.id === id)
        ? current.filter((ring) => ring.id !== id)
        : current,
    );
  }, []);

  useEffect(() => {
    /**
     * Two sources, and the split is deliberate.
     *
     * The **ceiling and the one-per-pointer guard** read `spawned`, a synchronous list updated in
     * the pointer handler: React batches the four `setRings` calls of four simultaneous releases
     * into one commit, so a guard that read only the painted DOM would count zero rings for all of
     * them and paint five (measured: 5 pointers → 5 rings). The contract's ceiling is about the
     * *product's* concurrency, not about how many have been committed yet.
     *
     * The **full-size guard** reads the painted rings instead, because "at full size" is a fact
     * about the running animation, which only exists once the node is in the document.
     */
    function painted(): HTMLSpanElement[] {
      return [
        ...document.querySelectorAll<HTMLSpanElement>(".board-touch-ring"),
      ];
    }
    function boardObject(event: Event): Element | null {
      const node = event.target;
      if (!(node instanceof Element)) return null;
      // The board only: `.board-surface` is the projected surface. The teacher's library preview
      // (`[data-library-preview]`) is a thumbnail of a board, not the board.
      if (!node.closest(".board-surface")) return null;
      return node.closest(TOUCH_TARGET_SELECTOR);
    }
    function down(event: PointerEvent) {
      if (!boardObject(event)) return;
      points.current.set(event.pointerId, {
        x: event.clientX,
        y: event.clientY,
      });
    }
    function forget(event: PointerEvent) {
      points.current.delete(event.pointerId);
    }
    function up(event: PointerEvent) {
      const point = points.current.get(event.pointerId);
      points.current.delete(event.pointerId);
      if (!point) return;
      // §B7 reduced motion: no ring at all (read from the document, so the switch is honoured
      // without a value mirrored through render).
      if (document.documentElement.dataset["motion"] === "off") return;
      // §B7: max 4 concurrent rings, one per pointer.
      if (spawned.current.length >= TOUCH_RING_MAX) return;
      if (spawned.current.some((ring) => ring.pointer === event.pointerId))
        return;
      // §B7: no ring while another ring is at full size.
      if (
        painted().some((node) => {
          const animation = node.getAnimations()[0];
          return (
            animation !== undefined &&
            Number(animation.currentTime ?? 0) >= FULL_SIZE_AT_MS
          );
        })
      )
        return;
      seq.current += 1;
      const ring: Ring = {
        id: seq.current,
        pointer: event.pointerId,
        x: point.x,
        y: point.y,
      };
      spawned.current = [...spawned.current, ring];
      setRings((current) => [...current, ring]);
      timers.current.set(
        ring.id,
        setTimeout(() => drop(ring.id), RING_TTL_MS),
      );
    }
    document.addEventListener("pointerdown", down, true);
    document.addEventListener("pointerup", up, true);
    document.addEventListener("pointercancel", forget, true);
    return () => {
      document.removeEventListener("pointerdown", down, true);
      document.removeEventListener("pointerup", up, true);
      document.removeEventListener("pointercancel", forget, true);
    };
  }, [drop]);

  useEffect(
    () => () => {
      for (const timer of timers.current.values()) clearTimeout(timer);
      timers.current.clear();
      spawned.current = [];
    },
    [],
  );

  // §B7 reduced motion — "only the press offset remains as an instant state change; no ring": the
  // trace is not rendered at all while motion is off, so a ring that was on screen when the switch
  // flipped is unmounted rather than left as a static 88 px ink circle.
  if (!ready || motionOff || rings.length === 0) return null;
  return (
    <div
      className="board-touch-trace"
      data-testid="board-touch-trace"
      aria-hidden="true"
    >
      {rings.map((ring) => (
        <span
          key={ring.id}
          className="board-touch-point"
          style={{ left: `${ring.x}px`, top: `${ring.y}px` }}
        >
          <span
            className="board-touch-ring"
            data-pointer={ring.pointer}
            onAnimationEnd={() => drop(ring.id)}
          />
        </span>
      ))}
    </div>
  );
}
