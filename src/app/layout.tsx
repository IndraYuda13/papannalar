import type { Metadata } from "next";
import { OfflineBootstrap } from "@/ui/components/offline-bootstrap";
import "./globals.css";
import { VisualPreferencesProvider } from "@/ui/components/visual-preferences";

export const metadata: Metadata = {
  title: { default: "PapanNalar", template: "%s | PapanNalar" },
  description: "Satu papan, setiap siswa belajar di levelnya.",
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body>
        <VisualPreferencesProvider>{children}</VisualPreferencesProvider>
        <OfflineBootstrap />
      </body>
    </html>
  );
}
