"use client";
import { useCallback, useState } from "react";
import Link from "next/link";
import { Sparkles, ArrowRight, FlaskConical } from "lucide-react";
import { Button } from "@/ui/components/button";
import type { ClassDto } from "@/contracts/classes";
import type { StudentDto } from "@/contracts/api";
import type { TeacherPackage } from "@/core/package/build";
import { PackageWorkspace } from "@/features/package/package-workspace";
import { CycleWorkspace } from "@/features/session/cycle-workspace";
import { OralWorkspace } from "./oral-workspace";
import { ActivityDisclosure, openTeacherActivity } from "./activity-disclosure";
import { AiWorkspace } from "./ai-workspace";
import type { StepId } from "@/content/ladder/registry";
export function PracticeActivities({
  ownerId,
  mode,
  detail,
  labels,
}: {
  ownerId: string;
  mode: "pilot" | "demo";
  detail?: { class: ClassDto; students: StudentDto[] };
  labels: Record<string, string>;
}) {
  const [pkg, setPkg] = useState<TeacherPackage>();
  const [selectedStep, setSelectedStep] = useState("");
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
      const tasks = document.getElementById("practice-independent");
      if (tasks instanceof HTMLDetailsElement) {
        tasks.open = true;
        tasks.scrollIntoView({ block: "start" });
        tasks.querySelector("summary")?.focus({ preventScroll: true });
      }
    });
  }
  return (
    <>
      <nav aria-label="Langkah menyiapkan latihan" className="practice-journey">
        {[
          ["teacher-prepare", "1", "Persiapan"],
          ["teacher-ai", "2", "Cerita & bantuan"],
          ["teacher-teach", "3", "Coba sesi"],
        ].map(([id, n, label]) => (
          <button
            key={id}
            aria-controls={id}
            aria-label={`Buka langkah ${n}: ${label}`}
            onClick={() => openTeacherActivity(id)}
          >
            <span aria-hidden>{n}</span>
            {label}
          </button>
        ))}
      </nav>
      <ActivityDisclosure
        id="teacher-prepare"
        title="1. Siapkan latihan"
        description="Tentukan cara cek, pilih pembuka diskusi dan periksa soal."
        initiallyOpen
        scope={{ ownerId, mode }}
      >
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
            <Button onClick={() => openTeacherActivity("teacher-teach")}>
              Coba sesi dengan soal ini
              <ArrowRight size={18} aria-hidden />
            </Button>
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
        title="2. Tambahkan cerita & bantuan mengajar"
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
        title="3. Coba mengajar dengan soal ini"
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
      <ActivityDisclosure
        id="teacher-oral"
        title="Cek pemahaman secara lisan"
        description="Ajukan pertanyaan satu per satu tanpa Kartu Nalar."
        scope={{ ownerId, mode }}
      >
        <OralWorkspace
          key={`oral/${ownerId}/${mode}/${detail?.class.id ?? "cached"}`}
          ownerId={ownerId}
          mode={mode}
          detail={detail}
          labels={labels}
        />
      </ActivityDisclosure>
    </>
  );
}
