"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { PresentationEnvelope } from "@/contracts/presentation";
import { remoteCall, watchRemote } from "@/features/classroom/remote-transport";
import { createRemoteDom } from "@/features/classroom/remote-dom";
import type { RemoteReceipt } from "@/contracts/remote";
export function RemoteBoard({
  env,
  children,
  enabled = true,
}: {
  env: PresentationEnvelope;
  children: ReactNode;
  enabled?: boolean;
}) {
  const root = useRef<HTMLDivElement>(null),
    [cursor, setCursor] = useState<{ x: number; y: number }>();
  const { presentationId, channelEpoch } = env,
    taskEpoch = env.payload.taskEpoch,
    mode = env.payload.mode;
  useEffect(() => {
    if (
      !enabled ||
      !["opening", "station", "together", "split", "spotlight"].includes(mode)
    )
      return;
    const snapshot = { presentationId, channelEpoch },
      binding = { presentationId, channelEpoch, taskEpoch },
      instanceId = crypto.randomUUID(),
      controller = new AbortController();
    const adapter = createRemoteDom(() => root.current, setCursor);
    let joined = false,
      busy = false,
      last: RemoteReceipt | undefined,
      lastSequence = 0,
      lastAppliedAt = 0;
    async function poll() {
      if (busy || controller.signal.aborted) return;
      busy = true;
      if (performance.now() - lastAppliedAt > 1200) adapter.idle();
      try {
        if (!joined) {
          await remoteCall(
            "board",
            { action: "join", ...binding, instanceId },
            controller.signal,
          );
          joined = true;
        }
        const status = await remoteCall(
            "board",
            { action: "read", ...binding },
            controller.signal,
          ),
          cmd = status.command;
        if (controller.signal.aborted) return;
        if (status.instanceId !== instanceId) {
          adapter.clear();
          return;
        }
        if (
          !cmd ||
          cmd.instanceId !== instanceId ||
          cmd.taskEpoch !== taskEpoch ||
          status.receipt
        )
          return;
        if (cmd.sequence < lastSequence) return;
        if (last?.id !== cmd.id) {
          lastAppliedAt = performance.now();
          lastSequence = cmd.sequence;
          last = { id: cmd.id, ...adapter.apply(cmd.input) };
        }
        await remoteCall(
          "board",
          { action: "ack", ...binding, instanceId, receipt: last },
          controller.signal,
        );
      } catch {
        adapter.clear();
      } finally {
        busy = false;
      }
    }
    void poll();
    const timer = setInterval(() => void poll(), 250),
      off = watchRemote("board", snapshot, () => void poll());
    const offline = () => adapter.clear();
    window.addEventListener("offline", offline);
    return () => {
      controller.abort();
      clearInterval(timer);
      off();
      window.removeEventListener("offline", offline);
      adapter.clear();
    };
  }, [presentationId, channelEpoch, taskEpoch, mode, enabled]);
  return (
    <div ref={root} data-remote-area="tool">
      {children}
      {cursor && (
        <span
          aria-hidden="true"
          className="pointer-events-none fixed z-50 size-8 rounded-full border-4 border-primary bg-pn-amber-500"
          style={{ left: cursor.x - 16, top: cursor.y - 16 }}
        />
      )}
    </div>
  );
}
