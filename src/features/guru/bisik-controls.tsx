"use client";
import { useEffect, useRef, useState } from "react";
import type { LocalScope } from "@/local/scope";
import { createNameRepository } from "@/local/names";
import { saveBisikFeedback } from "@/local/bisik-feedback";
import {
  bisikResponseSchema,
  llmStatusSchema,
  serializeBisik,
  strategyCodeSchema,
} from "@/contracts/bisik";
import { Button } from "@/ui/components/button";
import { previewBisikQuestion } from "./bisik-privacy";
import { aiFallbackMessage } from "./ai-messages";
export function BisikControls({
  scope,
  classId,
  sessionId,
  code,
}: {
  scope: LocalScope;
  classId: string;
  sessionId: string;
  code: string;
}) {
  const [raw, setRaw] = useState(""),
    [preview, setPreview] = useState<string>();
  const [freeText, setFreeText] = useState(false),
    [busy, setBusy] = useState(false);
  const [result, setResult] =
    useState<ReturnType<typeof bisikResponseSchema.parse>>();
  const [message, setMessage] = useState("");
  const active = useRef<AbortController | null>(null);
  useEffect(() => {
    if (!navigator.onLine) return;
    const controller = new AbortController();
    void fetch("/api/v1/llm/status", {
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (r) => {
        if (r.ok) {
          const status = llmStatusSchema.parse(await r.json());
          setFreeText(status.freeText);
        }
      })
      .catch(() => {
        /* Static card is already rendered, no offline error log. */
      });
    return () => {
      controller.abort();
      active.current?.abort();
    };
  }, []);
  async function makePreview() {
    setPreview(undefined);
    setMessage("");
    const names = createNameRepository(scope);
    try {
      const rows = await names.readAll();
      const checked = previewBisikQuestion(
        raw,
        rows.map((r) => r.displayName),
      );
      if (!checked.ok) {
        setMessage(
          "Hapus identitas, kontak, atau instruksi pribadi sebelum membuat pratinjau.",
        );
        return;
      }
      setPreview(checked.text);
      setMessage(
        freeText
          ? "Periksa pratinjau, lalu kirim hanya bila tidak ada identitas."
          : "Pratinjau hanya lokal. Tanya bebas belum diaktifkan karena review privasi belum selesai.",
      );
    } catch {
      setMessage("Nama lokal belum dapat diperiksa. Pertanyaan tidak dikirim.");
    } finally {
      names.close();
    }
  }
  async function ask(question?: string) {
    if (busy || (question && !freeText)) return;
    if (!navigator.onLine) {
      setMessage("Tanpa internet: menampilkan kartu strategi yang tersimpan.");
      return;
    }
    const controller = new AbortController();
    active.current = controller;
    setBusy(true);
    const timer = setTimeout(() => controller.abort(), 5000);
    setMessage("Bisik sedang menyusun saran.");
    try {
      if (question) {
        const names = createNameRepository(scope);
        try {
          const rows = await names.readAll();
          const checked = previewBisikQuestion(
            question,
            rows.map((r) => r.displayName),
          );
          if (!checked.ok) {
            setPreview(undefined);
            setMessage("Hapus identitas sebelum mengirim pertanyaan.");
            return;
          }
          question = checked.text;
        } finally {
          names.close();
        }
      }
      controller.signal.throwIfAborted();
      const response = await fetch("/api/v1/llm/bisik", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        cache: "no-store",
        body: serializeBisik({
          requestId: crypto.randomUUID(),
          classId,
          sessionId,
          code: strategyCodeSchema.parse(code),
          ...(question ? { question } : {}),
        }),
      });
      if (!response.ok) throw new Error();
      const value = bisikResponseSchema.parse(await response.json());
      if (controller.signal.aborted) return;
      setResult(value);
      setMessage(
        value.status === "ai"
          ? "Saran AI berdasarkan kartu sumber. Tinjau sebelum digunakan."
          : `AI belum tersedia untuk kartu ini. ${aiFallbackMessage(value.reason)} Kartu saran tetap dapat digunakan.`,
      );
    } catch {
      if (active.current === controller)
        setMessage(
          "Saran online belum tersedia. Gunakan kartu strategi yang tersimpan.",
        );
    } finally {
      clearTimeout(timer);
      if (active.current === controller) {
        setBusy(false);
        active.current = null;
      }
    }
  }
  async function feedback(helpful: boolean) {
    try {
      await saveBisikFeedback(scope, {
        classId,
        sessionId,
        code: strategyCodeSchema.parse(code),
        helpful,
        requestId: result?.status === "ai" ? result.requestId : null,
      });
      setMessage("Penilaian saran tersimpan lokal.");
      if (result?.status === "ai" && navigator.onLine) {
        const response = await fetch("/api/v1/llm/feedback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            classId,
            requestId: result.requestId,
            helpful,
          }),
          signal: AbortSignal.timeout(2000),
        });
        if (!response.ok)
          setMessage(
            "Penilaian tersimpan lokal; kirim ulang saat layanan tersedia.",
          );
      }
    } catch {
      setMessage(
        "Penilaian belum tersimpan online. Periksa penyimpanan lokal.",
      );
    }
  }
  return (
    <div
      aria-label="Kendali Bisik"
      className="studio-panel bg-white p-4 min-w-0 space-y-3 [&_button]:w-full [&_button]:max-w-full"
    >
      <Button disabled={busy} onClick={() => void ask()}>
        Minta saran AI
      </Button>
      {busy && (
        <Button variant="outline" onClick={() => active.current?.abort()}>
          Batal
        </Button>
      )}
      {result?.status === "ai" && (
        <div>
          <p>{result.answer}</p>
          <p>Sumber: {result.sourceStrategyIds.join(", ")}</p>
        </div>
      )}
      <details>
        <summary className="min-h-12 cursor-pointer font-semibold">
          Tanya tentang cara mengajar
        </summary>
        <label className="block">
          Pertanyaan tambahan · jangan sertakan nama siswa
          <textarea
            aria-label="Pertanyaan Bisik lokal"
            className="mt-1 min-h-24 w-full rounded-input border bg-white p-3"
            maxLength={500}
            placeholder="Contoh: bagaimana menjelaskan pengurangan bilangan negatif?"
            value={raw}
            onChange={(e) => {
              setRaw(e.target.value);
              setPreview(undefined);
            }}
          />
        </label>
        <Button
          variant="outline"
          disabled={busy}
          onClick={() => void makePreview()}
        >
          Periksa pratinjau lokal
        </Button>
        {preview && (
          <div aria-label="Pratinjau Bisik">
            <p>{preview}</p>
            <p>
              Pastikan tidak ada nama atau identitas, termasuk nama yang belum
              tersimpan di perangkat.
            </p>
            <Button
              disabled={!freeText || busy}
              onClick={() => void ask(preview)}
            >
              Kirim pertanyaan tanpa identitas
            </Button>
          </div>
        )}
        {!freeText && (
          <p>
            Tanya bebas belum aktif: menunggu review privasi. Kartu statis tetap
            tersedia.
          </p>
        )}
      </details>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => void feedback(true)}>
          Berguna
        </Button>
        <Button variant="outline" onClick={() => void feedback(false)}>
          Tidak berguna
        </Button>
      </div>
      <p role="status">{message}</p>
    </div>
  );
}
