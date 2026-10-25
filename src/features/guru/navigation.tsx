"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import {
  Home,
  UsersRound,
  Layers,
  ClipboardCheck,
  LogOut,
  Presentation,
  Menu,
  Search,
  Plus,
  UserRound,
  ArrowUpRight,
  Shapes,
} from "lucide-react";
import { Brand } from "@/ui/components/brand";
import { TeacherProvider } from "./app-context";
import { logoutTeacher } from "@/features/classroom/logout-transport";
import { MotionSwap } from "@/ui/components/interactive-motion";
import { teacherSectionForPath } from "./workspace-navigation";

const entries = [
  ["/guru", "Beranda", Home],
  ["/guru/kelas", "Kelas", UsersRound],
  ["/guru/soal", "Soal", Layers],
  ["/guru/asesmen", "Hasil", ClipboardCheck],
] as const;

export function TeacherNavigation({ children }: { children: ReactNode }) {
  const pathname = usePathname(),
    router = useRouter();
  const [compact, setCompact] = useState(false);
  const current = teacherSectionForPath(pathname);
  async function logout() {
    try {
      await logoutTeacher();
    } catch {
      /* Pending logout retries before the next login. */
    } finally {
      router.replace("/masuk");
      router.refresh();
    }
  }
  const adaptive =
    pathname === "/guru/latihan" || pathname === "/guru/simulasi";
  return (
    <div
      data-surface="guru"
      data-register="private"
      className="studio-shell pn-workspace"
      data-compact={compact}
    >
      <a className="skip-link" href="#konten">
        Langsung ke isi
      </a>
      <header className="pn-topbar">
        <div className="pn-topbar-brand">
          <button
            className="pn-icon-button pn-menu-toggle"
            aria-label={compact ? "Perluas menu" : "Ringkas menu"}
            aria-expanded={!compact}
            aria-controls="pn-sidebar"
            onClick={() => setCompact(!compact)}
          >
            <Menu size={22} aria-hidden />
          </button>
          <Link href="/guru" prefetch={false} aria-label="Beranda PapanNalar">
            <Brand />
          </Link>
        </div>
        <form action="/guru/soal" role="search" className="pn-global-search">
          <input type="hidden" name="tab" value="all" />
          <Search size={20} aria-hidden />
          <label className="sr-only" htmlFor="pn-search">
            Cari soal dan materi
          </label>
          <input
            id="pn-search"
            name="q"
            type="search"
            placeholder="Cari soal dan materi untuk kelas Anda"
            maxLength={120}
          />
          <button type="submit" aria-label="Cari" className="pn-search-submit">
            <ArrowUpRight size={18} aria-hidden />
          </button>
        </form>
        <div className="pn-topbar-actions">
          <Link
            href="/guru/soal/baru"
            className="pn-create-button"
            aria-label="Buat kumpulan soal"
          >
            <Plus size={23} aria-hidden />
            <span>Buat soal</span>
          </Link>
          <details className="pn-account-menu">
            <summary aria-label="Menu akun guru">
              <UserRound size={21} aria-hidden />
            </summary>
            <div className="pn-account-popover">
              <p>Akun guru</p>
              <Link href="/guru/akun">Kata sandi</Link>
              <button onClick={() => void logout()}>
                <LogOut size={17} aria-hidden />
                Keluar akun
              </button>
            </div>
          </details>
        </div>
      </header>
      <aside id="pn-sidebar" className="studio-sidebar pn-sidebar">
        <p className="pn-sidebar-label">RUANG GURU</p>
        <nav aria-label="Menu utama" className="pn-main-nav">
          {entries.map(([href, label, Icon]) => (
            <Link
              key={href}
              href={href}
              prefetch={false}
              data-nav-item
              aria-label={label}
              aria-current={current === href ? "page" : undefined}
            >
              <Icon size={22} strokeWidth={1.8} aria-hidden />
              <span className="nav-label">{label}</span>
            </Link>
          ))}
        </nav>
        <div className="pn-sidebar-secondary">
          <p className="pn-sidebar-label">KEGIATAN KELAS</p>
          <Link
            href="/guru/latihan"
            aria-current={current === "/guru/latihan" ? "page" : undefined}
          >
            <Shapes size={21} aria-hidden />
            <span>Latihan kelompok</span>
          </Link>
          <Link href="/layar" target="_blank" rel="noreferrer">
            <Presentation size={21} aria-hidden />
            <span>Layar Kelas</span>
            <ArrowUpRight size={15} className="pn-external-icon" aria-hidden />
          </Link>
        </div>
        <div className="pn-sidebar-note">
          <span className="pn-note-mark" aria-hidden>
            ↗
          </span>
          <p>
            Satu papan.
            <br />
            <strong>Banyak cara memahami.</strong>
          </p>
        </div>
      </aside>
      <main id="konten" className="studio-workspace pn-main">
        <div className="pn-content-rail">
          <MotionSwap change={pathname}>
            {adaptive ? (
              children
            ) : (
              <TeacherProvider>{children}</TeacherProvider>
            )}
          </MotionSwap>
          <footer className="pn-workspace-footer">
            <span>PapanNalar · Ruang untuk memahami bersama</span>
            <Link href="/layar" target="_blank" rel="noreferrer">
              Buka Layar Kelas <ArrowUpRight size={14} aria-hidden />
            </Link>
          </footer>
        </div>
      </main>
    </div>
  );
}
