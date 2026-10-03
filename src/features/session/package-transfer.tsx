"use client";
import { useEffect, useRef, useState } from "react";
import type { TeacherPackage } from "@/core/package/build";
import type { GroupSnapshot } from "@/core/groups/grouping";
import type {
  PresentationEnvelope,
  PresentationSnapshot,
} from "@/contracts/presentation";
import { parseBoardPacket } from "@/contracts/board-package";
import type { BoardContentStatus } from "@/contracts/board-content";
import { contentCall } from "@/features/classroom/content-transport";
import { boardPackageProjection } from "./board-package-projection";
import { Button } from "@/ui/components/button";
import { MODE_LABELS } from "@/content/demo/board-content";

export function PackageTransfer({
  value,
  groups,
  sessionId,
  env,
  onResolved,
}: {
  value: TeacherPackage;
  groups: readonly GroupSnapshot[];
  sessionId: string;
  env: PresentationEnvelope;
  onResolved: (snapshot: PresentationSnapshot) => void;
}) {
  const [status, setStatus] = useState<BoardContentStatus>();
  const [message, setMessage] = useState(
    "Menyiapkan konten publik untuk papan…",
  );
  const [busy, setBusy] = useState(false);
  const latest = useRef(env);
  useEffect(() => {
    latest.current = env;
  }, [env]);
  const serialized = JSON.stringify(
    boardPackageProjection(value, sessionId, groups),
  );
  const { presentationId, channelEpoch } = env;
  const packageId = env.payload.package?.id,
    revision = env.payload.package?.revision;
  useEffect(() => {
    const packet = parseBoardPacket(JSON.parse(serialized));
    if (
      packageId !== packet.content.content.id ||
      revision !== packet.content.content.revision
    )
      return;
    const controller = new AbortController();
    let uploaded = false,
      working = false;
    async function poll() {
      if (working || !navigator.onLine || controller.signal.aborted) return;
      working = true;
      try {
        const result = await contentCall(
          "teacher",
          uploaded
            ? { action: "read", presentationId, channelEpoch }
            : {
                action: "write",
                presentationId,
                channelEpoch,
                packet,
              },
          controller.signal,
        );
        uploaded = true;
        if (!controller.signal.aborted) {
          setStatus(result);
          setMessage(
            result.cached
              ? "Paket offline sudah tersimpan di papan."
              : "Konten siap dikirim; menunggu cache papan.",
          );
        }
      } catch {
        if (!controller.signal.aborted)
          setMessage(
            "Cache papan belum terkonfirmasi. Sambungkan internet untuk mengirim paket.",
          );
      } finally {
        working = false;
      }
    }
    void poll();
    const timer = setInterval(() => void poll(), 1500);
    return () => {
      controller.abort();
      clearInterval(timer);
    };
  }, [serialized, presentationId, channelEpoch, packageId, revision]);
  async function resolve(choice: "board" | "teacher") {
    if (!status?.proposal || busy) return;
    setBusy(true);
    try {
      const current = latest.current;
      const result = await contentCall("teacher", {
        action: "resolve",
        presentationId,
        channelEpoch,
        baseRevision: current.revision,
        proposalEpoch: status.proposal.taskEpoch,
        commandId: crypto.randomUUID(),
        taskEpoch: crypto.randomUUID(),
        choice,
      });
      if (result.snapshot) onResolved(result.snapshot);
      setStatus(result);
      setMessage("Pilihan tersimpan. Menunggu papan menerapkannya.");
    } catch {
      setMessage("Tampilan berubah. Tunggu status terbaru, lalu pilih lagi.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      aria-label="Paket offline papan"
      className="space-y-3 rounded-kartu border p-3"
    >
      <p role="status">{message}</p>
      {status?.proposal && (
        <>
          <p role="alert">
            Papan memakai kendali lokal:{" "}
            {status.proposal.mode === "exit"
              ? "Kartu cek akhir"
              : MODE_LABELS[status.proposal.mode]}
            . Pilih tampilan yang akan dilanjutkan.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button
              disabled={busy || status.proposalStale}
              onClick={() => void resolve("board")}
            >
              Gunakan tampilan papan
            </Button>
            <Button
              disabled={busy}
              variant="outline"
              onClick={() => void resolve("teacher")}
            >
              Kembali ke tampilan HP
            </Button>
          </div>
          {status.proposalStale && (
            <p>
              Paket atau pembagian kelompok berubah. Gunakan tampilan HP, atau
              pilih ulang tampilan pada papan.
            </p>
          )}
        </>
      )}
    </section>
  );
}
