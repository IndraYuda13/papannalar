import type { Metadata } from "next";
import { Brand } from "@/ui/components/brand";
import { LoginForm } from "@/features/guru/login-form";
import { SampleLogin } from "@/features/guru/sample-login";
import { DecorativeScene } from "@/ui/components/decorative-scene";
import { LoginNextSteps } from "@/features/guru/login-next-steps";
import { demoConfiguredForEnvironment } from "@/server/demo-surface";
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Masuk" };
export default function LoginPage() {
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
          Masuk ke akun guru
        </h1>
        <p className="mb-8 text-muted-foreground">
          Gunakan email dan kata sandi untuk membuka kelas Anda.
        </p>
        <LoginNextSteps />
        <LoginForm />
        <a
          href="/daftar"
          className="mt-4 inline-flex min-h-12 items-center font-semibold text-primary underline"
        >
          Belum punya akun? Daftar
        </a>
        {process.env["SAMPLE_ENABLED"] === "true" &&
          demoConfiguredForEnvironment() && (
            <SampleLogin
              requiresCode={Boolean(process.env["SAMPLE_ACCESS_CODE"])}
            />
          )}
        <a
          className="mt-8 inline-flex min-h-12 items-center font-semibold text-primary underline"
          href="/layar"
        >
          Buka Layar Kelas
        </a>
      </div>
    </main>
  );
}
