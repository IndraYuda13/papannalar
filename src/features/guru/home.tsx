"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useTeacher } from "./app-context";
import { Button } from "@/ui/components/button";
import { panel } from "@/features/library/client";
import { capturePairingLink } from "@/features/classroom/pairing-url";
import { OfflineChooser } from "@/features/library/offline-chooser";
import { PageHeader, WorkflowSteps } from "@/ui/components/studio";
import { ToolExplorer } from "@/ui/components/tool-explorer";
import { MotionBoundary } from "@/ui/components/motion-boundary";
import type { LibraryRun } from "@/contracts/library";
import { BookOpen, Presentation, Sparkles, ArrowRight } from "lucide-react";
function ResumeLesson({ run: r }: { run: LibraryRun }) {
  return (
    <li>
      <Link
        className="flex min-h-16 flex-wrap items-center justify-between gap-2 rounded-input border p-3"
        href={`/guru/sesi/${r.id}`}
      >
        <span>
          <b>{r.classLabel}</b> · {r.document.title}
          <small className="block text-muted-foreground">
            {r.mode === "assessment" ? "Cek pemahaman" : "Mengajar"} · Soal{" "}
            {r.position + 1}/{r.document.items.length} ·{" "}
            {r.date.split("-").reverse().join("/")}
          </small>
        </span>
        <span className="font-semibold text-primary">Lanjutkan →</span>
      </Link>
    </li>
  );
}
export function TeacherHome() {
  const { classes, state, offline } = useTeacher(),
    [pair, setPair] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => {
      const code = capturePairingLink();
      if (code) setPair(code);
    }, 0);
    return () => clearTimeout(timer);
  }, []);
  const active = state.runs.filter((r) => r.status === "active"),
    last = classes.find((c) => c.id === active[0]?.classId) ?? classes[0];
  if (offline) return <OfflineChooser />;
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Satu papan, setiap siswa belajar"
        title="Siap belajar hari ini?"
        description={
          state.sample
            ? "Kelas dan soal contoh sudah tersedia. Mulai dari satu sesi untuk mencoba cara mengajar."
            : "Pilih kelas, pilih soal, lalu mulai sesi mengajar."
        }
        actions={
          <Button asChild>
            <Link href={last ? `/guru/mulai?class=${last.id}` : "/guru/kelas"}>
              Mulai mengajar
            </Link>
          </Button>
        }
      />
      <WorkflowSteps
        steps={["Pilih kelas", "Pilih soal", "Mengajar", "Lihat hasil"]}
      />
      {pair && (
        <p role="status" className="rounded-input bg-pn-teal-100 p-3">
          Layar ditemukan. Pilih atau lanjutkan sesi untuk menyambungkannya.
        </p>
      )}
      {active.length > 0 && (
        <section
          id="teacher-home-resume"
          aria-label="Sesi aktif"
          className={`${panel} studio-resume`}
        >
          <h2 className="text-xl font-bold">Lanjutkan sesi</h2>
          <ul className="space-y-3">
            {active.slice(0, 3).map((r) => (
              <ResumeLesson key={r.id} run={r} />
            ))}
          </ul>
          {active.length > 3 && (
            <details>
              <summary className="flex min-h-12 cursor-pointer items-center font-semibold text-primary">
                Sesi lainnya ({active.length - 3})
              </summary>
              <ul className="max-h-96 space-y-3 overflow-y-auto overscroll-contain">
                {active.slice(3).map((r) => (
                  <ResumeLesson key={r.id} run={r} />
                ))}
              </ul>
            </details>
          )}
        </section>
      )}
      <div className="grid gap-4 sm:grid-cols-2" aria-label="Pilih kegiatan">
        <section className={`${panel} flex flex-col gap-4`}>
          <div className="space-y-3 min-w-0">
            <h2 className="flex items-center gap-3 text-xl font-bold">
              <span className="activity-icon" aria-hidden>
                <BookOpen size={24} strokeWidth={1.8} />
              </span>
              Mengajar dengan soal pilihan
            </h2>
            <p className="text-muted-foreground">
              Gunakan soal siap pakai atau buat soal sendiri, lalu tampilkan di
              Layar Kelas.
            </p>
            {last && (
              <Link
                className="inline-flex min-h-12 items-center text-primary underline"
                href={`/guru/kelas/${last.id}`}
              >
                Buka kelas {last.label}
              </Link>
            )}
          </div>
          <Button asChild variant="outline" className="mt-auto">
            <Link href="/guru/soal">
              Pilih soal
              <ArrowRight size={18} aria-hidden />
            </Link>
          </Button>
        </section>
        <section className={`${panel} flex flex-col gap-4`}>
          <h2 className="flex items-center gap-3 text-xl font-bold">
            <span className="activity-icon" aria-hidden>
              <Sparkles size={24} />
            </span>
            Belajar berkelompok
          </h2>
          <p>
            Cari tahu siswa yang perlu bantuan, lalu siapkan kegiatan sesuai
            kebutuhannya. Anda akan dipandu dari pemeriksaan jawaban sampai
            pembagian kelompok.
          </p>
          {!state.sample && (
            <p className="text-sm text-muted-foreground">
              Alur berkelompok saat ini dapat dicoba dengan data contoh.
            </p>
          )}
          <Button asChild variant="outline" className="mt-auto">
            <Link
              href={`/guru/latihan?mode=${state.sample ? "demo" : "pilot"}${last ? `&class=${last.id}` : ""}`}
            >
              Siapkan belajar berkelompok
              <ArrowRight size={18} aria-hidden />
            </Link>
          </Button>
        </section>
      </div>
      <MotionBoundary>
        <section className="flex flex-wrap items-center justify-between gap-3 rounded-kartu bg-pn-teal-100 p-5">
          <div>
            <h2 className="flex items-center gap-2 font-bold">
              <Presentation size={24} className="text-primary" aria-hidden />
              Layar Kelas
            </h2>
            <p className="text-sm">
              Buka pada papan atau proyektor. Sambungkan dari sesi mengajar.
            </p>
          </div>
          <Button asChild variant="outline">
            <a href="/layar" target="_blank" rel="noreferrer">
              Buka Layar Kelas
            </a>
          </Button>
        </section>
      </MotionBoundary>
      <ToolExplorer />
    </div>
  );
}
