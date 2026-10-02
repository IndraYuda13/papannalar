"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { useVisualPreferences } from "./visual-preferences";

// Content is visible before JS/observer and never remounts application state.
export function MotionBoundary({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { reduced, light, saveData } = useVisualPreferences();
  useEffect(() => {
    const node = ref.current;
    if (!node || reduced || light || saveData || !window.IntersectionObserver)
      return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        node.animate(
          [
            { opacity: 0.65, transform: "translateY(10px)" },
            { opacity: 1, transform: "translateY(0)" },
          ],
          { duration: 280, easing: "ease-out" },
        );
        observer.disconnect();
      },
      { threshold: 0.08 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [reduced, light, saveData]);
  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
