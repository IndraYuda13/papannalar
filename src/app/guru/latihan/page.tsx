import { LegacyTeacherShell } from "@/features/guru/legacy-teacher-shell";
import { TeacherProvider } from "@/features/guru/app-context";
import { GroupWorkspace } from "@/features/guru/group-workspace";
export const metadata = { title: "Belajar berkelompok" };
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ class?: string; lesson?: string; mode?: string }>;
}) {
  const query = await searchParams;
  return query.mode === "demo" ? (
    <LegacyTeacherShell />
  ) : (
    <TeacherProvider>
      <GroupWorkspace
        key={`${query.class}:${query.lesson}`}
        classId={query.class}
        lessonId={query.lesson}
      />
    </TeacherProvider>
  );
}
