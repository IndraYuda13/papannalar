"use client";
import { useState } from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Button } from "@/ui/components/button";
import type { ClassDto } from "@/contracts/classes";
import type { StudentDto } from "@/contracts/api";
import type { TeacherPackage } from "@/core/package/build";
import { PackageWorkspace } from "@/features/package/package-workspace";
import { SessionWorkspace } from "@/features/session/session-workspace";
import { CycleWorkspace } from "@/features/session/cycle-workspace";
import { OralWorkspace } from "./oral-workspace";
import { ActivityDisclosure, openTeacherActivity } from "./activity-disclosure";
import { AiWorkspace } from "./ai-workspace";
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
  return (
    <>
      <ActivityDisclosure
        id="teacher-prepare"
        title="1. Siapkan latihan"
        description="Pilih jenis cek, periksa soal dan cetak tugas bila diperlukan."
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
        />
        {pkg && (
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => openTeacherActivity("teacher-teach")}>
              Lanjut ke kegiatan
            </Button>
            <Button
              variant="outline"
              onClick={() => openTeacherActivity("teacher-ai")}
            >
              <Sparkles size={18} aria-hidden />
              Coba bantuan AI
            </Button>
          </div>
        )}
        {!detail && !pkg && (
          <p>Pilih atau buat kelas di atas untuk menyiapkan latihan.</p>
        )}
      </ActivityDisclosure>
      <ActivityDisclosure
        id="teacher-teach"
        title="2. Jalankan kegiatan"
        description="Mulai sesi, sambungkan layar dan periksa jawaban."
        scope={{ ownerId, mode }}
      >
        {mode !== "demo" && (
          <p className="rounded-input bg-pn-amber-100 p-3 text-sm">
            Materi latihan ini masih percobaan dan belum disahkan untuk kelas
            sungguhan. Untuk mencoba, pilih Data contoh di atas. Untuk mengajar
            dengan materi yang sudah siap,{" "}
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
        />
        <ActivityDisclosure
          id="teacher-rehearsal"
          title="Coba alur dengan 32 jawaban contoh"
          description="Simulasi kelas 7: tiga kartu diperiksa, jawaban lainnya sudah diisi."
          scope={{ ownerId, mode }}
        >
          {mode === "demo" ? (
            <SessionWorkspace
              key={`prelim/${ownerId}/${mode}/${detail?.class.id ?? "cached"}`}
              ownerId={ownerId}
              mode={mode}
              detail={detail}
            />
          ) : (
            <p>
              Pilih Data contoh untuk menjalankan simulasi tanpa data siswa
              nyata.
            </p>
          )}
        </ActivityDisclosure>
      </ActivityDisclosure>
      <ActivityDisclosure
        id="teacher-ai"
        title="Bantuan AI & cara mengajar"
        description="Buat cerita soal atau cari cara menjelaskan kesulitan siswa."
        scope={{ ownerId, mode }}
      >
        <AiWorkspace
          key={`${ownerId}/${mode}`}
          pkg={pkg}
          scope={{ ownerId, mode }}
          onUpdated={setPkg}
        />
      </ActivityDisclosure>
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
