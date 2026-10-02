"use client";
import { useState } from "react";
import {
  CARD_KINDS,
  cardLayout,
  type CardKind,
} from "@/cards/layouts/layout-v1";
import { Button } from "@/ui/components/button";

export function PrintCards() {
  const [kind, setKind] = useState<CardKind>("weekly");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
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
        kind,
        new Uint8Array(await response.arrayBuffer()),
      );
      const url = URL.createObjectURL(
        new Blob([new Uint8Array(bytes)], { type: "application/pdf" }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = `papannalar-${kind}-A4.pdf`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMessage("PDF siap. Cetak 100% / ukuran asli, hitam putih.");
    } catch {
      setMessage("PDF belum tersedia. Coba kembali setelah font tersimpan.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      className="mt-6 border-t border-pn-ink-400/30 pt-6"
      aria-label="Cetak Kartu Nalar"
    >
      <h2 className="mb-3 text-lg font-bold">Cetak Kartu Nalar</h2>
      <label className="block">
        Jenis kartu
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value as CardKind)}
          className="my-2 min-h-12 w-full rounded-input border bg-white px-3"
        >
          {CARD_KINDS.map((kind) => (
            <option key={kind} value={kind}>
              {cardLayout(kind).title}
            </option>
          ))}
        </select>
      </label>
      <Button disabled={busy} onClick={() => void download()}>
        {busy ? "Menyiapkan PDF…" : "Unduh PDF A4"}
      </Button>
      <p className="mt-2 text-sm text-muted-foreground">
        Cek Awal: 2 kartu per lembar. Mingguan dan Keluar: 4 kartu per lembar.
      </p>
      <p role="status" className="mt-2 text-sm">
        {message}
      </p>
    </section>
  );
}
