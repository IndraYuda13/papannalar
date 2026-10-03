"use client";
import { useEffect, useState } from "react";
import type { ClassDto } from "@/contracts/classes";
import type { StudentDto } from "@/contracts/api";
import {
  buildPackage,
  replacePackageQuestion,
  type TeacherPackage,
  type PackageVariant,
} from "@/core/package/build";
import { createPackageRepository } from "@/local/packages";
import { loadPackagePlacements } from "@/features/oral/package-placement";
import { Button } from "@/ui/components/button";
import { MathPrompt } from "@/ui/components/math-prompt";
import type { GeneratedQuestion } from "@/content/templates/types";
import { getStep } from "@/content/ladder/registry";

const field = "min-h-12 rounded-input border border-pn-ink-400 bg-white px-3";
const freshSeed = () => crypto.getRandomValues(new Uint32Array(1))[0];
export function PackageWorkspace({
  ownerId,
  mode,
  classroom,
  students = [],
  pkg,
  onPackageChange: setPkg,
}: {
  ownerId: string;
  mode: "demo" | "pilot";
  classroom?: ClassDto;
  students?: readonly StudentDto[];
  pkg?: TeacherPackage;
  onPackageChange: (value: TeacherPackage | undefined) => void;
}) {
  const [variant, setVariant] = useState<PackageVariant>(
    classroom && classroom.grade <= 3 ? "oral" : "initial",
  );
  const [selectedStep, setSelectedStep] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    const repo = createPackageRepository({ ownerId, mode });
    void repo
      .latest(classroom?.id)
      .then((last) => {
        if (active) {
          setPkg(last);
          setSelectedStep(last?.activities[0].stepId ?? "");
        }
      })
      .catch(() => {
        if (active)
          setMessage(
            "Paket lokal belum dapat dibaca. Periksa ruang penyimpanan.",
          );
      })
      .finally(() => repo.close());
    return () => {
      active = false;
    };
  }, [ownerId, mode, classroom?.id, setPkg]);
  async function prepare() {
    if (!classroom) return;
    setBusy(true);
    setMessage("");
    const repo = createPackageRepository({ ownerId, mode });
    try {
      const occupied = await loadPackagePlacements(
        { ownerId, mode },
        classroom.id,
        students,
      );
      if ((variant === "weekly" || variant === "short") && !occupied.length) {
        setMessage(
          "Belum ada penempatan. Siapkan Cek Awal atau Cek Lisan terlebih dahulu.",
        );
        return;
      }
      const value = buildPackage({
        id: crypto.randomUUID(),
        classId: classroom.id,
        grade: classroom.grade,
        variant,
        seed: freshSeed(),
        occupied,
      });
      await repo.save(value, 0);
      setPkg(value);
      setSelectedStep(
        value.activities.find((a) => a.stepId === "D1")?.stepId ??
          value.activities[0].stepId,
      );
      setMessage(
        "Paket tersimpan lokal dan dapat dibuka tanpa internet. Konten draft menunggu review.",
      );
    } catch {
      setMessage(
        "Paket belum tersimpan. Periksa penyimpanan dan coba lagi; paket sebelumnya tetap ada.",
      );
    } finally {
      repo.close();
      setBusy(false);
    }
  }
  async function replace(id: string) {
    if (!pkg) return;
    setBusy(true);
    const repo = createPackageRepository({ ownerId, mode });
    try {
      const next = replacePackageQuestion(pkg, id, freshSeed());
      await repo.save(next, pkg.revision);
      setPkg(next);
      setMessage("Satu soal diganti. Soal lainnya tetap.");
    } catch {
      setMessage(
        "Soal belum dapat diganti. Paket yang sudah dipakai terkunci; pilihan variasi pada langkah ini juga terbatas.",
      );
    } finally {
      repo.close();
      setBusy(false);
    }
  }
  function preview(q: GeneratedQuestion, index: number) {
    return (
      <li
        key={q.id}
        className="space-y-2 rounded-input border border-pn-ink-400/30 bg-white p-3"
      >
        <p className="font-semibold">
          {index + 1}. <MathPrompt value={q.prompt} />
        </p>
        <p>{q.options.map((o) => `${o.label}. ${o.text}`).join(" · ")} · ?</p>
        {q.story && (
          <p>Cerita dipilih AI dari frame terkurasi; angka diperiksa kode.</p>
        )}
        <details>
          <summary className="min-h-12 cursor-pointer">
            Kunci dan alasan guru
          </summary>
          <p>
            Kunci {q.answerKey} ·{" "}
            {q.reasons.find((r) => r.label === q.reasonKey)?.text}
          </p>
          <ol className="list-inside list-decimal">
            {q.hints.map((h) => (
              <li key={h}>{h}</li>
            ))}
          </ol>
        </details>
        <Button
          variant="outline"
          disabled={busy || pkg?.frozen}
          onClick={() => void replace(q.id)}
        >
          Ganti soal {index + 1}
        </Button>
      </li>
    );
  }
  const activity =
    pkg?.activities.find((a) => a.stepId === selectedStep) ??
    pkg?.activities[0];
  async function printIndependent() {
    if (!activity || !pkg) return;
    setBusy(true);
    try {
      const [{ createIndependentPdf }, response] = await Promise.all([
        import("./independent-pdf"),
        fetch("/fonts/atkinson-card.woff"),
      ]);
      if (!response.ok) throw new Error();
      const bytes = await createIndependentPdf(
        activity,
        pkg.grade,
        new Uint8Array(await response.arrayBuffer()),
      );
      const url = URL.createObjectURL(
        new Blob([new Uint8Array(bytes)], { type: "application/pdf" }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = "papannalar-tugas-mandiri.pdf";
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMessage(
        "PDF siap. Gunakan satu lembar untuk dua siswa; cetak sesuai kebutuhan kelompok.",
      );
    } catch {
      setMessage(
        "Cetakan belum tersedia. Buka ulang saat online untuk menyiapkan font dan materi.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      aria-label="Paket Sesi"
      className="space-y-4 rounded-kartu border border-primary/30 bg-white p-4"
    >
      <h3 className="text-xl font-bold">Materi latihan</h3>
      <p className="text-sm">
        Siapkan sebelum kelas. Soal, tugas, petunjuk dan kartu keluar tersedia
        offline.
      </p>
      {classroom && (
        <div className="flex flex-wrap gap-2">
          <label className="flex flex-col gap-1">
            Jenis paket
            <select
              aria-label="Jenis paket"
              className={field}
              value={variant}
              onChange={(e) => setVariant(e.target.value as PackageVariant)}
            >
              <option value="initial">Cek Awal · 10 soal</option>
              <option value="weekly">
                {classroom.grade <= 3
                  ? "Mingguan lisan · level terakhir"
                  : "Mingguan · 5 soal"}
              </option>
              <option value="oral">Cek Lisan</option>
              <option value="short">Sesi Singkat</option>
            </select>
          </label>
          <Button disabled={busy} onClick={() => void prepare()}>
            Siapkan Paket Sesi
          </Button>
        </div>
      )}
      {pkg && (
        <>
          <p className="rounded-input bg-pn-amber-100 p-3">
            Materi percobaan · belum disahkan untuk kelas sungguhan. Versi{" "}
            {pkg.revision}
            {pkg.frozen ? " · terkunci" : ""}.
          </p>
          <h4 className="font-bold">Pembuka Bermakna</h4>
          <p>{pkg.opening.prompt}</p>
          <p>Lanjutan: {pkg.opening.followup}</p>
          <p>Tujuan: {pkg.opening.objective}</p>
          {pkg.oralGeneralActivity && (
            <div>
              <p>{pkg.oralGeneralActivity}</p>
              <p className="text-3xl" aria-label="Dua belas benda contoh">
                ● ● ● ●<br />● ● ● ●<br />● ● ● ●
              </p>
            </div>
          )}
          <details>
            <summary className="min-h-12 cursor-pointer font-bold">
              Pratinjau soal cek ({pkg.assessment.length})
            </summary>
            <ol className="space-y-3">{pkg.assessment.map(preview)}</ol>
          </details>
          <label className="flex flex-col gap-1">
            Materi untuk guru
            <select
              aria-label="Materi paket"
              value={activity?.stepId ?? ""}
              className={field}
              onChange={(e) => setSelectedStep(e.target.value)}
            >
              {pkg.activities.map((a) => (
                <option key={a.stepId} value={a.stepId}>
                  {getStep(a.stepId).label} ·{" "}
                  {a.interactiveSupport === "unavailable"
                    ? "alat belum tersedia"
                    : "alat tersedia"}
                </option>
              ))}
            </select>
          </label>
          {activity && (
            <>
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => void printIndependent()}
              >
                Unduh tugas mandiri PDF
              </Button>
              {activity.interactiveSupport === "unavailable" && (
                <p role="note">
                  Alat interaktif untuk materi ini belum tersedia. Soal dapat
                  dipratinjau; cakupan interaktif belum lengkap.
                </p>
              )}
              <details>
                <summary className="min-h-12 cursor-pointer font-bold">
                  Tugas Papan ({activity.board.length})
                </summary>
                <ol className="space-y-3">{activity.board.map(preview)}</ol>
              </details>
              <details>
                <summary className="min-h-12 cursor-pointer font-bold">
                  Mandiri · 3 wajib + 1 boleh
                </summary>
                <ol className="space-y-3">
                  {[...activity.independent, activity.optional].map(preview)}
                </ol>
              </details>
              <details>
                <summary className="min-h-12 cursor-pointer font-bold">
                  Contoh terbimbing dan kartu keluar
                </summary>
                <ol className="space-y-3">
                  {[activity.guided, activity.exit, activity.exitContext].map(
                    preview,
                  )}
                </ol>
                <p>
                  Alasan exit:{" "}
                  {activity.exit.reasons
                    .map((r) => `${r.label}. ${r.text}`)
                    .join(" · ")}
                </p>
              </details>
            </>
          )}
        </>
      )}
      <p role="status">{message}</p>
    </section>
  );
}
