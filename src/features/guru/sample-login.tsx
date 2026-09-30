"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/ui/components/button";
import { hasPendingLogout } from "@/local/access";
import { logoutTeacher } from "@/features/classroom/logout-transport";
export function SampleLogin({ requiresCode }: { requiresCode: boolean }) {
  const router = useRouter();
  const [code, setCode] = useState(""),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  return (
    <form
      className="mt-8 space-y-3 rounded-kartu bg-pn-teal-100 p-5"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          if (await hasPendingLogout()) await logoutTeacher();
          const res = await fetch("/auth/sample", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ accessCode: code }),
          });
          if (!res.ok)
            throw new Error(
              res.status === 409
                ? "Keluar dari akun saat ini sebelum membuka data contoh."
                : "Data contoh belum dapat dibuka. Periksa kode akses atau coba lagi.",
            );
          router.replace("/guru");
          router.refresh();
        } catch (error) {
          setMessage(
            error instanceof Error
              ? error.message
              : "Sambungkan internet lalu coba lagi.",
          );
          setBusy(false);
        }
      }}
    >
      <h2 className="text-lg font-bold">Coba PapanNalar</h2>
      <p className="text-sm">
        Coba dua kelas dengan soal dan hasil contoh. Tidak memakai data siswa
        nyata.
      </p>
      {requiresCode && (
        <label className="block">
          Kode akses rekaman
          <input
            className="mt-1 min-h-12 w-full rounded-input border bg-white px-3"
            type="password"
            autoComplete="off"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
          />
        </label>
      )}
      <Button disabled={busy} className="w-full">
        {busy ? "Membuka…" : "Coba dengan data contoh"}
      </Button>
      <p role="status">{message}</p>
    </form>
  );
}
