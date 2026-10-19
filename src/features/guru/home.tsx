"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useTeacher } from "./app-context";
import { readLibraryDetail } from "@/features/library/read-detail";
import { jakartaDate } from "@/features/library/client";
import { Button } from "@/ui/components/button";
import { capturePairingLink } from "@/features/classroom/pairing-url";
import { OfflineChooser } from "@/features/library/offline-chooser";
import {
  PageHeader,
  ProgressLabel,
  Section,
  StateNotice,
} from "@/ui/components/studio";
import { ToolExplorer } from "@/ui/components/tool-explorer";
import { useClassSpreads, RungRail, type Spread } from "./class-spread";
import {
  ArrowRight,
  ArrowUpRight,
  Presentation,
  Shapes,
  Layers,
  UsersRound,
  Sparkles,
} from "lucide-react";
import { LearningPreview } from "@/ui/components/learning-preview";
import type { LibraryRun } from "@/contracts/library";
import { MotionBoundary } from "@/ui/components/motion-boundary";

function ResumeRow({
  run,
  spread,
  primary,
}: {
  run: LibraryRun;
  spread?: Spread;
  primary?: boolean;
}) {
  return (
    <li>
      <Link
        className="studio-row"
        data-primary-row={primary ? "" : undefined}
        href={`/guru/sesi/${run.id}`}
        title={`${run.classLabel} · ${run.document.title}`}
      >
        <span className="studio-row-icon" aria-hidden>
          {run.position + 1}
        </span>
        <span className="studio-row-content">
          <h2>
            {run.classLabel} · {run.document.title}
          </h2>
          <p>
            {run.mode === "assessment" ? "Cek pemahaman" : "Mengajar"} · Soal{" "}
            {run.position + 1}/{run.document.items.length} ·{" "}
            {run.date.split("-").reverse().join("/")}
          </p>
        </span>
        <RungRail spread={spread} />
        <span
          className="studio-row-action"
          data-row-action
          data-emphasis={primary ? "primary" : undefined}
        >
          Lanjutkan
          <ArrowRight size={18} strokeWidth={1.8} aria-hidden />
        </span>
      </Link>
    </li>
  );
}

