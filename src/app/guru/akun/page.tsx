import type { Metadata } from "next";
import { LoginForm } from "@/features/guru/login-form";
export const metadata: Metadata = { title: "Kata sandi akun" };
export default function AccountPage() {
  return (
    <section className="pn-account-page mx-auto max-w-lg space-y-5">
      <h1 className="text-[28px] font-extrabold">Kata sandi akun lama</h1>
      <p>
        Untuk akun lama yang belum memiliki kata sandi, simpan kata sandi dari
        sesi yang masih masuk ini. Kelas dan soal tetap menggunakan akun yang
        sama. Ini bukan pengaturan ulang kata sandi yang sudah ada.
      </p>
      <LoginForm mode="enroll" />
      <a
        href="/guru"
        className="inline-flex min-h-12 items-center font-semibold text-primary underline"
      >
        Kembali ke ruang mengajar
      </a>
    </section>
  );
}
