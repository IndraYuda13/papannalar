import { PageHeader } from "@/ui/components/studio";
import { TeacherWorkspace } from "./teacher-workspace";
import { PrintCards } from "./print-cards";

export function LegacyTeacherShell() {
  return (
    <div className="studio-adaptive space-y-6">
      <PageHeader
        title="Latihan & bantuan AI"
        description="Pilih kelas → siapkan soal → mulai mengajar. Bantuan AI bisa dipakai bila perlu."
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
