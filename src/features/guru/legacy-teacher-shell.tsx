import { ArrowUpRight, BookOpen, Monitor, School } from "lucide-react";
import { PageHeader } from "@/ui/components/studio";
import { Button } from "@/ui/components/button";
import { TeacherWorkspace } from "./teacher-workspace";
import { PrintCards } from "./print-cards";

export function LegacyTeacherShell() {
  return (
    <div className="studio-adaptive">
      <PageHeader
        eyebrow="Sesi tepat level"
        title="Beranda"
        description="Siapkan paket adaptif, jalankan sesi, lalu gunakan bantuan mengajar sesuai kebutuhan kelas."
      />
      <div className="grid gap-6 md:grid-cols-[1.35fr_1fr]">
        <section
          aria-labelledby="kelas-heading"
          className="flex flex-col rounded-kartu border border-pn-ink-400/40 bg-card p-6 sm:p-8"
        >
          <div className="mb-6 flex size-16 items-center justify-center rounded-kartu bg-pn-teal-100 text-primary">
            <School aria-hidden="true" size={32} strokeWidth={2} />
          </div>
          <TeacherWorkspace />
        </section>
        <section
          aria-labelledby="layar-heading"
          className="flex flex-col rounded-kartu bg-pn-teal-100 p-6 sm:p-8"
        >
          <Monitor
            aria-hidden="true"
            className="mb-6 text-primary"
            size={32}
            strokeWidth={2}
          />
          <h2
            id="layar-heading"
            className="mb-3 text-[22px] leading-7 font-bold"
          >
            Layar Kelas
          </h2>
          <p className="mb-6 text-muted-foreground">
            Buka tampilan untuk papan interaktif, proyektor, atau TV.
          </p>
          <Button asChild className="mt-auto w-full">
            <a href="/layar">
              Buka Layar Kelas
              <ArrowUpRight aria-hidden="true" size={20} />
            </a>
          </Button>
          <p className="mt-3 text-sm leading-5 text-muted-foreground">
            Masukkan kode papan dari sesi demo di HP guru. Pairing memerlukan
            internet.
          </p>
        </section>
      </div>
      <section
        aria-labelledby="sesi-heading"
        className="mt-8 flex items-start gap-4 border-t border-pn-ink-400/30 pt-6"
      >
        <BookOpen
          aria-hidden="true"
          size={24}
          className="mt-1 shrink-0 text-primary"
        />
        <div>
          <h2
            id="sesi-heading"
            className="mb-2 text-lg leading-6 font-semibold"
          >
            Sesi Tepat Level
          </h2>
          <p className="max-w-2xl text-muted-foreground">
            Memahami bersama, mencoba di stasiun, lalu merefleksikan gunanya.
            Siswa belajar dengan Kartu Nalar dan papan kelas.
          </p>
        </div>
      </section>
      <PrintCards />
    </div>
  );
}
