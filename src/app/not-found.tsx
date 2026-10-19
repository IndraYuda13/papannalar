import Link from "next/link";
import { StateNotice } from "@/ui/components/studio";
import { Brand } from "@/ui/components/brand";
export default function NotFound() {
  return (
    <main className="pn-not-found mx-auto max-w-2xl px-6 py-16">
      <Link href="/guru" aria-label="Beranda PapanNalar">
        <Brand />
      </Link>
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
