"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { WifiOff, RefreshCw } from "lucide-react";

type Line = "offline" | "recovered" | undefined;

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
