"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import type { PresentationEnvelope } from "@/contracts/presentation";
import { guidanceCall } from "@/features/classroom/guidance-transport";
const ReportHint = createContext<((hint: number) => void) | undefined>(
  undefined,
);
export const useHintReport = () => useContext(ReportHint);
export function HintReports({
  enabled,
  children,
}: {
  enabled: boolean;
  children: ReactNode;
}) {
  const report = useHintReport();
  return (
    <ReportHint.Provider value={enabled ? report : undefined}>
      {children}
    </ReportHint.Provider>
  );
}
export function HintReporting({
  env,
  enabled,
  children,
}: {
  env?: PresentationEnvelope;
  enabled: boolean;
  children: ReactNode;
}) {
  const pending = useRef(0);
  const report = useCallback((hint: number) => {
    pending.current = Math.max(pending.current, hint);
  }, []);
  const id = env?.presentationId,
    channelEpoch = env?.channelEpoch,
    taskEpoch = env?.payload.taskEpoch;
  const active =
    enabled &&
    !!env &&
    ["station", "together", "spotlight"].includes(env.payload.mode);
  useEffect(() => {
    if (!active || !id || !channelEpoch || !taskEpoch) return;
    let sent = -1,
      busy = false;
    const controller = new AbortController();
    async function poll() {
      if (
        busy ||
        !navigator.onLine ||
        sent >= pending.current ||
        controller.signal.aborted
      )
        return;
      busy = true;
      const hint = pending.current;
      try {
        const receipt = await guidanceCall(
          "board",
          {
            action: "ack",
            presentationId: id!,
            channelEpoch: channelEpoch!,
            taskEpoch: taskEpoch!,
            hint,
          },
          controller.signal,
        );
        if (receipt.active) sent = hint;
      } catch {
        /* Only a bounded hint counter waits in RAM; never model/ink/student data. */
      } finally {
        busy = false;
      }
    }
    const timer = setInterval(() => void poll(), 1200);
    return () => {
      controller.abort();
      clearInterval(timer);
      pending.current = 0;
    };
  }, [active, id, channelEpoch, taskEpoch]);
  return (
    <ReportHint.Provider value={active ? report : undefined}>
      {children}
    </ReportHint.Provider>
  );
}
