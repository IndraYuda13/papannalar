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
import { ArrowRight, Presentation, Shapes } from "lucide-react";
import type { LibraryRun } from "@/contracts/library";
import { MotionBoundary } from "@/ui/components/motion-boundary";
import { useMinWidth } from "@/ui/use-min-width";

/**
 * One row contract (V5): icon · content · rail · action, and the action track never wraps.
 * The rail is §9.1's signature device: the row shows *this* run's class distribution, so the
 * home screen teaches the product's core idea every time it is opened.
 *
 * The top-most active run owns the screen's single primary action (§F A16). It was already
 * *painted* filled (`.studio-row[data-primary-row]`), but nothing carried the measurable
 * attribute, so on a screen with ≥2 runs `[data-emphasis="primary"]` counted 0 — a rule the row
 * asserts but the DOM never exposed. The attribute belongs on the filled action itself, and it
 * must not be a second one: the header's `Mulai mengajar` is only rendered when no run is active.
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
  // ≥1280 is where the re-author puts the two-track canvas in force (D3.2/A44), so that is
  // where the action track shows more of its own resume list. Below it the count is unchanged.
  const resumeRows = useMinWidth(1280) ? WIDE_RESUME_ROWS : RESUME_ROWS;
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
  const active = state.runs.filter((r) => r.status === "active"),
    last = classes.find((c) => c.id === active[0]?.classId) ?? classes[0];
  // Friction 8: a closing teach run used to land on Beranda with no summary at all. The most
  // recently closed run of the day is stated once, with numbers only, and links to its notes
  // when any response exists.
  const today = now > 0 ? jakartaDate(new Date(now)) : "";
  const closedToday = today
    ? state.runs.find((r) => r.status === "closed" && r.date === today)
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
    <>
      {/* v4 (§9.1): `Ruang mengajar`, no eyebrow, no hero, exactly one primary action.
          The board action is a persistent secondary in the header (F3), never a floating link.
          The header spans both tracks: it is the screen's own title, not a track's label. */}
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
      {/* D3.2/A44 — the ≥1280 two-track composition. The action track keeps what the teacher
          came for (the one primary and the resume list); the supporting track carries this
          screen's own remaining content in the ruling's order: the closed-run summary, then
          `Langkah berikutnya`, then `Soal & alat`. Nothing new is invented, no second primary
          is mounted, and no second navigation landmark appears in either track. Below 1280 the
          two tracks simply stack in the same order the phone already reads. */}
      <div data-tracks-shell>
        <div data-tracks="main" className="space-y-6">
          {hasActive ? (
            <Section
              id="teacher-home-resume"
              aria-label="Sesi aktif"
              label="Lanjutkan sesi"
              ground="sheet"
            >
              <ul>
                {active.slice(0, resumeRows).map((run) => (
                  <ResumeRow
                    key={run.id}
                    run={run}
                    spread={run.classId ? spreads[run.classId] : undefined}
                    primary={run.id === active[0].id}
                  />
                ))}
              </ul>
              {active.length > resumeRows && (
                <details>
                  <summary className="flex min-h-14 cursor-pointer items-center border-t border-pn-hairline px-4 font-semibold text-pn-teal-700">
                    Sesi lainnya ({active.length - resumeRows})
                  </summary>
                  <ul className="max-h-96 overflow-y-auto overscroll-contain">
                    {active.slice(resumeRows).map((run) => (
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
                        /* Friction 10: with zero classes the old label promised a session and the
                       destination was a class form. The label now says what the next screen
                       actually is. */
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
        </div>
        <div data-tracks="support" className="space-y-6">
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
          {/* §9.1(c): the workflow entry sits in a shared list, not a Section whose whole body is
          one row (V7/V8's lesson).
          DELIBERATE DEVIATION, recorded for LENS/PRIME: §9.1(d) also lists `Layar Kelas` as a
          secondary row, while F3's resolution promotes the board action into the header. Doing
          both would put two `Layar Kelas` affordances on one screen — precisely the "two
          competing go paths" F4 measured. The header keeps it (always present, on every route);
          this list keeps the one action that has no other home. */}
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
      </div>
    </>
  );
}

/**
 * How many resume rows the action track shows before the rest move behind the disclosure.
 *
 * §J.3's A44 asks for the ≤240 px content tail at 1920×1080, and that is a *composition*
 * requirement: a canvas that stops two-thirds up is the void this re-author is about. The
 * resume list is the page's own content (same rows, same links, same data — no new product), so
 * at ≥1280 — where the re-author is in force and the canvas is genuinely wide — more of it is
 * visible at once, and the rest stays behind the `Sesi lainnya` disclosure exactly as before.
 * Below the boundary the count is unchanged, so the phone entry point is untouched.
 *
 * The number is a real content budget rather than a style, and it is width-driven rather than
 * hard-coded so the phone never receives the desktop document: `useMinWidth` reports `false`
 * until it has measured, which is also the phone-safe server-rendered answer.
 */
const RESUME_ROWS = 3;
const WIDE_RESUME_ROWS = 8;
