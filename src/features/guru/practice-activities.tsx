"use client";
import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { Sparkles, ArrowRight, FlaskConical } from "lucide-react";
import { Button } from "@/ui/components/button";
import type { ClassDto } from "@/contracts/classes";
import type { StudentDto } from "@/contracts/api";
import type { TeacherPackage } from "@/core/package/build";
import { PackageWorkspace } from "@/features/package/package-workspace";
import {
  CycleWorkspace,
  type CycleActions,
} from "@/features/session/cycle-workspace";
import { ActivityDisclosure, openTeacherActivity } from "./activity-disclosure";
import { AiWorkspace } from "./ai-workspace";
import type { StepId } from "@/content/ladder/registry";
export function PracticeActivities({
  ownerId,
  mode,
  detail,
}: {
  ownerId: string;
  mode: "pilot" | "demo";
  detail?: { class: ClassDto; students: StudentDto[] };
}) {
  const [pkg, setPkg] = useState<TeacherPackage>();
  const [selectedStep, setSelectedStep] = useState("");
  const cycleActions = useRef<CycleActions>(null);
  const [starting, setStarting] = useState(false);
  const [session, setSession] = useState<{
    classId: string;
    sessionId: string;
  }>();
  const receiveSession = useCallback(
    (value: { package: TeacherPackage; sessionId: string } | undefined) => {
      setSession(
        value
          ? { classId: value.package.classId, sessionId: value.sessionId }
          : undefined,
      );
      if (value)
        setPkg((current) =>
          current?.id === value.package.id &&
          current.frozen !== value.package.frozen
            ? value.package
            : current,
        );
    },
    [],
  );
  function viewTasks(stepId: StepId) {
    setSelectedStep(stepId);
    openTeacherActivity("teacher-prepare");
    requestAnimationFrame(() => {
      const container = document.getElementById("practice-tasks");
      if (container instanceof HTMLDetailsElement) container.open = true;
      const tasks = document.getElementById("practice-independent");
      if (tasks instanceof HTMLDetailsElement) {
        tasks.open = true;
        tasks.scrollIntoView({ block: "start" });
        tasks.querySelector("summary")?.focus({ preventScroll: true });
      }
    });
  }
  async function beginTeaching() {
    if (starting) return;
    openTeacherActivity("teacher-teach");
    if (session) return;
    setStarting(true);
    try {
      await cycleActions.current?.start();
    } finally {
      setStarting(false);
    }
  }
  return (
    <>
      <nav aria-label="Langkah menyiapkan latihan" className="practice-journey">
        {[
          ["kelas-heading", "1", "Kelas"],
          ["teacher-prepare", "2", "Soal"],
          ["teacher-teach", "3", "Mengajar"],
        ].map(([id, n, label]) => (
          <button
            key={id}
            aria-controls={id}
            aria-label={`Buka langkah ${n}: ${label}`}
            aria-current={
              (n === "1" && !detail) ||
              (n === "2" && detail && !session) ||
              (n === "3" && session)
                ? "step"
                : undefined
            }
            onClick={() => {
              if (id === "kelas-heading")
                document.getElementById(id)?.scrollIntoView({ block: "start" });
              else openTeacherActivity(id);
            }}
          >
            <span aria-hidden>{n}</span>
            {label}
          </button>
        ))}
      </nav>
      <ActivityDisclosure
        id="teacher-prepare"
        title="Siapkan soal"
        description={
          pkg
            ? "Soal siap. Periksa atau ubah bila perlu, lalu mulai mengajar."
            : "Satu tombol untuk menyiapkan soal sesuai kelas."
        }
        initiallyOpen
        scope={{ ownerId, mode }}
      >
        {pkg && (
          <div className="practice-next-action">
            <div>
              <h3 className="font-bold">
                {mode === "pilot"
                  ? "Gunakan kumpulan soal Anda"
                  : session
                    ? "Sesi Anda masih berjalan"
                    : "Soal siap untuk kelas Anda"}
              </h3>
              <p className="text-sm">
                {mode === "pilot"
                  ? "Pilih soal yang sudah siap untuk kelas ini. Latihan otomatis di bawah dapat dicoba dengan data contoh."
                  : session
                    ? "Lanjutkan dari bagian terakhir. Mengubah persiapan tidak mengubah sesi ini."
                    : "Mulai sesi, kemudian sambungkan layar kelas. AI boleh dilewati."}
              </p>
            </div>
            {mode === "demo" ? (
              <Button
                disabled={starting || (!session && pkg.frozen)}
                onClick={() => void beginTeaching()}
              >
                {starting
                  ? "Memulai sesi…"
                  : session
                    ? "Lanjutkan sesi"
                    : "Mulai mengajar"}
                <ArrowRight size={18} aria-hidden />
              </Button>
            ) : (
              <Button asChild>
                <Link
                  href={`/guru/mulai${detail ? `?class=${detail.class.id}` : ""}`}
                  prefetch={false}
                >
                  Mulai mengajar
                  <ArrowRight size={18} aria-hidden />
                </Link>
              </Button>
            )}
          </div>
        )}
        <PackageWorkspace
          key={`package/${ownerId}/${mode}/${detail?.class.id ?? "cached"}`}
          ownerId={ownerId}
          mode={mode}
          students={detail?.students}
          classroom={detail?.class}
          pkg={pkg}
          onPackageChange={setPkg}
          selectedStep={selectedStep}
          onSelectedStepChange={setSelectedStep}
        />
        {pkg && (
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => openTeacherActivity("teacher-ai")}
            >
              <Sparkles size={18} aria-hidden />
              Tambahkan cerita AI
            </Button>
          </div>
        )}
        {!detail && !pkg && (
          <p>Pilih atau buat kelas di atas untuk menyiapkan latihan.</p>
        )}
      </ActivityDisclosure>
      <ActivityDisclosure
        id="teacher-ai"
        title="Cerita & bantuan mengajar (opsional)"
        description="Opsional: pilih soal cerita atau cari cara menjelaskan."
        scope={{ ownerId, mode }}
      >
        <AiWorkspace
          key={`${ownerId}/${mode}`}
          pkg={pkg}
          scope={{ ownerId, mode }}
          onUpdated={setPkg}
          preferredStep={selectedStep}
          onViewTasks={viewTasks}
          session={session}
        />
        {pkg && (
          <Button
            variant="outline"
            onClick={() => openTeacherActivity("teacher-teach")}
          >
            Lanjut ke sesi
            <ArrowRight size={18} aria-hidden />
          </Button>
        )}
      </ActivityDisclosure>
      <ActivityDisclosure
        id="teacher-teach"
        title="Mengajar"
        description="Mulai satu sesi, lalu sambungkan satu layar kelas."
        scope={{ ownerId, mode }}
      >
        {mode !== "demo" && (
          <p className="rounded-input bg-pn-amber-100 p-3 text-sm">
            Isi soal pada latihan ini belum diperiksa oleh peninjau materi.
            Pilih Data contoh untuk mencoba sesi. Untuk memakai kumpulan soal
            Anda di kelas,{" "}
            <Link
              className="font-semibold text-primary underline"
              href="/guru/mulai"
              prefetch={false}
            >
              buka Mulai mengajar
            </Link>
            .
          </p>
        )}
        <CycleWorkspace
          key={`${ownerId}/${mode}/${detail?.class.id ?? "cached"}`}
          scope={{ ownerId, mode }}
          detail={detail}
          preparedPackage={pkg}
          onSessionChange={receiveSession}
          actionsRef={cycleActions}
        />
      </ActivityDisclosure>
      {mode === "demo" && (
        <p className="practice-example-link">
          <FlaskConical size={20} aria-hidden />
          <Link
            href={`/guru/simulasi?mode=demo${detail ? `&class=${detail.class.id}` : ""}`}
            prefetch={false}
          >
            Lihat contoh sesi lengkap dengan jawaban terisi
          </Link>
        </p>
      )}
    </>
  );
}
