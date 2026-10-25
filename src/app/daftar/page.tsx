import type { Metadata } from "next";
import { LoginForm } from "@/features/guru/login-form";
import { AuthShell } from "@/ui/components/auth-shell";
export const metadata: Metadata = { title: "Daftar" };
export default function RegisterPage() {
  return (
    <AuthShell mode="register">
      <h1>Mulai ruang belajar Anda.</h1>
      <p className="pn-auth-description">
        Buat akun guru untuk menyimpan kelas dan soal Anda.
      </p>
      <LoginForm mode="register" />
      <p className="pn-auth-switch">
        Sudah punya akun? <a href="/masuk">Masuk</a>
      </p>
      <p className="pn-auth-note">
        Pendaftaran belum selesai sebelum email dikonfirmasi. Buka kotak masuk,
        lalu pakai tautan dari email itu untuk masuk. Kata sandi dapat
        ditambahkan kemudian dari menu akun di pojok kanan atas.
      </p>
    </AuthShell>
  );
}
