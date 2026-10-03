"use client";
import { useEffect, useState } from "react";
import { Button } from "@/ui/components/button";

// Keep the existing 90-second lease alive on the adaptive pages too. Never
// take over another active sample browser without an explicit user action.
export function SampleControl({ active }: { active: boolean }) {
  const [conflict, setConflict] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    if (!active) return;
    const controller = new AbortController();
    let working = false;
    async function renew() {
      if (working || !navigator.onLine || controller.signal.aborted) return;
      working = true;
      try {
        const response = await fetch("/api/v1/sample/control", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ takeover: false }),
          signal: AbortSignal.any([
            controller.signal,
            AbortSignal.timeout(5000),
          ]),
          cache: "no-store",
        });
        if (!controller.signal.aborted) setConflict(response.status === 409);
      } catch {
        // Connection controls report network failures when the user needs them.
      } finally {
        working = false;
      }
    }
    const visible = () => {
      if (document.visibilityState === "visible") void renew();
    };
    void renew();
    const timer = setInterval(() => void renew(), 30000);
    window.addEventListener("online", renew);
    window.addEventListener("focus", renew);
    document.addEventListener("visibilitychange", visible);
    return () => {
      controller.abort();
      clearInterval(timer);
      window.removeEventListener("online", renew);
      window.removeEventListener("focus", renew);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [active]);
  if (!active || !conflict) return null;
  return (
    <div role="alert" className="space-y-3 rounded-input border bg-card p-4">
      <p>
        Data contoh sedang dikendalikan perangkat lain. Ambil alih untuk
        menyambungkan layar dari perangkat ini.
      </p>
      <Button
        variant="outline"
        disabled={busy}
        onClick={async () => {
          if (
            !window.confirm(
              "Ambil alih kendali data contoh? Sambungan layar perangkat sebelumnya akan diputuskan.",
            )
          )
            return;
          setBusy(true);
          try {
            const response = await fetch("/api/v1/sample/control", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ takeover: true }),
              signal: AbortSignal.timeout(5000),
              cache: "no-store",
            });
            if (response.ok) {
              setConflict(false);
              setMessage("");
            } else
              setMessage(
                "Kendali belum berpindah. Periksa internet lalu coba lagi.",
              );
          } catch {
            setMessage(
              "Kendali belum berpindah. Periksa internet lalu coba lagi.",
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        Ambil alih kendali
      </Button>
      {message && <p role="status">{message}</p>}
    </div>
  );
}