export function TeacherHome() {
  const { classes, state, offline, scope } = useTeacher(),
    [pair, setPair] = useState("");
  const [now, setNow] = useState(0);
  useEffect(() => {
    const timer = setTimeout(() => {
      const code = capturePairingLink();
      if (code) setPair(code);
    }, 0);
    return () => clearTimeout(timer);
  }, []);
  useEffect(() => {
    const timer = setTimeout(() => setNow(Date.now()), 0);
    return () => clearTimeout(timer);
  }, []);
  const active = state.runs.filter(
      (r) => r.status === "active" && !r.parentLessonId,
    ),
    last = classes.find((c) => c.id === active[0]?.classId) ?? classes[0];

  const today = now > 0 ? jakartaDate(new Date(now)) : "";
  const closedToday = today
    ? state.runs.find(
        (r) => r.status === "closed" && r.date === today && !r.parentLessonId,
      )
    : undefined;
  // The intake line is read from the run's own detail (the run list deliberately carries no
  // counts), so the numbers on this row are real, never inferred.
  const [intake, setIntake] = useState<{
    read: number;
    total: number;
    review: number;
  }>();
  useEffect(() => {
    if (!closedToday) return;
    let stopped = false;
    void readLibraryDetail(scope, closedToday.id)
      .then(({ detail }) => {
        if (stopped) return;
        setIntake({
          read: detail.responses.length,
          total: detail.run.roster.length,
          review: detail.responses.filter((r) => r.status === "review").length,
        });
      })
      .catch(() => undefined);
    return () => {
      stopped = true;
    };
  }, [closedToday, scope]);
  // The rail is a per-class metric, so each row reads the spread of its own class.
  const spreads = useClassSpreads(scope, classes);
  if (offline) return <OfflineChooser />;
  const hasActive = active.length > 0;
  const practiceHref = `/guru/latihan?mode=${state.sample ? "demo" : "pilot"}${last ? `&class=${last.id}` : ""}`;
  return (
    <div className="space-y-6">
      <PageHeader
        title="Ruang mengajar"
        description={
          state.sample
            ? "Kelas dan soal contoh sudah tersedia."
            : "Pilih kelas, pilih soal, lalu mulai sesi mengajar."
        }
        actions={
          <>
            <Button asChild variant="outline">
              <a href="/layar" target="_blank" rel="noreferrer">
                <Presentation size={20} strokeWidth={1.8} aria-hidden />
                Layar Kelas
              </a>
            </Button>
            {!hasActive && (
              <Button asChild data-emphasis="primary">
                <Link
                  href={last ? `/guru/mulai?class=${last.id}` : "/guru/kelas"}
                >
                  Mulai mengajar
                </Link>
              </Button>
            )}
          </>
        }
      />
      {pair && (
        <p role="status" className="rounded-input bg-pn-teal-100 p-3">
          Layar ditemukan. Pilih atau lanjutkan sesi untuk menyambungkannya.
        </p>
      )}
      <nav className="pn-quick-actions" aria-label="Pintasan kegiatan">
        <Link
          className="pn-quick-action"
          href={last ? `/guru/mulai?class=${last.id}` : "/guru/kelas"}
        >
          <span>
            <Presentation size={23} aria-hidden />
          </span>
          <span>Mulai mengajar</span>
          <ArrowUpRight size={18} aria-hidden />
        </Link>
        <Link className="pn-quick-action" href="/guru/soal">
          <span>
            <Layers size={23} aria-hidden />
          </span>
          <span>Jelajahi soal</span>
          <ArrowUpRight size={18} aria-hidden />
        </Link>
        <Link className="pn-quick-action" href={practiceHref}>
          <span>
            <Shapes size={23} aria-hidden />
          </span>
          <span>Latihan kelompok</span>
          <ArrowUpRight size={18} aria-hidden />
        </Link>
      </nav>
      <section
        className="pn-home-hero"
        aria-label={
          hasActive
            ? "Kegiatan yang sedang berlangsung"
            : "Mulai kegiatan kelas"
        }
      >
        <div>
          <span className="pn-hero-tag">
            <Sparkles size={14} aria-hidden />
            {hasActive
              ? "SIAP DILANJUTKAN"
              : "BELAJAR BERSAMA, SELANGKAH DEMI SELANGKAH"}
          </span>
          <h2>
            {hasActive
              ? active[0].document.title
              : "Bawa rasa ingin tahu ke ruang kelas."}
          </h2>
          <p>
            {hasActive
              ? `${active[0].classLabel} · ${active[0].mode === "assessment" ? "Cek pemahaman" : "Mengajar"}. Lanjutkan kegiatan dari soal terakhir yang Anda buka.`
              : "Satu layar untuk mencoba, berdiskusi, dan memahami. Siapkan kelas dan pilih soal untuk memulai."}
          </p>
          {hasActive && (
            <div className="pn-session-progress">
              <progress
                value={active[0].position + 1}
                max={Math.max(1, active[0].document.items.length)}
                aria-label="Posisi soal dalam sesi"
              />
              <span>
                Soal {active[0].position + 1} dari{" "}
                {active[0].document.items.length}
              </span>
            </div>
          )}
          <Button asChild>
            <Link
              href={
                hasActive
                  ? `/guru/sesi/${active[0].id}`
                  : last
                    ? `/guru/mulai?class=${last.id}`
                    : "/guru/kelas"
              }
            >
              {hasActive
                ? "Lanjutkan sesi"
                : classes.length
                  ? "Siapkan sesi mengajar"
                  : "Buat kelas pertama"}
              <ArrowRight size={17} aria-hidden />
            </Link>
          </Button>
        </div>
        <LearningPreview compact />
      </section>
      {hasActive ? (
        <Section
          id="teacher-home-resume"
          aria-label="Sesi aktif"
          label="Lanjutkan sesi"
          ground="sheet"
        >
          <ul>
            {active.slice(0, 3).map((run) => (
              <ResumeRow
                key={run.id}
                run={run}
                spread={run.classId ? spreads[run.classId] : undefined}
                primary={run.id === active[0].id}
              />
            ))}
          </ul>
          {active.length > 3 && (
            <details>
              <summary className="flex min-h-14 cursor-pointer items-center border-t border-pn-hairline px-4 font-semibold text-pn-teal-700">
                Sesi lainnya ({active.length - 3})
              </summary>
              <ul className="max-h-96 overflow-y-auto overscroll-contain">
                {active.slice(3).map((run) => (
                  <ResumeRow
                    key={run.id}
                    run={run}
                    spread={run.classId ? spreads[run.classId] : undefined}
                  />
                ))}
              </ul>
            </details>
          )}
        </Section>
      ) : (
        <Section label="Sesi hari ini" ground="sheet">
          <div className="p-4">
            <StateNotice
              title="Belum ada sesi hari ini"
              action={
                <Button asChild data-emphasis="primary">
                  {classes.length ? (
                    <Link href={`/guru/mulai?class=${last.id}`}>
                      Mulai mengajar
                    </Link>
                  ) : (
                    <Link href="/guru/kelas">Buat kelas</Link>
                  )}
                </Button>
              }
            >
              {classes.length
                ? "Pilih kelas dan soal, lalu mulai mengajar."
                : "Buat kelas dulu, lalu pilih soal dan mulai mengajar."}
            </StateNotice>
          </div>
        </Section>
      )}
      {closedToday && (
        <Section label="Baru selesai" ground="sheet" data-recently-closed>
          <ul className="studio-row-list">
            <li>
              <Link
                className="studio-row"
                href={`/guru/hasil/${closedToday.id}`}
              >
                <span className="studio-row-icon" aria-hidden>
                  {closedToday.document.items.length}
                </span>
                <span className="studio-row-content">
                  <h2>
                    {closedToday.classLabel} · {closedToday.document.title}
                  </h2>
                  <p>
                    {closedToday.date.split("-").reverse().join("/")} ·{" "}
                    {closedToday.mode === "assessment"
                      ? "Cek pemahaman"
                      : "Mengajar"}{" "}
                    selesai
                    {intake
                      ? ` · ${intake.read}/${intake.total} kartu terbaca · ${intake.review} perlu dicek`
                      : ""}
                  </p>
                </span>
                <span className="studio-row-action" data-row-action>
                  Buka catatan
                </span>
              </Link>
            </li>
          </ul>
        </Section>
      )}

      {classes.length > 0 && (
        <Section
          label="Kelas Anda"
          action={
            <Link href="/guru/kelas">
              Lihat semua <ArrowRight size={16} aria-hidden />
            </Link>
          }
        >
          <div className="pn-home-classes">
            {classes.slice(0, 3).map((c) => (
              <Link
                key={c.id}
                className="pn-class-tile"
                href={`/guru/kelas/${c.id}`}
              >
                <UsersRound size={24} strokeWidth={1.6} aria-hidden />
                <strong>{c.label}</strong>
                <span>
                  Tingkat {c.grade} · {c.count} siswa
                </span>
              </Link>
            ))}
          </div>
        </Section>
      )}

      <Section label="Langkah berikutnya">
        <ul className="studio-row-list">
          <li>
            <Link className="studio-row" href={practiceHref}>
              <span className="studio-row-icon" aria-hidden>
                <Shapes size={22} strokeWidth={1.8} />
              </span>
              <span className="studio-row-content">
                <h2>Latihan kelompok</h2>
                <p>Siapkan kelompok dari hasil cek terakhir.</p>
              </span>
              <span className="studio-row-action" data-row-action>
                Siapkan
                <ArrowRight size={18} strokeWidth={1.8} aria-hidden />
              </span>
            </Link>
          </li>
        </ul>
        {!state.sample && (
          <p className="studio-help mt-3">
            Alur berkelompok saat ini dapat dicoba dengan data contoh.
          </p>
        )}
      </Section>

      <MotionBoundary>
        <Section label="Soal & alat">
          <ProgressLabel index={2} total={4} label="Pilih soal" />
          <details className="mt-3">
            <summary className="min-h-12 cursor-pointer content-center font-semibold text-pn-teal-700">
              Buka alat belajar
            </summary>
            <div className="mt-3">
              <ToolExplorer />
            </div>
          </details>
        </Section>
      </MotionBoundary>
    </div>
  );
}
