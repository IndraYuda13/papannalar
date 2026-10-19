import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowUpRight, Check } from "lucide-react";
import { Brand } from "./brand";
import { LearningPreview } from "./learning-preview";

export function AuthShell({
  mode,
  children,
}: {
  mode: "login" | "register";
  children: ReactNode;
}) {
  return (
    <div className="pn-auth">
      <header className="pn-auth-header">
        <Link href="/masuk" aria-label="PapanNalar">
          <Brand />
        </Link>
        <Link href="/layar">
          Buka Layar Kelas <ArrowUpRight size={17} aria-hidden />
        </Link>
      </header>
      <main className="pn-auth-grid">
        <section className="pn-auth-intro" aria-label="Tentang PapanNalar">
          <span className="pn-intro-tag">RUANG UNTUK MEMAHAMI BERSAMA</span>
          <h2>
            Satu papan.
            <br />
            Banyak cara
            <br />
            <span>memahami.</span>
          </h2>
          <p>
            Siapkan soal, ajak siswa mencoba, dan temukan langkah belajar
            berikutnya.
          </p>
          <LearningPreview />
          <div className="pn-auth-benefits">
            <span>
              <Check size={16} />
              Tanpa HP siswa
            </span>
            <span>
              <Check size={16} />
              Guru tetap memandu
            </span>
          </div>
        </section>
        <div className="pn-auth-form">
          <nav aria-label="Akses akun" className="pn-auth-tabs">
            <Link
              href="/masuk"
              aria-current={mode === "login" ? "page" : undefined}
            >
              Masuk
            </Link>
            <Link
              href="/daftar"
              aria-current={mode === "register" ? "page" : undefined}
            >
              Daftar
            </Link>
          </nav>
          <p className="pn-auth-mobile-intro">
            Satu papan. Banyak cara memahami.
          </p>
          {children}
        </div>
      </main>
    </div>
  );
}
