"use client";
import { useSearchParams } from "next/navigation";
import { TeacherProvider } from "./app-context";
import { GroupWorkspace } from "./group-workspace";
import { LegacyTeacherShell } from "./legacy-teacher-shell";

export function GroupEntry() {
  const params = useSearchParams();
  const classId = params.get("class") ?? "";
  const lessonId = params.get("lesson") ?? "";
  const legacy = params.get("mode") === "demo";
  return legacy ? (
    <LegacyTeacherShell />
  ) : (
    <TeacherProvider>
      <GroupWorkspace
        key={`${classId}:${lessonId}`}
        classId={classId}
        lessonId={lessonId}
      />
    </TeacherProvider>
  );
}
