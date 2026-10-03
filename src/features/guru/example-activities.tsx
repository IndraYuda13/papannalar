"use client";
import { useState } from "react";
import type { ClassDto } from "@/contracts/classes";
import type { StudentDto } from "@/contracts/api";
import type { TeacherPackage } from "@/core/package/build";
import { SessionWorkspace } from "@/features/session/session-workspace";
import { PackageWorkspace } from "@/features/package/package-workspace";
import { ActivityDisclosure } from "./activity-disclosure";
export function ExampleActivities({
  ownerId,
  mode,
  detail,
}: {
  ownerId: string;
  mode: "demo" | "pilot";
  detail?: { class: ClassDto; students: StudentDto[] };
}) {
  const [pkg, setPkg] = useState<TeacherPackage>();
  const [selectedStep, setSelectedStep] = useState("");
  return (
    <>
      <SessionWorkspace ownerId={ownerId} mode={mode} detail={detail} />
      <ActivityDisclosure
        id="teacher-prepare"
        title="Soal tambahan untuk cetak & cek akhir"
        description="Opsional: menyiapkan tugas dan pertanyaan penutup untuk contoh ini."
        scope={{ ownerId, mode }}
      >
        <PackageWorkspace
          ownerId={ownerId}
          mode={mode}
          classroom={detail?.class}
          students={detail?.students}
          pkg={pkg}
          onPackageChange={setPkg}
          selectedStep={selectedStep}
          onSelectedStepChange={setSelectedStep}
          purpose="extra"
        />
      </ActivityDisclosure>
    </>
  );
}
