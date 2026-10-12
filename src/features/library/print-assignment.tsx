"use client";
import { useState } from "react";
import type { LibraryRunV2 } from "@/contracts/library";
import { toPrintAssignment } from "@/core/library/print-assignment";
import { Button } from "@/ui/components/button";
export function AssignmentPrint({ run }: { run: LibraryRunV2 }) {
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const print = toPrintAssignment(run);
  async function download(kind: "questions" | "cards") {
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/fonts/atkinson-card.woff");
      if (!response.ok) throw new Error("FONT_UNAVAILABLE");
      const font = new Uint8Array(await response.arrayBuffer());
      const bytes =
        kind === "questions"
          ? await (
              await import("./question-sheet-pdf")
            ).createQuestionSheetPdf(print, font)
          : await (
              await import("@/cards/pdf/create")
            ).createCardPdf("weekly", font, print.binding);
      const url = URL.createObjectURL(
        new Blob([new Uint8Array(bytes)], { type: "application/pdf" }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = `${kind === "questions" ? "lembar-soal" : "kartu-jawaban"}-${run.formId}-v${run.version}.pdf`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMessage(
        "Unduhan siap. Periksa kode tugas pada lembar soal dan kartu, lalu cetak ukuran asli 100%.",
      );
    } catch {
      setMessage(
        "Cetakan belum dapat diunduh. Periksa sambungan, lalu coba lagi.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <details>
      <summary className="min-h-12 cursor-pointer content-center font-semibold">
        Siapkan cetakan
      </summary>
      <div className="space-y-3">
        <p>
          {print.title} · Kode tugas {print.code} · {print.items.length} soal
        </p>
        <p className="text-sm">
          Kartu Nalar adalah lembar jawaban. Bagikan lembar soal dan satu kartu
          kepada setiap siswa. Cetak kartu ukuran asli 100%, bukan sesuaikan
          halaman.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => void download("questions")}
          >
            Unduh lembar soal
          </Button>
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => void download("cards")}
          >
            Unduh kartu jawaban
          </Button>
        </div>
        <p role="status">{message}</p>
      </div>
    </details>
  );
}
