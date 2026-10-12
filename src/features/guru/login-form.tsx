"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { Button } from "@/ui/components/button";
import { hasPendingLogout } from "@/local/access";
import { logoutTeacher } from "@/features/classroom/logout-transport";

type Mode = "login" | "register" | "enroll";
export function LoginForm({ mode = "login" }: { mode?: Mode }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [complete, setComplete] = useState(false);
  const confirm = mode !== "login";
  const action =
    mode === "register"
      ? "Daftar"
      : mode === "enroll"
        ? "Simpan kata sandi"
        : "Masuk";
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || complete) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const password = String(data.get("password") ?? "");
    setMessage("");
    if (confirm && password !== data.get("confirmation")) {
      setMessage("Konfirmasi kata sandi belum sama.");
      form.querySelector<HTMLInputElement>('[name="confirmation"]')?.focus();
      return;
    }
    setBusy(true);
    try {
      if (mode !== "enroll" && (await hasPendingLogout()))
        await logoutTeacher();
      const response = await fetch(`/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          mode === "enroll"
            ? { password }
            : { email: String(data.get("email") ?? ""), password },
        ),
      });
      const payload = (await response.json().catch(() => null)) as {
        status?: string;
      } | null;
      if (
        response.ok &&
        payload?.status === "confirmation_required" &&
        mode === "register"
      ) {
        form.reset();
        setComplete(true);
        setMessage(
          "Pendaftaran diterima. Periksa email untuk konfirmasi akun sebelum masuk. Email Anda belum terverifikasi.",
        );
      } else if (
        response.ok &&
        (payload?.status === "signed_in" ||
          (mode === "enroll" && payload?.status === "enrolled"))
      ) {
        form.reset();
        router.replace("/guru");
        router.refresh();
        return;
      } else {
        setMessage(
          response.status === 429
            ? "Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi."
            : response.status === 503
              ? "Layanan akun belum tersedia. Coba lagi sebentar."
              : mode === "register"
                ? "Pendaftaran belum berhasil. Periksa isian atau masuk jika sudah memiliki akun."
                : mode === "enroll"
                  ? "Kata sandi belum dapat disimpan. Pastikan akun masih masuk dan belum memiliki kata sandi."
                  : "Email atau kata sandi tidak sesuai.",
        );
      }
    } catch {
      setMessage("Sambungkan internet lalu coba lagi.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} className="space-y-5">
      {mode !== "enroll" && (
        <label className="block font-semibold">
          Email guru
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            maxLength={254}
            disabled={busy || complete}
            className="studio-field mt-2 min-h-12 w-full rounded-input border border-pn-ink-400 bg-white px-3 font-normal"
          />
        </label>
      )}
      <label className="block font-semibold">
        Kata sandi
        <input
          name="password"
          type="password"
          autoComplete={confirm ? "new-password" : "current-password"}
          required
          minLength={8}
          maxLength={128}
          disabled={busy || complete}
          aria-describedby={confirm ? "password-help" : undefined}
          className="studio-field mt-2 min-h-12 w-full rounded-input border border-pn-ink-400 bg-white px-3 font-normal"
        />
      </label>
      {confirm && (
        <>
          <p id="password-help" className="text-sm text-muted-foreground">
            Gunakan 8–128 karakter. Jangan gunakan kata sandi akun lain.
          </p>
          <label className="block font-semibold">
            Konfirmasi kata sandi
            <input
              name="confirmation"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              maxLength={128}
              disabled={busy || complete}
              className="studio-field mt-2 min-h-12 w-full rounded-input border border-pn-ink-400 bg-white px-3 font-normal"
            />
          </label>
        </>
      )}
      <Button
        type="submit"
        disabled={busy || complete}
        aria-busy={busy}
        className="w-full"
      >
        {busy && (
          <LoaderCircle
            className="pending-spinner"
            size={18}
            aria-hidden
            data-testid="login-spinner"
          />
        )}
        {busy ? "Memproses…" : action}
      </Button>
      <p
        role="status"
        aria-live="polite"
        className="text-sm text-muted-foreground"
      >
        {message || (busy ? "Memproses akun." : "")}
      </p>
    </form>
  );
}
