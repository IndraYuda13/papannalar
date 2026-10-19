import { PageHeader } from "@/ui/components/studio";
import { TeacherWorkspace } from "./teacher-workspace";
import { PrintCards } from "./print-cards";
import { GroupOrientation } from "./group-orientation";

export function LegacyTeacherShell() {
  return (
    <div className="studio-adaptive pn-legacy-workspace space-y-6">
      <PageHeader
        eyebrow="LATIHAN KELOMPOK"
        title="Belajar berkelompok"
        description="Kenali kebutuhan setiap siswa, bagi kegiatan yang sesuai, lalu periksa hasil belajarnya. Ikuti satu langkah setiap kali."
      />
      <GroupOrientation />
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
