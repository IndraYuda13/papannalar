"use client";
import { useState, type FormEvent } from "react";
import { LoaderCircle } from "lucide-react";
import { Button } from "@/ui/components/button";
import { hasPendingLogout } from "@/local/access";
import { logoutTeacher } from "@/features/classroom/logout-transport";

export function LoginForm() {
  const [message, setMessage] = useState("");
  const [link, setLink] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = String(new FormData(event.currentTarget).get("email") ?? "");
    setBusy(true);
    try {
      if (await hasPendingLogout()) {
        await logoutTeacher();
      }
      const response = await fetch("/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      // In-band delivery (`PAPANNALAR_LOGIN_LINK_REVEAL`): the loopback test
      // provider cannot send email, so it returns the link itself. Unknown
      // response shapes fail quiet and keep the standard message.
      const payload: { link?: unknown } | null = response.ok
        ? await response.json().catch(() => null)
        : null;
      const candidate = payload?.link;
      const delivered =
        typeof candidate === "string" && candidate.startsWith("/auth/callback?")
          ? candidate
          : "";
      setLink(delivered);
      setMessage(
        response.ok
          ? delivered
            ? "Tautan masuk siap. Buka sekarang di perangkat ini."
            : "Tautan masuk sudah dikirim. Buka email di perangkat ini."
          : "Tautan belum dapat dikirim. Coba lagi sebentar.",
      );
    } catch {
      setMessage("Sambungkan internet untuk meminta tautan masuk.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} className="space-y-5">
      <label className="block font-semibold">
        Email guru
        <input
          name="email"
          type="email"
          autoComplete="email"
          required
          maxLength={254}
          className="studio-field mt-2 min-h-12 w-full rounded-input border border-pn-ink-400 bg-white px-3 font-normal"
        />
      </label>
      <Button type="submit" disabled={busy} aria-busy={busy} className="w-full">
        {busy && (
          <LoaderCircle
            className="pending-spinner"
            size={18}
            aria-hidden
            data-testid="login-spinner"
          />
        )}
        {busy ? "Mengirim…" : "Kirim tautan masuk"}
      </Button>
      <p role="status" aria-live="polite" className="sr-only">
        {busy ? "Mengirim tautan masuk." : ""}
      </p>
      <p role="status" className="text-sm text-muted-foreground">
        {message}
      </p>
      {link && (
        <Button asChild variant="outline" className="w-full">
          <a href={link} data-testid="delivered-link">
            Buka tautan masuk
          </a>
        </Button>
      )}
    </form>
  );
}
