"use client";
import { useEffect } from "react";
import type { LocalScope } from "../../local/scope";
import { synchronize } from "../session/sync-client";
import { createSyncRepository } from "../../local/sync";
import { syncAttentionMessage } from "./sync-notice";
/** Foreground only: bounded retries stored durably; closing the browser stops this loop. */
export function useAutoSync(
  { ownerId, mode }: LocalScope,
  onStatus: (text: string) => void,
  onAttention?: (text: string) => void,
) {
  useEffect(() => {
    const controller = new AbortController();
    let busy = false;
    let timer: ReturnType<typeof setTimeout>;
    const schedule = (delay = 15000) => {
      clearTimeout(timer);
      if (!controller.signal.aborted)
        timer = setTimeout(() => {
          void round();
        }, delay);
    };
    async function round(resume = false) {
      if (busy || controller.signal.aborted) return;
      if (!navigator.onLine || document.visibilityState !== "visible") {
        schedule();
        return;
      }
      busy = true;
      let delay = 15000;
      const scope = { ownerId, mode },
        repo = createSyncRepository(scope);
      try {
        if (resume) await repo.resume();
        const result = await synchronize(scope, controller.signal);
        const retry = result.entries
          .filter((e) => e.state === "retry" && e.attempts < 6)
          .map((e) => e.nextAttempt);
        if (retry.length)
          delay = Math.max(1000, Math.min(...retry) - Date.now());
        if (!controller.signal.aborted) {
          onAttention?.(syncAttentionMessage(result.entries));
          if (result.accepted)
            onStatus(
              `${result.accepted} sesi diterima server. Nama tetap hanya di perangkat guru.`,
            );
        }
      } catch {
        /* Explicit sync/storage status retains the pending/error state. */
      } finally {
        repo.close();
        busy = false;
        schedule(delay);
      }
    }
    const resume = () => {
      void round(true);
    };
    schedule();
    window.addEventListener("online", resume);
    document.addEventListener("visibilitychange", resume);
    return () => {
      controller.abort();
      clearTimeout(timer);
      window.removeEventListener("online", resume);
      document.removeEventListener("visibilitychange", resume);
    };
  }, [ownerId, mode, onStatus, onAttention]);
}
