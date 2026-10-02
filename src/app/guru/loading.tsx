import { StateNotice } from "@/ui/components/studio";
export default function Loading() {
  return (
    <StateNotice kind="loading" title="Menyiapkan ruang mengajar…">
      Kelas dan materi tersimpan akan tampil sebentar lagi.
    </StateNotice>
  );
}
