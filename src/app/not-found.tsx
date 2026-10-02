import Link from "next/link";
import { StateNotice } from "@/ui/components/studio";
export default function NotFound() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <StateNotice
        title="Halaman tidak ditemukan"
        action={
          <Link
            className="inline-flex min-h-12 items-center font-semibold text-primary"
            href="/guru"
          >
            Kembali ke ruang mengajar →
          </Link>
        }
      >
        Periksa alamat halaman atau pilih tujuan dari menu utama.
      </StateNotice>
    </main>
  );
}
