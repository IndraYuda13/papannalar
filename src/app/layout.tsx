import type { Metadata } from "next";
import { OfflineBootstrap } from "@/ui/components/offline-bootstrap";
import "./globals.css";
import "@/ui/redesign.css";
import "@/ui/workspace-pages.css";
import "@/ui/board-redesign.css";
import "@/ui/motion.css";
import { VisualPreferencesProvider } from "@/ui/components/visual-preferences";
import { ConfirmProvider } from "@/ui/components/confirm";
import { OfflineBanner } from "@/ui/components/offline-banner";

export const metadata: Metadata = {
  title: { default: "PapanNalar", template: "%s | PapanNalar" },
  description: "Satu papan, setiap siswa belajar di levelnya.",
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id" data-scroll-behavior="smooth">
      <body>
        <VisualPreferencesProvider>
          <ConfirmProvider>
            <OfflineBanner />
            {children}
          </ConfirmProvider>
        </VisualPreferencesProvider>
        <OfflineBootstrap />
      </body>
    </html>
  );
}
