import { PageHeader } from "@/ui/components/studio";
import { TeacherWorkspace } from "./teacher-workspace";
import { PrintCards } from "./print-cards";

export function LegacyTeacherShell() {
  return (
    <div className="studio-adaptive space-y-6">
      <PageHeader
        title="Latihan & bantuan AI"
        description="Pilih kelas, siapkan latihan, lalu jalankan kegiatan. AI dapat membantu membuat cerita soal dan saran mengajar."
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
