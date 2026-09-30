"use client";
import { useState, type FormEvent } from "react";
import { Button } from "@/ui/components/button";
import { hasPendingLogout } from "@/local/access";
import { logoutTeacher } from "@/features/classroom/logout-transport";

export function LoginForm() {
  const [message, setMessage] = useState("");
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
      setMessage(
        response.ok
          ? "Tautan masuk sudah dikirim. Buka email di perangkat ini."
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
          className="mt-2 min-h-12 w-full rounded-input border border-pn-ink-400 bg-white px-3 font-normal"
        />
      </label>
      <Button type="submit" disabled={busy} className="w-full">
        {busy ? "Mengirim…" : "Kirim tautan masuk"}
      </Button>
      <p role="status" className="text-sm text-muted-foreground">
        {message}
      </p>
    </form>
  );
}
