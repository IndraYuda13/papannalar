"use client";
import { useEffect, useState } from "react";
import { ClipboardCheck } from "lucide-react";
import type { TeacherPackage } from "@/core/package/build";
import type { LocalScope } from "@/local/scope";
import {
  packagePreparation,
  type PreparationChecks,
} from "@/local/package-preparation";
import { Button } from "@/ui/components/button";

const labels = [
  "Saya sudah membaca soal dan memeriksa jawaban.",
  "Bahasa dan tingkat kesulitan sesuai dengan siswa.",
  "Tugas cetak dan alat yang akan dipakai sudah siap.",
] as const;
export function PackagePreparation({
  pkg,
  scope,
}: {
  pkg: TeacherPackage;
  scope: LocalScope;
}) {
  const [checks, setChecks] = useState<PreparationChecks>([
    false,
    false,
    false,
  ]);
  const [busy, setBusy] = useState(true);
  const [notice, setNotice] = useState("");
  useEffect(() => {
    const repo = packagePreparation({
      ownerId: scope.ownerId,
      mode: scope.mode,
    });
    let stopped = false;
    void repo
      .read(pkg)
      .then((value) => {
        if (!stopped) setChecks(value);
      })
      .catch(() => {
        if (!stopped)
          setNotice(
            "Catatan pemeriksaan belum dapat dibaca. Soal tetap tersedia.",
          );
      })
      .finally(() => {
        repo.close();
        if (!stopped) setBusy(false);
      });
    return () => {
      stopped = true;
    };
  }, [pkg, scope.ownerId, scope.mode]);
  async function mark(index: number, checked: boolean) {
    if (busy) return;
    const next = checks.map((value, i) =>
      i === index ? checked : value,
    ) as PreparationChecks;
    const repo = packagePreparation(scope);
    const previous = checks;
    setChecks(next);
    setBusy(true);
    try {
      await repo.save(pkg, next);
      setNotice("Pemeriksaan Anda tersimpan di perangkat ini.");
    } catch {
      setChecks(previous);
      setNotice(
        "Catatan belum tersimpan. Periksa penyimpanan atau muat ulang soal, lalu coba lagi.",
      );
    } finally {
      repo.close();
      setBusy(false);
    }
  }
  function inspectQuestions() {
    const section = document.getElementById("practice-assessment");
    if (section instanceof HTMLDetailsElement) {
      section.open = true;
      section.querySelector("summary")?.focus();
      section.scrollIntoView({ block: "start" });
    }
  }
  const complete = checks.filter(Boolean).length;
  return (
    <details className="text-sm" aria-label="Pemeriksaan materi">
      <summary className="flex min-h-12 cursor-pointer items-center gap-2 font-semibold">
        <ClipboardCheck size={20} aria-hidden />
        Tentang materi ini ·{" "}
        {complete === 3
          ? "pemeriksaan Anda selesai"
          : `${complete}/3 diperiksa`}
      </summary>
      <div className="space-y-3 pt-2">
        <p>
          Latihan ini berisi {pkg.assessment.length} soal cek dan tugas
          kelompok. Soal dan kunci dibuat dengan aturan matematika. Versi{" "}
          {pkg.revision}.
        </p>
        <fieldset className="space-y-2" disabled={busy}>
          <legend className="mb-2 font-bold">Periksa sebelum mengajar</legend>
          {labels.map((label, index) => (
            <label
              key={label}
              className="flex min-h-12 cursor-pointer items-center gap-3 rounded-input border border-pn-ink-400/30 bg-white p-3"
            >
              <input
                type="checkbox"
                className="size-5 shrink-0 accent-primary"
                checked={checks[index]}
                onChange={(e) => void mark(index, e.target.checked)}
              />
              {label}
            </label>
          ))}
        </fieldset>
        <Button variant="outline" onClick={inspectQuestions}>
          Periksa soal dan jawaban
        </Button>
        <p>
          Catatan ini mengikuti isi latihan. Ulangi pemeriksaan setelah soal
          atau cerita diganti. Ini catatan persiapan Anda, bukan persetujuan
          peninjau materi.
        </p>
        <p className="text-muted-foreground">
          Bisa dicoba dengan data contoh. Untuk kelas sungguhan, katalog ini
          masih menunggu pemeriksaan isi dan uji kelas.
        </p>
        <p role="status">{notice}</p>
      </div>
    </details>
  );
}
