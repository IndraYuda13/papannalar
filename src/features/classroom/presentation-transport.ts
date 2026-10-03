"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  presentationResumeSchema,
  snapshotSchema,
  publicPresentation,
  type PresentationSnapshot,
  type PresentationState,
} from "../../contracts/presentation";
import { PairingError, pairingCall, watchPresentation } from "./transport";
import {
  boardAcknowledged,
  type PresentationConnection,
} from "./connection-transport";
import { classroomNow } from "./clock";
import { clearPairingLink } from "./pairing-url";

// Reused by adaptive sessions and simple library runs (sessionId = run.id).
// The initial projection is sent only for the FIRST claim; SQL ignores it when
// rebinding an existing presentation, so question 3 never becomes question 1.
export function usePresentationTransport({
  sessionId,
  classId,
  initialState,
}: {
  sessionId: string;
  classId: string;
  initialState: () => PresentationState;
}) {
  const [value, setValue] = useState<{
    sessionId: string;
    snapshot: PresentationSnapshot;
  }>();
  const snapshot = value?.sessionId === sessionId ? value.snapshot : undefined;
  const latestSnapshot = useRef<PresentationSnapshot | undefined>(undefined);
  const retiredEpochs = useRef(new Set<string>());
  const [online, setOnline] = useState(false);
  const [connection, setConnection] = useState<PresentationConnection>();
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const locked = useRef(false);
  const receive = useCallback(
    (next: PresentationSnapshot | undefined) => {
      const previous = latestSnapshot.current;
      if (next && retiredEpochs.current.has(next.envelope.channelEpoch)) return;
      if (
        previous &&
        next &&
        previous.envelope.presentationId === next.envelope.presentationId &&
        previous.envelope.channelEpoch === next.envelope.channelEpoch &&
        previous.envelope.revision > next.envelope.revision
      )
        return;
      if (
        previous &&
        next &&
        previous.envelope.channelEpoch !== next.envelope.channelEpoch
      )
        retiredEpochs.current.add(previous.envelope.channelEpoch);
      latestSnapshot.current = next;
      setValue(next ? { sessionId, snapshot: next } : undefined);
    },
    [sessionId],
  );
  useEffect(() => {
    const abort = new AbortController();
    latestSnapshot.current = undefined;
    retiredEpochs.current.clear();
    let timer: ReturnType<typeof setTimeout> | undefined,
      delay = 1_000;
    async function restore() {
      if (abort.signal.aborted || latestSnapshot.current) return;
      try {
        const result = presentationResumeSchema.parse(
          await pairingCall(
            "teacher",
            { action: "resume", sessionId, classId },
            abort.signal,
          ),
        );
        if (!abort.signal.aborted && !latestSnapshot.current)
          receive(result.snapshot ?? undefined);
      } catch (error) {
        if (
          abort.signal.aborted ||
          (error instanceof PairingError &&
            [401, 403, 404].includes(error.status))
        )
          return;
        timer = setTimeout(() => void restore(), delay);
        delay = Math.min(30_000, delay * 2);
      }
    }
    void restore();
    return () => {
      abort.abort();
      clearTimeout(timer);
    };
  }, [sessionId, classId, receive]);
  const id = snapshot?.envelope.presentationId;
  useEffect(() => {
    if (!id) return;
    return watchPresentation(
      "teacher",
      id,
      (next) => {
        receive(next ?? undefined);
        if (!next)
          setMessage(
            "Sambungan berakhir atau kendali berpindah. Sambungkan layar untuk melanjutkan sesi yang masih aktif.",
          );
      },
      setOnline,
      setConnection,
    );
  }, [id, receive]);
  async function pair(code: string) {
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    try {
      setMessage("");
      const claim = () =>
        pairingCall("teacher", {
          action: "claim",
          code,
          sessionId,
          classId,
          payload: publicPresentation(initialState()),
        });
      let result: unknown;
      try {
        result = await claim();
      } catch (error) {
        if (
          !(error instanceof PairingError) ||
          error.code !== "SAMPLE_CONTROL_REQUIRED"
        )
          throw error;
        // A suspended mobile tab can miss renewal. Renew its own lease once;
        // takeover:false cannot displace a different, active sample browser.
        const renewed = await fetch("/api/v1/sample/control", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ takeover: false }),
          signal: AbortSignal.timeout(5000),
          cache: "no-store",
        });
        if (!renewed.ok) {
          window.dispatchEvent(new Event("focus"));
          throw error;
        }
        result = await claim();
      }
      const next = snapshotSchema.parse(result);
      clearPairingLink();
      receive(next);
      setMessage("Menunggu layar menerapkan tampilan.");
    } catch (error) {
      throw error;
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }
  async function revoke() {
    if (!id || locked.current) return;
    locked.current = true;
    setBusy(true);
    try {
      await pairingCall("teacher", { action: "revoke", presentationId: id });
      receive(undefined);
      setOnline(false);
      clearPairingLink();
      setMessage("Layar diputuskan. Sesi belajar tetap tersimpan.");
    } catch {
      setMessage(
        "Layar belum dapat diputuskan. Sambungkan internet lalu coba lagi.",
      );
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }
  return {
    snapshot,
    latestSnapshot,
    receive,
    online,
    connected: Boolean(
      online && snapshot && boardAcknowledged(snapshot, classroomNow()),
    ),
    connection,
    busy,
    message,
    setMessage,
    pair,
    revoke,
  };
}
