import type { ReactNode } from "react";
import { TeacherNavigation } from "@/features/guru/navigation";
export default function GuruLayout({ children }: { children: ReactNode }) {
  return <TeacherNavigation>{children}</TeacherNavigation>;
}
