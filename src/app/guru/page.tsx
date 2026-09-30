import type { Metadata } from "next";
import { TeacherHome } from "@/features/guru/home";

export const metadata: Metadata = { title: "Aplikasi Guru" };

export default function TeacherPage() {
  return <TeacherHome />;
}
