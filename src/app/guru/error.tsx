"use client";
import { StateNotice } from "@/ui/components/studio";
import { Button } from "@/ui/components/button";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <StateNotice
      kind="error"
      title="Halaman belum dapat dibuka"
      action={<Button onClick={reset}>Coba lagi</Button>}
    >
      Coba muat halaman kembali. Jika sambungan terputus, buka materi yang sudah
      tersimpan dari beranda.
    </StateNotice>
  );
}
