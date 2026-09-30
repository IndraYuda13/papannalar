import type { Metadata } from "next";
import { TeacherShell } from "@/features/guru/teacher-shell";

export const metadata: Metadata = { title: "Aplikasi Guru" };

export default function TeacherPage() {
  return <TeacherShell />;
}
