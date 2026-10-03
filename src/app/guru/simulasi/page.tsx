import { PageHeader } from "@/ui/components/studio";
import { TeacherWorkspace } from "@/features/guru/teacher-workspace";
export const metadata = { title: "Contoh sesi lengkap" };
export default function ExamplePage() {
  return (
    <div className="studio-adaptive space-y-6">
      <PageHeader
        title="Coba contoh sesi lengkap"
        description="Pelajari cara memeriksa jawaban dan menjalankan kegiatan bersama kelas contoh."
      />
      <TeacherWorkspace example />
    </div>
  );
}
