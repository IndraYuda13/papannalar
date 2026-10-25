import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "@/features/guru/login-form";
export const metadata: Metadata = { title: "Kata sandi akun" };
export default function AccountPage() {
  return (
    <section className="pn-account-page mx-auto max-w-lg space-y-5">
      <h1 className="text-[28px] font-extrabold">Kata sandi akun</h1>
      <p>
        Tambahkan kata sandi untuk akun yang sedang Anda pakai. Setelah
        tersimpan, Anda dapat masuk dengan email dan kata sandi tanpa menunggu
        tautan dari email.
      </p>
      <LoginForm mode="enroll" />
      <p className="studio-help">
        Tautan masuk melalui email tetap berjalan. Kelas dan soal Anda tidak
        berubah.
      </p>
      <Link
        href="/guru"
        className="inline-flex min-h-12 items-center font-semibold text-primary underline"
      >
        Kembali ke ruang mengajar
      </Link>
    </section>
  );
}
