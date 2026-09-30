"use client";
import {
  channelSchema,
  envelopeSchema,
  envelopeDecision,
  snapshotSchema,
  type PresentationSnapshot,
  type PresentationEnvelope,
} from "@/contracts/presentation";
import { observeServerClock } from "./clock";
export type Surface = "teacher" | "board";
export class PairingError extends Error {
  constructor(public readonly status: number) {
    super("Pairing unavailable");
  }
}
export async function pairingCall(
  surface: Surface,
  input: object,
): Promise<unknown> {
  const sentAt = Date.now();
  const response = await fetch(
    surface === "board" ? "/api/v1/board/pairing" : "/api/v1/pairing",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
      cache: "no-store",
    },
  );
  observeServerClock(response.headers.get("date"), sentAt, Date.now());
  if (!response.ok) throw new PairingError(response.status);
  return response.json();
}
// Supabase Broadcast is a notification, never the only durable state. The local
// adapter uses this exact snapshot/ACK path without pretending to run WebSockets.
export function watchPresentation(
  surface: Surface,
  id: string,
  onSnapshot: (value: PresentationSnapshot | null) => void,
  onConnection: (connected: boolean) => void,
) {
  let stopped = false,
    busy = false,
    current: PresentationEnvelope | null = null,
    unsubscribe: (() => void) | undefined;
  async function recover() {
    if (stopped || busy) return;
    busy = true;
    try {
      if (!navigator.onLine) throw new Error("offline");
      const snapshot = snapshotSchema.parse(
        await pairingCall(surface, { action: "snapshot", presentationId: id }),
      );
      if (!stopped) {
        current = snapshot.envelope;
        onSnapshot(snapshot);
        onConnection(true);
      }
    } catch (error) {
      if (!stopped) {
        onConnection(false);
        if (
          error instanceof PairingError &&
          [401, 403, 404].includes(error.status)
        ) {
          current = null;
          onSnapshot(null);
        }
      }
    } finally {
      busy = false;
    }
  }
  async function subscribe() {
    try {
      const settings = channelSchema.parse(
        await pairingCall(surface, { action: "channel", presentationId: id }),
      );
      if (settings.kind !== "realtime" || stopped) return;
      const { createClient } = await import("@supabase/supabase-js");
      if (stopped || !current) return;
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
              presentationId: id,
            }),
          );
          return fresh.kind === "realtime" ? fresh.token : null;
        },
      });
      const channel = client
        .channel(`pn:state:${id}:${current.channelEpoch}`, {
          config: { private: true },
        })
        .on("broadcast", { event: "state" }, (message) => {
          const parsed = envelopeSchema.safeParse(message.payload);
          if (
            parsed.success &&
            envelopeDecision(current, parsed.data) !== "ignore"
          )
            void recover();
        })
        .subscribe();
      unsubscribe = () => {
        void client.removeChannel(channel);
      };
    } catch {
      /* Snapshot recovery remains available; no tokens/errors logged. */
    }
  }
  void recover().then(subscribe);
  const timer = setInterval(() => void recover(), 1000);
  const online = () => void recover();
  window.addEventListener("online", online);
  window.addEventListener("offline", online);
  return () => {
    stopped = true;
    clearInterval(timer);
    unsubscribe?.();
    window.removeEventListener("online", online);
    window.removeEventListener("offline", online);
  };
}
