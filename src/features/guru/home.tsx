"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useTeacher } from "./app-context";
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
import { ArrowRight, Presentation, Shapes } from "lucide-react";
import type { LibraryRun } from "@/contracts/library";
import { MotionBoundary } from "@/ui/components/motion-boundary";

/**
 * One row contract (V5): icon · content · rail · action, and the action track never wraps.
 * The rail is §9.1's signature device: the row shows *this* run's class distribution, so the
 * home screen teaches the product's core idea every time it is opened.
 */
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
        <span className="studio-row-action" data-row-action>
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
  useEffect(() => {
    const timer = setTimeout(() => {
      const code = capturePairingLink();
      if (code) setPair(code);
    }, 0);
    return () => clearTimeout(timer);
  }, []);
  const active = state.runs.filter((r) => r.status === "active"),
    last = classes.find((c) => c.id === active[0]?.classId) ?? classes[0];
  // The rail is a per-class metric, so each row reads the spread of its own class.
  const spreads = useClassSpreads(scope, classes);
  if (offline) return <OfflineChooser />;
  const hasActive = active.length > 0;
  const practiceHref = `/guru/latihan?mode=${state.sample ? "demo" : "pilot"}${last ? `&class=${last.id}` : ""}`;
  return (
    <div className="space-y-6">
      {/* v4 (§9.1): `Ruang mengajar`, no eyebrow, no hero, exactly one primary action.
          The board action is a persistent secondary in the header (F3), never a floating link. */}
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
              <Button asChild>
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
                <Button asChild>
                  <Link
                    href={last ? `/guru/mulai?class=${last.id}` : "/guru/kelas"}
                  >
                    Mulai mengajar
                  </Link>
                </Button>
              }
            >
              Pilih kelas dan soal, lalu mulai mengajar.
            </StateNotice>
          </div>
        </Section>
      )}
      {/* §9.1(c): the two workflow entries sit in one shared list, not one Section each —
          a Section whose whole body is a single row is just a bigger row (V7/V8's lesson). */}
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
          <li>
            <a
              className="studio-row"
              href="/layar"
              target="_blank"
              rel="noreferrer"
            >
              <span className="studio-row-icon" aria-hidden>
                <Presentation size={22} strokeWidth={1.8} />
              </span>
              <span className="studio-row-content">
                <h2>Layar Kelas</h2>
                <p>Untuk papan atau proyektor di kelas.</p>
              </span>
              <span className="studio-row-action" data-row-action>
                Buka
                <ArrowRight size={18} strokeWidth={1.8} aria-hidden />
              </span>
            </a>
          </li>
        </ul>
        {!state.sample && (
          <p className="studio-help mt-3">
            Alur berkelompok saat ini dapat dicoba dengan data contoh.
          </p>
        )}
      </Section>
      {/* §9.1(e): the tool explorer is present but collapsed, so it never competes with the
          one primary action for the first screenful. It is the screen's own tool shelf, so the
          section label is its heading — no second "Jelajahi alat belajar" heading inside. */}
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
