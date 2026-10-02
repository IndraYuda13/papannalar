"use client";
import {
  channelSchema,
  envelopeSchema,
  envelopeDecision,
  connectionPulseSchema,
  type PresentationSnapshot,
} from "../../contracts/presentation";
import { observeServerClock } from "./clock";
import { presentationControllerId } from "./controller-transport";
import {
  startPresentationWatch,
  type PresentationConnection,
} from "./connection-transport";
export type Surface = "teacher" | "board";
export class PairingError extends Error {
  constructor(public readonly status: number) {
    super("Pairing unavailable");
  }
}
export async function pairingCall(
  surface: Surface,
  input: object,
  signal?: AbortSignal,
): Promise<unknown> {
  const sentAt = Date.now();
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal?.aborted) abort();
  signal?.addEventListener("abort", abort, { once: true });
  const timeout = setTimeout(abort, 8_000);
  try {
    const response = await fetch(
      surface === "board" ? "/api/v1/board/pairing" : "/api/v1/pairing",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          surface === "teacher"
            ? { controllerId: presentationControllerId(), ...input }
            : input,
        ),
        cache: "no-store",
        signal: controller.signal,
      },
    );
    observeServerClock(response.headers.get("date"), sentAt, Date.now());
    if (!response.ok) throw new PairingError(response.status);
    const value: unknown = await response.json();
    if ("action" in input && input.action === "heartbeat") {
      const pulse = connectionPulseSchema.safeParse(value);
      if (pulse.success)
        observeServerClock(pulse.data.serverNow, sentAt, Date.now(), true);
    }
    return value;
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", abort);
  }
}
export function watchPresentation(
  surface: Surface,
  id: string,
  onSnapshot: (value: PresentationSnapshot | null) => void,
  onConnection: (connected: boolean) => void,
  onStatus?: (value: PresentationConnection) => void,
) {
  const watcher = startPresentationWatch({
    call: (action, signal) =>
      pairingCall(surface, { action, presentationId: id }, signal),
    isOnline: () => navigator.onLine,
    isTerminal: (error) =>
      error instanceof PairingError &&
      [401, 403, 404, 409].includes(error.status),
    onSnapshot,
    onConnection: (value) => {
      onConnection(value.transport === "online");
      onStatus?.(value);
    },
    subscribe: async (env, wake, health, signal) => {
      const settings = channelSchema.parse(
        await pairingCall(
          surface,
          { action: "channel", presentationId: id },
          signal,
        ),
      );
      if (settings.kind !== "realtime" || signal.aborted) return;
      const { createClient } = await import("@supabase/supabase-js");
      if (signal.aborted) return;
      const client = createClient(settings.url, settings.key, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
        accessToken: async () => {
          const fresh = channelSchema.parse(
            await pairingCall(
              surface,
              { action: "channel", presentationId: id },
              signal,
            ),
          );
          return fresh.kind === "realtime" ? fresh.token : null;
        },
      });
      const channel = client
        .channel(`pn:state:${id}:${env.channelEpoch}`, {
          config: { private: true },
        })
        .on("broadcast", { event: "state" }, (message) => {
          const parsed = envelopeSchema.safeParse(message.payload);
          if (parsed.success && envelopeDecision(env, parsed.data) !== "ignore")
            wake();
        })
        .subscribe((status) => health(status === "SUBSCRIBED"));
      return () => {
        void client.removeChannel(channel);
      };
    },
  });
  const online = () => watcher.wake();
  window.addEventListener("online", online);
  window.addEventListener("offline", online);
  return () => {
    watcher.stop();
    window.removeEventListener("online", online);
    window.removeEventListener("offline", online);
  };
}
