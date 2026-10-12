"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { capturePairingLink } from "@/features/classroom/pairing-url";

export function LoginNextSteps() {
  const [waiting, setWaiting] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(
      () => setWaiting(Boolean(capturePairingLink())),
      0,
    );
    return () => window.clearTimeout(timer);
  }, []);
  return (
    <section
      data-login-next-steps
      className="studio-login-steps"
      aria-label="Langkah setelah masuk"
    >
      {waiting && (
        <p className="studio-login-waiting" role="status">
          <Link href="/guru">Layar Kelas sudah menunggu kode.</Link> Masuk untuk
          menyambungkannya.
        </p>
      )}
      <ol>
        <li>Masuk dengan email dan kata sandi</li>
        <li>Pilih kelas dan soal</li>
        <li>Tampilkan di Layar Kelas</li>
      </ol>
    </section>
  );
}
