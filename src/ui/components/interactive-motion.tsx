"use client";
import { useEffect, useRef, type ReactNode, type PointerEvent } from "react";
import { useVisualPreferences } from "./visual-preferences";

// Animate the existing DOM; route/question changes never remount provider state.
export function MotionSwap({
  children,
  change,
  className = "",
}: {
  children: ReactNode;
  change: string | number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { ready, reduced, light, saveData } = useVisualPreferences();
  useEffect(() => {
    if (!ready || reduced || light || saveData) return;
    const animation = ref.current?.animate(
      [
        { opacity: 0.65, transform: "translateY(8px)" },
        { opacity: 1, transform: "translateY(0)" },
      ],
      { duration: 220, easing: "ease-out" },
    );
    return () => animation?.cancel();
  }, [change, ready, reduced, light, saveData]);
  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

// Swiping is limited to a labelled navigation strip, away from math/drawing.
export function SwipeNavigation({
  children,
  onStep,
  disabled = false,
}: {
  children: ReactNode;
  onStep: (direction: -1 | 1) => void;
  disabled?: boolean;
}) {
  const start = useRef<{ id: number; x: number; y: number } | undefined>(
    undefined,
  );
  function down(event: PointerEvent<HTMLDivElement>) {
    if (
      disabled ||
      !event.isPrimary ||
      event.button !== 0 ||
      (event.target as Element).closest("button,a,input,select,textarea")
    )
      return;
    start.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  return (
    <div
      className="session-swipe-strip"
      aria-label="Navigasi soal; geser kiri atau kanan"
      onPointerDown={down}
      onPointerCancel={() => {
        start.current = undefined;
      }}
      onPointerUp={(event) => {
        const first = start.current;
        start.current = undefined;
        if (!first || first.id !== event.pointerId || disabled) return;
        const dx = event.clientX - first.x,
          dy = event.clientY - first.y;
        if (Math.abs(dx) >= 56 && Math.abs(dx) > Math.abs(dy) * 1.5)
          onStep(dx < 0 ? 1 : -1);
      }}
    >
      {children}
    </div>
  );
}
