import { notFound } from "next/navigation";
import { isLocalDemoEnvironment } from "@/contracts/local-demo";
import { Brand } from "@/ui/components/brand";
export const dynamic = "force-dynamic";
export default function DemoPage() {
  if (
    !isLocalDemoEnvironment(
      process.env["PAPANNALAR_LOCAL_ADAPTER"],
      process.env["NEXT_PUBLIC_SUPABASE_URL"],
      process.env["APP_ORIGIN"],
    )
  )
    notFound();
  return (
    <main className="mx-auto max-w-xl space-y-6 p-8">
      <Brand />
      <h1 className="text-3xl font-bold">Demo lokal 7B</h1>
      <p>
        Provider autentikasi uji di komputer ini. Data simulasi; tidak mengirim
        email atau memakai Supabase live.
      </p>
      <form method="post" action="/auth/demo">
        <button className="min-h-12 rounded-tombol bg-primary px-6 py-3 font-bold text-white">
          Masuk demo lokal
        </button>
      </form>
      <ol className="list-decimal space-y-2 pl-6">
        <li>
          Pilih Data kelas → Demo terpisah. Buat kelas 7B, tingkat 7, 32 siswa.
        </li>
        <li>Buka kelas dan Mulai Sesi Tepat Level.</li>
        <li>Buka /layar di jendela lain. Masukkan kode enam digit di guru.</li>
        <li>
          Tampilkan Pembuka dan Cek Level. Pindai fixture 07, 12, 25; simpan
          setiap hasil.
        </li>
        <li>
          Tampilkan Kelompok, lalu Stasiun. Ubah lompatan menjadi −5, tekan
          Lompat dan Jalankan.
        </li>
      </ol>
      <p>
        Fixture sintetis melewati pembacaan piksel. Kamera HP, cetak fisik dan
        Supabase live belum teruji.
      </p>
    </main>
  );
}
