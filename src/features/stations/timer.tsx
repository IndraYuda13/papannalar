"use client";
import { useEffect, useState } from "react";
import { classroomNow } from "@/features/classroom/clock";
export function RotationTimer({ deadlineAt }: { deadlineAt: number | null }) {
  const [seconds, setSeconds] = useState<number | null>(null);
  useEffect(() => {
    const origin = classroomNow(),
      monotonic = performance.now();
    const tick = () =>
      setSeconds(
        deadlineAt === null
          ? 0
          : Math.max(
              0,
              Math.ceil(
                (deadlineAt - origin - (performance.now() - monotonic)) / 1000,
              ),
            ),
      );
    tick();
    const timer = setInterval(tick, 250);
    return () => clearInterval(timer);
  }, [deadlineAt]);
  return (
    <span aria-label="Waktu putaran" className="tabular-nums">
      {seconds === null
        ? "—"
        : `${Math.floor(seconds / 60)
            .toString()
            .padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`}
    </span>
  );
}
