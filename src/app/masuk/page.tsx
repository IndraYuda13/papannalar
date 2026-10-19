import type { Metadata } from "next";
import { LoginForm } from "@/features/guru/login-form";
import { SampleLogin } from "@/features/guru/sample-login";
import { LoginNextSteps } from "@/features/guru/login-next-steps";
import { demoConfiguredForEnvironment } from "@/server/demo-surface";
import { AuthShell } from "@/ui/components/auth-shell";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Masuk" };
export default function LoginPage() {
  return (
    <AuthShell mode="login">
      <h1>Selamat datang kembali.</h1>
      <p className="pn-auth-description">
        Masuk ke akun guru untuk membuka kelas dan melanjutkan kegiatan belajar.
      </p>
      <LoginForm />
      <div className="pn-auth-next">
        <LoginNextSteps />
      </div>
      <p className="pn-auth-switch">
        Belum punya akun? <a href="/daftar">Daftar akun guru</a>
      </p>
      {process.env["SAMPLE_ENABLED"] === "true" &&
        demoConfiguredForEnvironment() && (
          <SampleLogin
            requiresCode={Boolean(process.env["SAMPLE_ACCESS_CODE"])}
          />
        )}
    </AuthShell>
  );
}
