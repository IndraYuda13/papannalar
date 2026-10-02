"use client";
import { useCallback, useEffect, useState } from "react";
import {
  storageHealth,
  teacherUpdateSafe,
  type StorageHealth,
} from "../../local/storage-health";
import type { LocalScope } from "../../local/scope";
import { auditShellCache } from "../../offline/shell-cache";
import {
  activateWaitingUpdate,
  registerUpdateGuard,
} from "../../offline/update-safety";
import { Button } from "../../ui/components/button";
export function StorageStatus({ scope }: { scope: LocalScope }) {
  const [health, setHealth] = useState<
      StorageHealth & { usage: number; quota: number }
    >(),
    [shell, setShell] = useState(false),
    [message, setMessage] = useState(""),
    [waiting, setWaiting] = useState(false),
    [busy, setBusy] = useState(false);
  const { ownerId, mode } = scope;
  const audit = useCallback(async () => {
    try {
      const [value, cached, registration, estimate] = await Promise.all([
        storageHealth({ ownerId, mode }),
        auditShellCache(),
        navigator.serviceWorker?.getRegistration("/"),
        navigator.storage?.estimate().catch((): StorageEstimate => ({})),
      ]);
      setHealth({
        ...value,
        usage: estimate?.usage ?? 0,
        quota: estimate?.quota ?? 0,
      });
      setShell(cached);
      setWaiting(Boolean(registration?.waiting));
    } catch {
      setHealth(undefined);
      setShell(false);
      setMessage(
        "Penyimpanan belum dapat dibuka. Jangan hapus data browser; coba lagi dan pulihkan sesi server saat online.",
      );
    }
  }, [ownerId, mode]);
  useEffect(() => {
    const remove = registerUpdateGuard("teacher", teacherUpdateSafe);
    const error = (event: Event) => {
      const code: unknown = (event as CustomEvent<unknown>).detail;
      setMessage(
        code === "QUOTA"
          ? "Penyimpanan penuh. Kartu belum tersimpan; jangan buang kartu. Kosongkan ruang perangkat lalu simpan kembali."
          : code === "VERSION"
            ? "Versi penyimpanan belum cocok. Data dipertahankan; buka versi aplikasi yang sesuai."
            : "Data belum tersimpan. Periksa penyimpanan lalu coba lagi.",
      );
    };
    const refresh = () => {
      void audit();
    };
    const initial = window.setTimeout(refresh, 0);
    window.addEventListener("pn-local-storage-error", error);
    window.addEventListener("focus", refresh);
    window.addEventListener("pn-sync-restored", refresh);
    return () => {
      window.clearTimeout(initial);
      remove();
      window.removeEventListener("pn-local-storage-error", error);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("pn-sync-restored", refresh);
    };
  }, [audit]);
  async function update() {
    setBusy(true);
    try {
      if (await activateWaitingUpdate()) window.location.reload();
      else
        setMessage(
          "Pembaruan ditunda. Akhiri sesi, sinkronkan antrean, dan tutup papan aktif pada semua tab sebelum memperbarui.",
        );
    } catch {
      setMessage("Pembaruan belum tersedia. Versi ini tetap dapat digunakan.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      aria-label="Kesiapan offline"
      className="space-y-2 rounded-input border border-pn-ink-400/40 p-3 text-sm"
    >
      <p className="font-semibold">
        {health && shell && health.packages > 0 && !health.evicted
          ? "Siap offline untuk paket tersimpan"
          : "Kesiapan offline belum lengkap"}
      </p>
      <p>
        {shell
          ? "Shell, font, alat dan pemindai tersimpan."
          : "Cache aplikasi belum lengkap."}{" "}
        {health?.packages ?? 0} paket lokal.
      </p>
      {health?.evicted && (
        <p role="alert">
          Data lokal pernah hilang atau terhapus. Buka kelas dan muat sesi dari
          server saat online. Nama lokal hanya dapat dipulihkan dari CSV guru;
          data yang belum tersinkron mungkin tidak dapat dipulihkan.
        </p>
      )}
      {health?.localOnly ? (
        <p>
          {health.localOnly} paket atau cek lisan pra-sesi masih hanya di
          perangkat ini.
        </p>
      ) : null}
      {health?.pending && (
        <p>
          Ada antrean yang belum diterima server. Simpan perangkat ini sampai
          sinkronisasi selesai.
        </p>
      )}
      {health && health.quota > 0 && health.usage / health.quota > 0.9 && (
        <p>Ruang penyimpanan hampir penuh.</p>
      )}
      <Button variant="outline" disabled={busy} onClick={() => void audit()}>
        Periksa kesiapan offline
      </Button>
      <Button
        variant="outline"
        disabled={busy}
        onClick={async () => {
          try {
            const kept = await navigator.storage?.persist();
            setMessage(
              kept
                ? "Browser memberi penyimpanan persisten. Penghapusan manual tetap dapat menghapus data."
                : "Browser belum memberi penyimpanan persisten. Tetap sinkronkan jawaban dan simpan CSV nama secara lokal.",
            );
            await audit();
          } catch {
            setMessage(
              "Permintaan penyimpanan persisten belum didukung browser ini.",
            );
          }
        }}
      >
        Lindungi penyimpanan perangkat
      </Button>
      {waiting && (
        <Button disabled={busy} onClick={() => void update()}>
          Pasang pembaruan saat aman
        </Button>
      )}
      <p role="status">{message}</p>
    </section>
  );
}
