"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { capturePairingLink } from "@/features/classroom/pairing-url";

/**
 * `data-login-next-steps` (INTERACTION_DELTA_V4 friction 1, row A13).
 *
 * The board is unauthenticated, so a teacher can reach `/layar` first, see a six-digit code and
 * then land on `/masuk` with no indication that a screen is already waiting for them. This block
 * answers the three questions the arc requires (§I.3): what this is, what I do, what happens
 * next — and, when a challenge is pending in this browser, says so above them.
 *
 * No motion beyond C2, and no state stored anywhere but the existing pairing record.
 */
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
        <li>Masuk dengan email</li>
        <li>Pilih kelas dan soal</li>
        <li>Tampilkan di Layar Kelas</li>
      </ol>
    </section>
  );
}
