import { PageHeader } from "@/ui/components/studio";
import { TeacherWorkspace } from "./teacher-workspace";
import { PrintCards } from "./print-cards";

export function LegacyTeacherShell() {
  return (
    <div className="studio-adaptive space-y-6">
      <PageHeader
        title="Latihan & bantuan AI"
        description="Siapkan soal, ubah beberapa tugas menjadi soal cerita bila perlu, lalu coba mengajar dengan layar kelas."
      />
      <TeacherWorkspace />
      <details id="teacher-print" className="teacher-disclosure">
        <summary>Cetak Kartu Nalar</summary>
        <div className="teacher-disclosure-body">
          <PrintCards />
        </div>
      </details>
    </div>
  );
}
