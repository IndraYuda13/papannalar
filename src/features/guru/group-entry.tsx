"use client";
import { useEffect, useState } from "react";
import { TeacherProvider } from "./app-context";
import { GroupWorkspace } from "./group-workspace";
import { LegacyTeacherShell } from "./legacy-teacher-shell";
import { StateNotice } from "@/ui/components/studio";
export function GroupEntry() {
  const [query, setQuery] = useState<{
    classId: string;
    lessonId: string;
    legacy: boolean;
  }>();
  useEffect(() => {
    const read = () => {
      const q = new URLSearchParams(window.location.search);
      setQuery({
        classId: q.get("class") ?? "",
        lessonId: q.get("lesson") ?? "",
        legacy: q.get("mode") === "demo",
      });
    };
    const timer = setTimeout(read, 0);
    window.addEventListener("popstate", read);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("popstate", read);
    };
  }, []);
  if (!query) return <StateNotice kind="loading" title="Memuat kegiatan…" />;
  return query.legacy ? (
    <LegacyTeacherShell />
  ) : (
    <TeacherProvider>
      <GroupWorkspace
        key={`${query.classId}:${query.lessonId}`}
        classId={query.classId}
        lessonId={query.lessonId}
      />
    </TeacherProvider>
  );
}
