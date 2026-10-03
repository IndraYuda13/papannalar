"use client";
import { useState } from "react";
import {
  CARD_KINDS,
  cardLayout,
  type CardKind,
} from "@/cards/layouts/layout-v1";
import { Button } from "@/ui/components/button";
import { Printer } from "lucide-react";

export function PrintCards({
  fixedKind,
  count,
  compact = false,
}: { fixedKind?: CardKind; count?: number; compact?: boolean } = {}) {
  const [kind, setKind] = useState<CardKind>("weekly");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const selectedKind = fixedKind ?? kind;
  const perSheet = selectedKind === "initial" ? 2 : 4;
  async function download() {
    setBusy(true);
    setMessage("");
    try {
      const [{ createCardPdf }, response] = await Promise.all([
        import("@/cards/pdf/create"),
        fetch("/fonts/atkinson-card.woff"),
      ]);
      if (!response.ok) throw new Error("FONT_UNAVAILABLE");
      const bytes = await createCardPdf(
        selectedKind,
        new Uint8Array(await response.arrayBuffer()),
      );
      const url = URL.createObjectURL(
        new Blob([new Uint8Array(bytes)], { type: "application/pdf" }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = `papannalar-${selectedKind}-A4.pdf`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMessage("PDF siap. Cetak 100% / ukuran asli, hitam putih.");
    } catch {
      setMessage(
        "Kartu belum bisa diunduh. Sambungkan internet, lalu coba lagi.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      className={
        compact
          ? "space-y-2 rounded-input border border-primary/20 p-3"
          : "mt-6 border-t border-pn-ink-400/30 pt-6"
      }
      aria-label="Cetak Kartu Nalar"
    >
      {!compact && (
        <h2 className="mb-3 text-lg font-bold">Cetak Kartu Nalar</h2>
      )}
      {!fixedKind && (
        <label className="block">
          Jenis kartu
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as CardKind)}
            className="my-2 min-h-12 w-full rounded-input border bg-white px-3"
          >
            {CARD_KINDS.map((kind) => (
              <option key={kind} value={kind}>
                {kind === "initial"
                  ? "Cek pertama · 10 baris"
                  : kind === "weekly"
                    ? "Cek lanjutan · 5 baris"
                    : "Kartu cek akhir · 3 baris"}
              </option>
            ))}
          </select>
        </label>
      )}
      {compact && (
        <p className="text-sm">
          Kartu Nalar adalah lembar jawaban. Siswa mengisi nomor absen dan
          memilih A, B, C, D atau ? untuk soal yang ditampilkan guru.
        </p>
      )}
      <Button disabled={busy} onClick={() => void download()}>
        <Printer size={18} aria-hidden />
        {busy
          ? "Menyiapkan PDF…"
          : compact
            ? `Unduh Kartu Nalar · ${cardLayout(selectedKind).rows} baris`
            : "Unduh PDF A4"}
      </Button>
      <p className="mt-2 text-sm text-muted-foreground">
        {count
          ? `${count} siswa: cetak ${Math.ceil(count / perSheet)} lembar A4 (${perSheet} kartu per lembar), lalu potong. Satu kartu per siswa.`
          : `Cek pertama: 2 kartu per lembar. Cek lanjutan dan cek akhir: 4 kartu per lembar.`}{" "}
        Cetak 100% / ukuran asli, hitam putih.
      </p>
      <p role="status" className="mt-2 text-sm">
        {message}
      </p>
    </section>
  );
}
