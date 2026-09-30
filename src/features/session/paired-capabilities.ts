"use client";
import { useEffect, useState } from "react";
import { boardProfileSchema } from "@/contracts/board-profile";
import type { TouchCount } from "@/core/tools/capabilities";
export function usePairedTouches(presentationId?: string) {
  const [value, setValue] = useState<{ id: string; touches: TouchCount }>();
  useEffect(() => {
    if (!presentationId) return;
    const controller = new AbortController();
    let busy = false;
    async function read() {
      if (busy || !navigator.onLine) return;
      busy = true;
      try {
        const response = await fetch(
          `/api/v1/board-profiles?presentationId=${presentationId}`,
          { cache: "no-store", signal: controller.signal },
        );
        if (!response.ok) return;
        const data: unknown = await response.json();
        const parsed = boardProfileSchema.safeParse(
          typeof data === "object" && data !== null && "profile" in data
            ? data.profile
            : null,
        );
        if (!controller.signal.aborted)
          setValue({
            id: presentationId!,
            touches: parsed.success ? parsed.data.touches : 1,
          });
      } catch {
        /* Conservative one-pilot default remains until a profile is verified. */
      } finally {
        busy = false;
      }
    }
    void read();
    const timer = setInterval(() => void read(), 5000);
    return () => {
      controller.abort();
      clearInterval(timer);
    };
  }, [presentationId]);
  return value && value.id === presentationId ? value.touches : 1;
}
