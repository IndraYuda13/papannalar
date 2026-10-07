import { PageHeader } from "@/ui/components/studio";
import { TeacherWorkspace } from "./teacher-workspace";
import { PrintCards } from "./print-cards";

export function LegacyTeacherShell() {
  return (
    <div className="studio-adaptive space-y-6">
      <PageHeader
        title="Belajar berkelompok"
        description="Kenali kebutuhan setiap siswa, bagi kegiatan yang sesuai, lalu periksa hasil belajarnya. Ikuti satu langkah setiap kali."
      />
      <TeacherWorkspace>
        <details id="teacher-print" className="teacher-disclosure">
          <summary>Cetak Kartu Nalar</summary>
          <div className="teacher-disclosure-body">
            <PrintCards />
          </div>
        </details>
      </TeacherWorkspace>
    </div>
  );
}
