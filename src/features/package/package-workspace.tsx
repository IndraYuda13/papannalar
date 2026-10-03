"use client";
import { useEffect, useState } from "react";
import { FilePlus2, MessageCircle, Download } from "lucide-react";
import type { ClassDto } from "@/contracts/classes";
import type { StudentDto } from "@/contracts/api";
import {
  buildPackage,
  replacePackageQuestion,
  changePackageOpening,
  type TeacherPackage,
  type PackageVariant,
} from "@/core/package/build";
import { createPackageRepository } from "@/local/packages";
import { loadPackagePlacements } from "@/features/oral/package-placement";
import { Button } from "@/ui/components/button";
import { MathPrompt } from "@/ui/components/math-prompt";
import type { GeneratedQuestion } from "@/content/templates/types";
import { getStep, STEP_IDS, type StepId } from "@/content/ladder/registry";
import { getClassTarget } from "@/content/ladder/targets";
import { CONTEXTS } from "@/content/contexts/registry";

const field = "min-h-12 rounded-input border border-pn-ink-400 bg-white px-3";
const freshSeed = () => crypto.getRandomValues(new Uint32Array(1))[0];
export function PackageWorkspace({
  ownerId,
  mode,
  classroom,
  students = [],
  pkg,
  onPackageChange: setPkg,
  selectedStep,
  onSelectedStepChange: setSelectedStep,
  purpose = "session",
}: {
  ownerId: string;
  mode: "demo" | "pilot";
  classroom?: ClassDto;
  students?: readonly StudentDto[];
  pkg?: TeacherPackage;
  onPackageChange: (value: TeacherPackage | undefined) => void;
  selectedStep: string;
  onSelectedStepChange: (value: string) => void;
  purpose?: "session" | "extra";
}) {
  const [variant, setVariant] = useState<PackageVariant>(
    classroom && classroom.grade <= 3 ? "oral" : "initial",
  );
  const [openingStep, setOpeningStep] = useState<StepId>(
    classroom && classroom.grade >= 7
      ? "D1"
      : getClassTarget(classroom?.grade ?? 1).stepId,
  );
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
          setSelectedStep(
            last?.activities.find((a) => a.stepId === "D1")?.stepId ??
              last?.activities[0].stepId ??
              "",
          );
          if (last)
            setOpeningStep(
              STEP_IDS.find(
                (s) => CONTEXTS[s].opening === last.opening.prompt,
              ) ?? last.target,
            );
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
  }, [ownerId, mode, classroom?.id, setPkg, setSelectedStep]);
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
          "Belum ada hasil cek siswa. Pilih Cek pertama, atau lakukan cek secara lisan, sebelum menyiapkan latihan lanjutan.",
        );
        return;
      }
      const original = buildPackage({
        id: crypto.randomUUID(),
        classId: classroom.id,
        grade: classroom.grade,
        variant,
        seed: freshSeed(),
        occupied,
      });
      const value = original.activities.some((a) => a.stepId === openingStep)
        ? changePackageOpening(original, openingStep)
        : original;
      setOpeningStep(
        STEP_IDS.find((s) => CONTEXTS[s].opening === value.opening.prompt) ??
          value.target,
      );
      await repo.save(value, 0);
      setPkg(value);
      setSelectedStep(
        value.activities.find((a) => a.stepId === "D1")?.stepId ??
          value.activities[0].stepId,
      );
      setMessage(
        "Latihan tersimpan di perangkat ini. Periksa soal di bawah, tambahkan cerita bila perlu, lalu coba sesi.",
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
  async function changeOpening(value: StepId) {
    setOpeningStep(value);
    if (!pkg) return;
    setBusy(true);
    const repo = createPackageRepository({ ownerId, mode });
    try {
      const next = changePackageOpening(pkg, value);
      await repo.save(next, pkg.revision);
      setPkg(next);
      setMessage(
        "Pertanyaan pembuka diganti sesuai topik yang dipilih. Soal cek dan tugas tetap sama.",
      );
    } catch {
      setOpeningStep(
        STEP_IDS.find((s) => CONTEXTS[s].opening === pkg.opening.prompt) ??
          pkg.target,
      );
      setMessage(
        "Pembuka belum berubah. Latihan sudah digunakan atau berubah di tab lain.",
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
          <p className="text-sm text-primary">
            Cerita tersimpan · angka dan jawaban tetap sama.
          </p>
        )}
        <details>
          <summary className="min-h-12 cursor-pointer">
            Jawaban dan petunjuk untuk guru
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
      <h3 className="text-xl font-bold">
        {purpose === "extra"
          ? "Soal tambahan untuk contoh ini"
          : "Soal untuk sesi Anda"}
      </h3>
      <p className="text-sm">
        {purpose === "extra"
          ? "Siapkan tugas cetak dan pertanyaan untuk cek akhir. Pembuka dan soal cek pada sesi contoh tetap memakai soal bawaan."
          : "Latihan berisi pertanyaan pembuka, soal untuk memeriksa pemahaman, dan tugas untuk kegiatan kelompok."}
      </p>
      {classroom && (
        <div className="practice-prepare-fields">
          <label className="practice-field">
            Cara memeriksa pemahaman
            <select
              aria-label="Jenis paket"
              className={field}
              value={variant}
              onChange={(e) => setVariant(e.target.value as PackageVariant)}
            >
              <option value="initial">Cek pertama · 10 soal</option>
              <option value="weekly">
                {classroom.grade <= 3
                  ? "Cek lanjutan · secara lisan"
                  : "Cek lanjutan · 5 soal"}
              </option>
              <option value="oral">Cek secara lisan</option>
              <option value="short">Latihan singkat</option>
            </select>
          </label>
          <Button
            className="practice-prepare-action"
            disabled={busy}
            onClick={() => void prepare()}
          >
            <FilePlus2 size={18} aria-hidden />
            {busy ? "Menyiapkan…" : pkg ? "Buat latihan baru" : "Siapkan soal"}
          </Button>
          <p className="text-sm text-muted-foreground sm:col-span-2">
            {variant === "initial"
              ? "Untuk sesi pertama: periksa pemahaman siswa sebelum membagi kelompok."
              : variant === "oral"
                ? "Guru bertanya langsung kepada siswa. Tidak memakai lembar jawaban."
                : "Memakai hasil cek sebelumnya untuk menyiapkan latihan lanjutan."}
          </p>
        </div>
      )}
      {pkg && (
        <>
          <details className="text-sm">
            <summary className="min-h-12 cursor-pointer">
              Tentang materi ini{pkg.frozen ? " · sedang digunakan" : ""}
            </summary>
            <p>
              Materi ini untuk mencoba alur aplikasi. Isi soal belum diperiksa
              oleh peninjau materi, sehingga belum dapat dipakai pada kelas
              sungguhan. Versi {pkg.revision}.{" "}
              {pkg.frozen
                ? "Soal dikunci karena sudah digunakan dalam sesi; buat latihan baru untuk mengubahnya."
                : "Anda masih dapat mengganti soal sebelum memulai sesi."}
            </p>
          </details>
          {pkg.frozen && (
            <p className="practice-feedback">
              Soal sudah digunakan dalam sesi. Buat latihan baru untuk
              mengubahnya; sesi yang sedang berjalan tetap memakai soal ini.
            </p>
          )}
          <section
            aria-label="Pertanyaan pembuka diskusi"
            className="practice-opening"
          >
            <h4 className="flex items-center gap-2 font-bold">
              <MessageCircle size={20} aria-hidden />
              Pertanyaan pembuka diskusi
            </h4>
            <p className="text-sm text-muted-foreground">
              Ajukan sebelum soal cek untuk mengajak siswa berpikir. Jawaban
              pembuka ini tidak dinilai.
            </p>
            <label className="practice-field">
              Topik pembuka
              <select
                aria-label="Topik pembuka"
                value={openingStep}
                disabled={busy || pkg.frozen}
                onChange={(e) => void changeOpening(e.target.value as StepId)}
              >
                {pkg.activities.map((a) => (
                  <option key={a.stepId} value={a.stepId}>
                    {getStep(a.stepId).label}
                  </option>
                ))}
              </select>
            </label>
            <p className="text-lg font-semibold">{pkg.opening.prompt}</p>
            <details>
              <summary className="min-h-12 cursor-pointer font-semibold">
                Panduan diskusi untuk guru
              </summary>
              <p>Tanyakan setelah siswa mencoba: {pkg.opening.followup}</p>
              <p>
                Hubungkan dengan kehidupan sehari-hari: {pkg.opening.objective}
              </p>
            </details>
          </section>
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
              Soal cek pemahaman ({pkg.assessment.length})
            </summary>
            <ol className="space-y-3">{pkg.assessment.map(preview)}</ol>
          </details>
          <label className="flex flex-col gap-1">
            Topik tugas kelompok
            <select
              aria-label="Materi paket"
              value={activity?.stepId ?? ""}
              className={field}
              onChange={(e) => setSelectedStep(e.target.value)}
            >
              {pkg.activities.map((a) => (
                <option key={a.stepId} value={a.stepId}>
                  {getStep(a.stepId).label}
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
                <Download size={18} aria-hidden />
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
                  Soal untuk layar kelas ({activity.board.length})
                </summary>
                <ol className="space-y-3">{activity.board.map(preview)}</ol>
              </details>
              <details id="practice-independent">
                <summary className="min-h-12 cursor-pointer font-bold">
                  Tugas mandiri · 3 soal + 1 tambahan
                </summary>
                <ol className="space-y-3">
                  {[...activity.independent, activity.optional].map(preview)}
                </ol>
              </details>
              <details>
                <summary className="min-h-12 cursor-pointer font-bold">
                  Contoh untuk dibahas bersama & cek akhir
                </summary>
                <ol className="space-y-3">
                  {[activity.guided, activity.exit, activity.exitContext].map(
                    preview,
                  )}
                </ol>
                <p>
                  Pilihan alasan pada cek akhir:{" "}
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
