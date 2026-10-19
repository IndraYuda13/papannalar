import type { Metadata } from "next";
import { LoginForm } from "@/features/guru/login-form";
import { AuthShell } from "@/ui/components/auth-shell";
export const metadata: Metadata = { title: "Daftar" };
export default function RegisterPage() {
  return (
    <AuthShell mode="register">
      <h1>Mulai ruang belajar Anda.</h1>
      <p className="pn-auth-description">
        Buat akun guru untuk menyimpan kelas dan soal Anda. Jika diminta,
        konfirmasikan email sebelum masuk.
      </p>
      <LoginForm mode="register" />
      <p className="pn-auth-switch">
        Sudah punya akun? <a href="/masuk">Masuk</a>
      </p>
      <p className="pn-auth-note">
        Pendaftaran tidak berarti email sudah terverifikasi. Akun lama tanpa
        kata sandi: gunakan sesi yang masih masuk untuk mengatur kata sandi.
        Jika sesi sudah berakhir, hubungi pengelola untuk pemulihan akun.
      </p>
    </AuthShell>
  );
}
