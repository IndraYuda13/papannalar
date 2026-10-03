"use client";
import { useEffect, useState } from "react";
import type { LocalScope } from "../../local/scope";
import { createSyncRepository } from "../../local/sync";
import { synchronize } from "../session/sync-client";
import { Button } from "../../ui/components/button";
import type { ClassDto } from "../../contracts/classes";
import { SyncReviewControls } from "./sync-review";
import { useAutoSync } from "./auto-sync";
import { syncAttentionMessage } from "./sync-notice";

export function SyncControls({
  scope,
  classroom,
  onAttention,
}: {
  scope: LocalScope;
  classroom?: ClassDto;
  onAttention?: (message: string) => void;
}) {
  const [message, setMessage] = useState(
      "Jawaban tersimpan di perangkat ini. Sinkronkan saat online.",
    ),
    [busy, setBusy] = useState(false);
  const { ownerId, mode } = scope;
  useAutoSync(scope, setMessage, onAttention);
  useEffect(() => {
    let active = true;
    const repo = createSyncRepository({ ownerId, mode });
    void repo
      .list()
      .then((entries) => {
        if (active && entries.length)
          setMessage(
            `${entries.length} sesi menunggu sinkronisasi${entries.some((e) => e.state === "review") ? "; ada konflik yang perlu ditinjau" : ""}.`,
          );
        if (active) onAttention?.(syncAttentionMessage(entries));
      })
      .catch(() => {
        if (active) setMessage("Antrean lokal belum dapat dibuka.");
      })
      .finally(() => repo.close());
    return () => {
      active = false;
    };
  }, [ownerId, mode, onAttention]);
  async function sync() {
    setBusy(true);
    const repo = createSyncRepository(scope);
    try {
      await repo.resume();
      const result = await synchronize(scope);
      onAttention?.(syncAttentionMessage(result.entries));
      setMessage(
        result.entries.some((e) => e.state === "review")
          ? "Konflik perangkat: jawaban lokal tetap disimpan. Tinjau versi server sebelum mengganti."
          : result.entries.length
            ? `${result.entries.length} sesi masih menunggu. ${result.entries.some((e) => e.state === "login") ? "Masuk kembali saat online." : "Coba sinkronkan lagi setelah koneksi pulih."}`
            : `${result.accepted} sesi diterima server. Nama tetap hanya di perangkat guru.`,
      );
    } catch {
      setMessage("Sinkronisasi belum selesai. Jawaban lokal tetap tersimpan.");
    } finally {
      repo.close();
      setBusy(false);
    }
  }
  return (
    <section
      aria-label="Sinkronisasi"
      className="space-y-2 rounded-input border border-pn-ink-400/40 p-3"
    >
      <Button variant="outline" disabled={busy} onClick={() => void sync()}>
        {busy ? "Menyinkronkan…" : "Sinkronkan jawaban"}
      </Button>
      <p role="status" className="text-sm">
        {message}
      </p>
      <p className="text-sm text-muted-foreground">
        Sinkronisasi cloud memerlukan internet. Sesi demo contoh tetap tersimpan
        lokal.
      </p>
      <SyncReviewControls
        key={`${scope.ownerId}:${scope.mode}:${classroom?.id ?? "all"}`}
        scope={scope}
        classroom={classroom}
      />
    </section>
  );
}
