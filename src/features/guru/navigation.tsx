"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { Home, UsersRound, Layers, ClipboardCheck, LogOut } from "lucide-react";
import { Brand } from "@/ui/components/brand";
import { TeacherProvider } from "./app-context";
import { logoutTeacher } from "@/features/classroom/logout-transport";
import { MotionSwap } from "@/ui/components/interactive-motion";
import { Presentation } from "lucide-react";
const entries = [
  ["/guru", "Beranda", "Beranda", Home],
  ["/guru/kelas", "Kelas", "Kelas", UsersRound],
  ["/guru/soal", "Soal & Presentasi", "Soal", Layers],
  ["/guru/latihan", "Belajar berkelompok", "Kelompok", UsersRound],
  ["/guru/asesmen", "Asesmen & Hasil", "Hasil", ClipboardCheck],
] as const;
export function TeacherNavigation({ children }: { children: ReactNode }) {
  const pathname = usePathname(),
    router = useRouter();
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
  // Adaptive activities retain their offline repository and access boundaries.
  const adaptive =
    pathname === "/guru/latihan" || pathname === "/guru/simulasi";
  return (
    <div
      data-surface="guru"
      className="studio-shell min-h-dvh md:grid md:grid-cols-[232px_1fr]"
    >
      <a className="skip-link" href="#konten">
        Langsung ke isi
      </a>
      <aside className="studio-sidebar md:sticky md:top-0 md:h-dvh md:border-r">
        <div className="flex items-center justify-between p-4 md:p-6">
          <Link href="/guru" prefetch={false} aria-label="Beranda PapanNalar">
            <Brand />
          </Link>
          <button
            className="inline-flex min-h-12 min-w-12 items-center justify-center rounded-input text-primary md:hidden"
            aria-label="Keluar akun"
            onClick={() => void logout()}
          >
            <LogOut size={20} />
          </button>
        </div>
        <nav
          aria-label="Menu utama"
          className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-pn-ink-400/30 bg-card pb-[env(safe-area-inset-bottom)] md:static md:mx-3 md:flex md:flex-col md:gap-2 md:border-0"
        >
          {entries.map(([href, label, mobileLabel, Icon]) => {
            const active =
              href === "/guru"
                ? pathname === href
                : pathname.startsWith(href) ||
                  (href === "/guru/latihan" && pathname === "/guru/simulasi") ||
                  (href === "/guru/asesmen" &&
                    pathname.startsWith("/guru/hasil"));
            return (
              <Link
                key={href}
                href={href}
                prefetch={false}
                aria-label={label}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-16 min-w-0 flex-col items-center justify-center gap-1 rounded-input px-1 py-2 text-center text-[11px] font-semibold md:flex-row md:justify-start md:gap-3 md:px-3 md:text-sm ${active ? "bg-pn-teal-100 text-primary" : "text-muted-foreground"}`}
              >
                <span className="nav-icon" aria-hidden>
                  <Icon size={22} strokeWidth={1.8} />
                </span>
                <span className="md:hidden">{mobileLabel}</span>
                <span className="hidden md:inline">{label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="studio-sidebar-foot">
          <button
            className="mt-4 hidden min-h-12 items-center gap-2 text-sm text-muted-foreground md:flex"
            onClick={() => void logout()}
          >
            <LogOut size={18} />
            Keluar akun
          </button>
        </div>
      </aside>
      <main
        id="konten"
        className="studio-workspace min-w-0 px-4 pt-5 pb-28 sm:px-8 md:py-8"
      >
        <div className="mx-auto max-w-5xl">
          <div className="studio-context">
            <Link href="/layar" prefetch={false} target="_blank">
              <Presentation size={18} aria-hidden />
              Layar Kelas
            </Link>
          </div>
          <MotionSwap change={pathname}>
            {adaptive ? (
              children
            ) : (
              <TeacherProvider>{children}</TeacherProvider>
            )}
          </MotionSwap>
        </div>
      </main>
    </div>
  );
}
