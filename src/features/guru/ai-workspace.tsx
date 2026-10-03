"use client";
import { useEffect, useState } from "react";
import { Sparkles, MessageCircle, BookOpen } from "lucide-react";
import { llmStatusSchema } from "@/contracts/bisik";
import type { TeacherPackage } from "@/core/package/build";
import type { LocalScope } from "@/local/scope";
import { EnrichmentControls } from "@/features/package/enrichment-controls";
import { StaticBisik } from "@/features/bisik/static-card";
import { Button } from "@/ui/components/button";
import { openTeacherActivity } from "./activity-disclosure";

export function AiWorkspace({
  pkg,
  scope,
  onUpdated,
}: {
  pkg?: TeacherPackage;
  scope: LocalScope;
  onUpdated: (value: TeacherPackage) => void;
}) {
  const [status, setStatus] =
    useState<ReturnType<typeof llmStatusSchema.parse>>();
  const [unavailable, setUnavailable] = useState(false);
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    let controller = new AbortController();
    async function check() {
      controller.abort();
      controller = new AbortController();
      const active = controller;
      setOffline(!navigator.onLine);
      setUnavailable(false);
      setStatus(undefined);
      if (!navigator.onLine) return;
      try {
        const response = await fetch("/api/v1/llm/status", {
          cache: "no-store",
          signal: AbortSignal.any([active.signal, AbortSignal.timeout(5000)]),
        });
        if (!response.ok) throw new Error();
        const value = llmStatusSchema.parse(await response.json());
        if (!active.signal.aborted) setStatus(value);
      } catch {
        if (!active.signal.aborted) setUnavailable(true);
      }
    }
    void check();
    window.addEventListener("online", check);
    window.addEventListener("offline", check);
    return () => {
      controller.abort();
      window.removeEventListener("online", check);
      window.removeEventListener("offline", check);
    };
  }, []);
  const statusText = offline
    ? "Tanpa internet: gunakan kartu saran yang tersimpan."
    : unavailable
      ? "Status AI belum dapat diperiksa. Kartu saran tetap tersedia."
      : !status
        ? "Memeriksa layanan AI…"
        : status.configuration === "invalid"
          ? "Pengaturan AI perlu diperbaiki. Kartu saran tetap tersedia."
          : !status.configured
            ? "AI belum diaktifkan. Kartu saran tetap bisa digunakan."
            : !status.budgetEnabled
              ? "Layanan AI belum dapat digunakan. Kartu saran tetap tersedia."
              : !status.contentEligible
                ? "Pengaturan AI sudah terisi. Materi perlu ditinjau sebelum AI dapat digunakan."
                : "Pengaturan AI sudah terisi. Hasil setiap permintaan tetap perlu diperiksa.";
  return (
    <div className="space-y-5">
      <p role="status" className="teacher-ai-status">
        <Sparkles size={20} aria-hidden />
        {statusText}
      </p>
      <section className="space-y-3" aria-label="AI untuk cerita soal">
        <h3 className="flex items-center gap-2 text-lg font-bold">
          <BookOpen size={22} aria-hidden />
          Buat cerita untuk soal
        </h3>
        <p>
          AI memilih cerita keseharian untuk latihan yang sudah disiapkan.
          Periksa ceritanya sebelum menerapkan; angka dan jawaban tetap
          mengikuti soal.
        </p>
        {pkg ? (
          <EnrichmentControls
            key={`${pkg.id}:${pkg.revision}`}
            pkg={pkg}
            scope={scope}
            disabled={false}
            onUpdated={onUpdated}
          />
        ) : (
          <Button onClick={() => openTeacherActivity("teacher-prepare")}>
            Siapkan latihan dahulu
          </Button>
        )}
      </section>
      <section className="space-y-3" aria-label="Bantuan cara mengajar">
        <h3 className="flex items-center gap-2 text-lg font-bold">
          <MessageCircle size={22} aria-hidden />
          Cari cara menjelaskan
        </h3>
        <p>
          Pilih kesulitan yang ditemui untuk membaca kartu saran. Saat rotasi
          sesi berjalan, gunakan tombol “Minta saran AI” pada bantuan guru untuk
          menyesuaikan saran dengan sesi tersebut.
        </p>
        <StaticBisik />
        <Button
          variant="outline"
          onClick={() => openTeacherActivity("teacher-teach")}
        >
          Buka kegiatan mengajar
        </Button>
      </section>
      <details className="text-sm">
        <summary className="min-h-12 cursor-pointer font-semibold">
          Panduan pengelola AI
        </summary>
        <p className="mb-3">
          Konfigurasikan endpoint, model dan kunci di server, lalu lengkapi
          anggaran serta review materi dan privasi. Data contoh dapat memakai AI
          melalui pengaturan yang sama. Status konfigurasi bukan bukti bahwa
          provider sudah diuji.
        </p>
        <a
          href="https://github.com/IndraYuda13/papannalar/blob/main/UI_AI_HANDOFF.md"
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-12 items-center font-semibold text-primary underline"
        >
          Baca panduan konfigurasi
        </a>
      </details>
    </div>
  );
}
