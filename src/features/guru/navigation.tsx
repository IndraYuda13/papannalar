"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import {
  Home,
  UsersRound,
  Layers,
  ClipboardCheck,
  LogOut,
  Presentation,
} from "lucide-react";
import { Brand } from "@/ui/components/brand";
import { TeacherProvider } from "./app-context";
import { logoutTeacher } from "@/features/classroom/logout-transport";
import { MotionSwap } from "@/ui/components/interactive-motion";

const entries = [
  ["/guru", "Beranda", Home],
  ["/guru/kelas", "Kelas", UsersRound],
  ["/guru/soal", "Soal", Layers],
  ["/guru/asesmen", "Hasil", ClipboardCheck],
] as const;

function isCurrent(pathname: string, href: string) {
  if (href === "/guru") return pathname === href;
  if (href === "/guru/asesmen")
    return (
      pathname.startsWith("/guru/asesmen") || pathname.startsWith("/guru/hasil")
    );
  return pathname.startsWith(href);
}

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
    <div data-surface="guru" data-register="private" className="studio-shell">
      <a className="skip-link" href="#konten">
        Langsung ke isi
      </a>
      <div className="lg:grid lg:grid-cols-[232px_minmax(0,1fr)]">
        <aside className="studio-sidebar lg:sticky lg:top-0 lg:h-dvh lg:border-r">
          <div className="flex items-center justify-between p-4 lg:px-6 lg:pt-6">
            <Link href="/guru" prefetch={false} aria-label="Beranda PapanNalar">
              <Brand />
            </Link>
            <button
              className="inline-flex min-h-12 min-w-12 items-center justify-center rounded-input text-primary lg:hidden"
              aria-label="Keluar akun"
              onClick={() => void logout()}
            >
              <LogOut size={20} strokeWidth={1.8} />
            </button>
          </div>
          <nav
            aria-label="Menu utama"
            className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-pn-hairline bg-card pb-[env(safe-area-inset-bottom)] lg:static lg:mx-3 lg:flex lg:flex-col lg:gap-1 lg:border-0 lg:pb-0"
          >
            {entries.map(([href, label, Icon]) => {
              const active = isCurrent(pathname, href);
              return (
                <Link
                  key={href}
                  href={href}
                  prefetch={false}
                  data-nav-item
                  aria-label={label}
                  aria-current={active ? "page" : undefined}
                  className={`flex min-h-16 min-w-0 flex-col items-center justify-center gap-1 rounded-input px-1 py-2 text-center text-xs leading-4 font-semibold lg:min-h-12 lg:flex-row lg:justify-start lg:gap-3 lg:px-3 lg:text-sm lg:leading-6 ${
                    active
                      ? "bg-pn-teal-100 text-pn-teal-800"
                      : "text-pn-ink-600 hover:bg-pn-teal-100"
                  }`}
                >
                  <span className="nav-icon shrink-0" aria-hidden>
                    <Icon size={22} strokeWidth={1.8} />
                  </span>
                  <span className="nav-label">{label}</span>
                </Link>
              );
            })}
          </nav>
          <div className="studio-sidebar-foot hidden lg:block">
            <Link
              className="mb-3 flex min-h-12 items-center gap-3 rounded-input border border-pn-edge px-3 text-sm font-semibold text-pn-teal-700 hover:bg-pn-teal-100"
              href="/layar"
              prefetch={false}
              target="_blank"
              rel="noreferrer"
            >
              <Presentation size={20} strokeWidth={1.8} aria-hidden />
              Layar Kelas
            </Link>
            <button
              className="flex min-h-12 w-full items-center gap-3 rounded-input px-3 text-sm text-pn-ink-600 hover:bg-pn-teal-100"
              onClick={() => void logout()}
            >
              <LogOut size={18} strokeWidth={1.8} aria-hidden />
              Keluar akun
            </button>
          </div>
        </aside>
        <main
          id="konten"
          className="studio-workspace min-w-0 px-4 pt-5 sm:px-8 lg:py-8"
        >
          <div className="mx-auto w-full max-w-[960px]">
            {pathname === "/guru" && (
              <Link
                href="/guru/akun"
                className="mb-4 inline-flex min-h-12 items-center text-sm font-semibold text-primary underline"
              >
                Atur kata sandi akun lama
              </Link>
            )}
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
    </div>
  );
}
