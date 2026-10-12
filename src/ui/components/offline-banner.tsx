"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { WifiOff, RefreshCw } from "lucide-react";

type Line = "offline" | "recovered" | undefined;

/**
 * One persistent offline line at the top of the working area (§9.7).
 *
 * It never blocks the page and it never repeats: the state is stated once, in one place, with
 * the one fact a teacher mid-lesson needs — what still works. The board is excluded because
 * `/layar` carries its own state line inside the title-safe frame, and two statements of the
 * same fact on one screen is the defect this product keeps having to fix.
 *
 * The state machine lives entirely in the browser events (not in an effect body), so the
 * "tersambung lagi" line is a real C6 consequence of a transition rather than a derived
 * re-render.
 */
export function OfflineBanner() {
  const pathname = usePathname();
  const [line, setLine] = useState<Line>();
  useEffect(() => {
    let recoverTimer: number | undefined;
    const offline = () => {
      window.clearTimeout(recoverTimer);
      setLine("offline");
    };
    const online = () => {
      window.clearTimeout(recoverTimer);
      setLine("recovered");
      recoverTimer = window.setTimeout(() => setLine(undefined), 4000);
    };
    const init = window.setTimeout(() => {
      if (!navigator.onLine) setLine("offline");
    }, 0);
    window.addEventListener("online", online);
    window.addEventListener("offline", offline);
    return () => {
      window.clearTimeout(init);
      window.clearTimeout(recoverTimer);
      window.removeEventListener("online", online);
      window.removeEventListener("offline", offline);
    };
  }, []);
  if (pathname?.startsWith("/layar") || !line) return null;
  return (
    <p
      className="studio-offline-line"
      data-offline-line={line}
      role="status"
      data-motion-class="C6"
    >
      {line === "recovered" ? (
        <>
          <RefreshCw size={18} strokeWidth={1.8} aria-hidden />
          <span>Tersambung lagi. Tampilan terakhir dipulihkan.</span>
        </>
      ) : (
        <>
          <WifiOff size={18} strokeWidth={1.8} aria-hidden />
          <span>Tanpa internet</span>
          <span className="studio-offline-detail">
            Pemindaian tetap jalan dan akan disinkronkan nanti.
          </span>
        </>
      )}
    </p>
  );
}
