import type { Metadata } from "next";
import { Brand } from "@/ui/components/brand";
import { LoginForm } from "@/features/guru/login-form";

export const metadata: Metadata = { title: "Masuk" };
export default function LoginPage() {
  return (
    <main className="mx-auto max-w-md px-6 py-12">
      <Brand />
      <h1 className="mt-12 mb-3 text-[28px] font-extrabold">
        Masuk tanpa kata sandi
      </h1>
      <p className="mb-8 text-muted-foreground">
        Gunakan email guru untuk membuka kelas Anda. Tautan hanya berlaku
        sekali.
      </p>
      <LoginForm />
      <a
        className="mt-8 inline-flex min-h-12 items-center font-semibold text-primary underline"
        href="/layar"
      >
        Buka Layar Kelas
      </a>
    </main>
  );
}
