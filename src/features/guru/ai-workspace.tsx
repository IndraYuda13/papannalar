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
import type { StepId } from "@/content/ladder/registry";

export function AiWorkspace({
  pkg,
  scope,
  onUpdated,
  preferredStep,
  onViewTasks,
  session,
}: {
  pkg?: TeacherPackage;
  scope: LocalScope;
  onUpdated: (value: TeacherPackage) => void;
  preferredStep: string;
  onViewTasks: (stepId: StepId) => void;
  session?: { classId: string; sessionId: string };
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
          Ubah tugas mandiri menjadi soal cerita
        </h3>
        <p>
          Gunakan ketika ingin mengaitkan matematika dengan kehidupan
          sehari-hari. Pilih topik dan tema, lihat perbandingan soal, lalu
          simpan cerita yang cocok. Cerita dipakai pada tugas mandiri dan PDF
          yang Anda unduh.
        </p>
        {pkg ? (
          <EnrichmentControls
            key={pkg.id}
            pkg={pkg}
            scope={scope}
            disabled={false}
            onUpdated={onUpdated}
            preferredStep={preferredStep}
            onViewTasks={onViewTasks}
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
          Pilih kesulitan siswa, lalu baca pertanyaan dan peragaan yang bisa
          Anda gunakan.{" "}
          {session
            ? "Tombol Minta saran AI di bawah meminta bantuan berdasarkan kartu tersebut untuk sesi yang sedang berjalan."
            : "Pilih Mulai mengajar untuk membuka tombol Minta saran AI. Kartu di bawah dapat dibaca sekarang tanpa AI."}
        </p>
        <StaticBisik context={session ? { scope, ...session } : undefined} />
        {!session && (
          <Button
            variant="outline"
            onClick={() => openTeacherActivity("teacher-teach")}
          >
            Mulai sesi untuk meminta saran AI
          </Button>
        )}
      </section>
    </div>
  );
}
