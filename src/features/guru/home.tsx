"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useTeacher } from "./app-context";
import { Button } from "@/ui/components/button";
import { panel } from "@/features/library/client";
import { capturePairingLink } from "@/features/classroom/pairing-url";
import { OfflineChooser } from "@/features/library/offline-chooser";
import { PageHeader } from "@/ui/components/studio";
import { ToolPoster } from "@/ui/components/decorative-scene";
import { ToolExplorer } from "@/ui/components/tool-explorer";
import { MotionBoundary } from "@/ui/components/motion-boundary";
import { BookOpen, Presentation } from "lucide-react";
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
        description="Lanjutkan yang sedang berjalan, atau siapkan pengalaman belajar baru."
        actions={
          <Button asChild>
            <Link href={last ? `/guru/mulai?class=${last.id}` : "/guru/kelas"}>
              Mulai mengajar
            </Link>
          </Button>
        }
      />
      {pair && (
        <p role="status" className="rounded-input bg-pn-teal-100 p-3">
          Layar ditemukan. Pilih atau lanjutkan sesi untuk menyambungkannya.
        </p>
      )}
      {active.length > 0 && (
        <section aria-label="Sesi aktif" className={`${panel} studio-resume`}>
          <h2 className="text-xl font-bold">Lanjutkan sesi</h2>
          <ul className="space-y-3">
            {active.map((r) => (
              <li key={r.id}>
                <Link
                  className="flex min-h-16 flex-wrap items-center justify-between gap-2 rounded-input border p-3"
                  href={`/guru/sesi/${r.id}`}
                >
                  <span>
                    <b>{r.classLabel}</b> · {r.document.title}
                    <small className="block text-muted-foreground">
                      {r.mode === "assessment" ? "Cek pemahaman" : "Mengajar"} ·
                      Soal {r.position + 1}/{r.document.items.length}
                    </small>
                  </span>
                  <span className="font-semibold text-primary">
                    Lanjutkan →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      <section className={`${panel} studio-start-card`}>
        <div className="space-y-3 min-w-0">
          <h2 className="flex items-center gap-3 text-xl font-bold">
            <span className="activity-icon" aria-hidden>
              <BookOpen size={24} strokeWidth={1.8} />
            </span>
            Mulai dari kelas Anda
          </h2>
          <p className="text-muted-foreground">
            Pilih kelas dan soal untuk mulai mengajar.
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
        <ToolPoster asset="learning-board" />
      </section>
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
