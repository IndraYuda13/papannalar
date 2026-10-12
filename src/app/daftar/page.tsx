import type { Metadata } from "next";
import { Brand } from "@/ui/components/brand";
import { LoginForm } from "@/features/guru/login-form";
import { DecorativeScene } from "@/ui/components/decorative-scene";
export const metadata: Metadata = { title: "Daftar" };
export default function RegisterPage() {
  return (
    <main className="studio-login">
      <section className="studio-login-intro" aria-label="Tentang PapanNalar">
        <p className="studio-eyebrow">Ruang untuk memahami bersama</p>
        <h2>
          Satu papan.
          <br />
          Banyak cara memahami.
        </h2>
        <p className="text-muted-foreground">
          Siapkan soal, ajak siswa mencoba, dan temukan langkah belajar
          berikutnya.
        </p>
        <DecorativeScene />
      </section>
      <div className="studio-login-form">
        <Brand />
        <h1 className="mt-12 mb-3 text-[28px] font-extrabold">
          Daftar akun guru
        </h1>
        <p className="mb-8 text-muted-foreground">
          Buat akun untuk menyimpan kelas dan soal Anda. Pendaftaran tidak
          berarti email sudah terverifikasi. Jika diminta, konfirmasikan email
          sebelum masuk.
        </p>
        <LoginForm mode="register" />
        <a
          href="/masuk"
          className="mt-4 inline-flex min-h-12 items-center font-semibold text-primary underline"
        >
          Sudah punya akun? Masuk
        </a>
        <p className="mt-4 text-sm text-muted-foreground">
          Akun lama tanpa kata sandi: gunakan sesi yang masih masuk untuk
          mengatur kata sandi. Jika sesi sudah berakhir, hubungi pengelola untuk
          pemulihan akun.
        </p>
      </div>
    </main>
  );
}
