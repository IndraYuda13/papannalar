"use client";
import { remoteStatusSchema } from "@/contracts/remote";
import type { PresentationEnvelope } from "@/contracts/presentation";
import { channelSchema } from "@/contracts/presentation";
import { pairingCall, type Surface } from "./transport";
export const remoteBinding = (env: PresentationEnvelope) => ({
  presentationId: env.presentationId,
  channelEpoch: env.channelEpoch,
  taskEpoch: env.payload.taskEpoch,
});
export async function remoteCall(
  surface: Surface,
  input: object,
  signal?: AbortSignal,
) {
  if (!navigator.onLine) throw new Error("Remote offline");
  const requestController = new AbortController();
  const abort = () => requestController.abort();
  if (signal?.aborted) abort();
  signal?.addEventListener("abort", abort, { once: true });
  const timeout = setTimeout(abort, 3000);
  try {
    const response = await fetch(
      surface === "board" ? "/api/v1/board/remote" : "/api/v1/remote",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
        cache: "no-store",
        signal: requestController.signal,
      },
    );
    if (!response.ok) throw new Error("Remote unavailable");
    return remoteStatusSchema.parse(await response.json());
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", abort);
  }
}
// Broadcast is only a wakeup. Every action/ACK still passes the same authenticated RPC.
export function watchRemote(
  surface: Surface,
  env: Pick<PresentationEnvelope, "presentationId" | "channelEpoch">,
  wakeup: () => void,
) {
  let stopped = false,
    unsubscribe: (() => void) | undefined;
  async function start() {
    try {
      const settings = channelSchema.parse(
        await pairingCall(surface, {
          action: "channel",
          presentationId: env.presentationId,
        }),
      );
      if (stopped || settings.kind !== "realtime") return;
      const { createClient } = await import("@supabase/supabase-js");
      if (stopped) return;
      const client = createClient(settings.url, settings.key, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
        accessToken: async () => {
          const fresh = channelSchema.parse(
            await pairingCall(surface, {
              action: "channel",
              presentationId: env.presentationId,
            }),
          );
          return fresh.kind === "realtime" ? fresh.token : null;
        },
      });
      const channel = client
        .channel(`pn:input:${env.presentationId}:${env.channelEpoch}`, {
          config: { private: true },
        })
        .on("broadcast", { event: "remote" }, wakeup)
        .subscribe();
      unsubscribe = () => {
        void client.removeChannel(channel);
      };
    } catch {
      /* Bounded polling recovers a missing notification. */
    }
  }
  void start();
  return () => {
    stopped = true;
    unsubscribe?.();
  };
}
