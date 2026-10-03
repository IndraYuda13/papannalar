"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Sparkles, Check } from "lucide-react";
import type { TeacherPackage } from "@/core/package/build";
import { applyPackageStories } from "@/core/package/enrichment";
import { toPackageRecipe } from "@/contracts/sync-package";
import { enrichResponseSchema } from "@/contracts/bisik";
import { createPackageRepository } from "@/local/packages";
import type { LocalScope } from "@/local/scope";
import { Button } from "@/ui/components/button";
import {
  applyStory,
  storyFramesFor,
  STORY_FRAME_LABELS,
  type StoryFrameId,
} from "@/content/contexts/story-frames";
import { promptText } from "@/content/templates/format";
import { getStep, type StepId } from "@/content/ladder/registry";
import { aiFallbackMessage } from "@/features/guru/ai-messages";
export function EnrichmentControls({
  pkg,
  scope,
  onUpdated,
  disabled,
  preferredStep,
  onViewTasks,
}: {
  pkg: TeacherPackage;
  scope: LocalScope;
  onUpdated(value: TeacherPackage): void;
  disabled: boolean;
  preferredStep?: string;
  onViewTasks: (stepId: StepId) => void;
}) {
  const eligible = pkg.activities.filter((a) =>
    a.independent.some((q) => storyFramesFor(q).length && !q.story),
  );
  const [chosenStep, setStepId] = useState<StepId | undefined>(
    () =>
      eligible.find((a) => a.stepId === preferredStep)?.stepId ??
      eligible.find((a) => a.stepId === "D1")?.stepId ??
      eligible[0]?.stepId,
  );
  const stepId =
    eligible.find((a) => a.stepId === chosenStep)?.stepId ??
    eligible[0]?.stepId;
  const [context, setContext] = useState<StoryFrameId | "mixed">("mixed");
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const [result, setResult] =
    useState<ReturnType<typeof enrichResponseSchema.parse>>();
  const [selected, setSelected] = useState<string[]>([]);
  const [appliedStep, setAppliedStep] = useState<StepId>();
  const pending = useRef<AbortController | null>(null);
  useEffect(() => () => pending.current?.abort(), [pkg.id, pkg.revision]);
  const activity = pkg.activities.find((a) => a.stepId === stepId);
  const contexts = activity
    ? [...new Set(activity.independent.flatMap(storyFramesFor))]
    : [];
  async function ask() {
    if (pkg.frozen || busy || !stepId) return;
    if (!navigator.onLine) {
      setMessage(
        "Tanpa internet: soal yang sudah disiapkan tetap tersedia. Cerita AI membutuhkan internet.",
      );
      return;
    }
    const controller = new AbortController();
    pending.current = controller;
    setBusy(true);
    setResult(undefined);
    setAppliedStep(undefined);
    setMessage("AI sedang memilih cerita untuk tugas mandiri…");
    const timer = setTimeout(() => controller.abort(), 30000);
    const requestId = crypto.randomUUID();
    try {
      const response = await fetch("/api/v1/llm/enrich", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        signal: controller.signal,
        body: JSON.stringify({
          requestId,
          recipe: toPackageRecipe(pkg),
          stepId,
          ...(context !== "mixed" ? { context } : {}),
        }),
      });
      if (!response.ok) throw new Error();
      const data = enrichResponseSchema.parse(await response.json());
      controller.signal.throwIfAborted();
      if (
        data.requestId !== requestId ||
        data.packageId !== pkg.id ||
        data.revision !== pkg.revision
      )
        throw new Error();
      if (data.status === "ai") {
        if (
          data.stories.some(
            (s) =>
              !activity?.independent.some((q) => q.id === s.questionId) ||
              (context !== "mixed" && s.choice.frameId !== context),
          )
        )
          throw new Error();
        applyPackageStories(pkg, data.revision, data.stories);
      }
      setResult(data);
      setSelected(data.stories.map((s) => s.questionId));
      setMessage(
        data.status === "ai"
          ? "Pilihan cerita siap. Bandingkan dengan soal semula, lalu pilih yang ingin disimpan."
          : `Cerita AI belum tersedia. ${aiFallbackMessage(data.reason)} Soal semula tetap dapat digunakan.`,
      );
    } catch {
      setMessage(
        controller.signal.aborted
          ? "Permintaan cerita dihentikan. Soal semula tetap tersimpan."
          : "Cerita belum dapat dibuat. Periksa layanan AI atau gunakan soal semula.",
      );
    } finally {
      clearTimeout(timer);
      pending.current = null;
      setBusy(false);
    }
  }
  async function apply() {
    if (!result || result.status !== "ai" || !selected.length || !stepId)
      return;
    setBusy(true);
    const repo = createPackageRepository(scope);
    try {
      const current = await repo.read(pkg.id);
      if (!current) throw new Error();
      const stories = result.stories.filter((s) =>
        selected.includes(s.questionId),
      );
      const next = applyPackageStories(current, result.revision, stories);
      await repo.save(next, current.revision);
      onUpdated(next);
      setResult(undefined);
      setAppliedStep(stepId);
      setMessage(
        `${stories.length} soal cerita tersimpan pada tugas mandiri ${getStep(stepId).label}. Buka tugas atau unduh PDF untuk memakainya. Angka dan jawabannya tetap sama.`,
      );
    } catch {
      setResult(undefined);
      setMessage(
        "Soal sudah berubah atau sesi sudah dimulai. Cerita tidak disimpan; buat pilihan baru dari latihan yang belum digunakan.",
      );
    } finally {
      repo.close();
      setBusy(false);
    }
  }
  return (
    <div aria-label="Cerita Paket Sesi" className="space-y-4">
      {pkg.frozen ? (
        <p>
          Soal sudah digunakan dalam sesi. Cerita tidak dapat diubah selama sesi
          tersebut. Siapkan latihan baru untuk mencoba cerita lain.
        </p>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="practice-field">
              Topik soal cerita
              <select
                aria-label="Topik soal cerita"
                disabled={busy}
                value={stepId ?? ""}
                onChange={(e) => {
                  setStepId(e.target.value as StepId);
                  setContext("mixed");
                  setResult(undefined);
                  setAppliedStep(undefined);
                  setMessage("");
                }}
              >
                {eligible.map((a) => (
                  <option key={a.stepId} value={a.stepId}>
                    {getStep(a.stepId).label}
                  </option>
                ))}
              </select>
            </label>
            <label className="practice-field">
              Tema cerita
              <select
                aria-label="Tema cerita"
                disabled={busy || !eligible.length}
                value={context}
                onChange={(e) => {
                  setContext(e.target.value as StoryFrameId | "mixed");
                  setResult(undefined);
                  setMessage("");
                }}
              >
                <option value="mixed">Variasikan tema yang tersedia</option>
                {contexts.map((id) => (
                  <option key={id} value={id}>
                    {STORY_FRAME_LABELS[id]}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {!eligible.length && (
            <p>
              Semua soal yang mendukung cerita sudah diberi cerita. Siapkan
              latihan baru untuk mencoba lagi.
            </p>
          )}
          <p className="text-sm text-muted-foreground">
            AI memilih cerita untuk paling banyak 3 soal tugas mandiri pada
            topik ini. Pilihan muncul di sini dahulu; soal berubah setelah Anda
            menyimpannya.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              disabled={disabled || busy || !eligible.length}
              onClick={() => void ask()}
            >
              <Sparkles size={18} aria-hidden />
              Buat pilihan cerita
            </Button>
            {busy && (
              <Button
                variant="outline"
                onClick={() => pending.current?.abort()}
              >
                Batalkan permintaan
              </Button>
            )}
          </div>
        </>
      )}
      {result?.status === "ai" && (
        <section aria-label="Bandingkan pilihan cerita" className="space-y-3">
          {result.stories.map((s) => {
            const index =
              activity?.independent.findIndex((q) => q.id === s.questionId) ??
              -1;
            const q = activity?.independent[index];
            return q ? (
              <article key={s.questionId} className="story-comparison">
                <label className="flex min-h-12 items-center gap-3 font-bold">
                  <input
                    type="checkbox"
                    className="h-5 w-5"
                    checked={selected.includes(q.id)}
                    disabled={busy}
                    onChange={(e) =>
                      setSelected((ids) =>
                        e.target.checked
                          ? [...ids, q.id]
                          : ids.filter((id) => id !== q.id),
                      )
                    }
                  />
                  Tugas mandiri · soal {index + 1}
                </label>
                <div className="story-comparison-text">
                  <div>
                    <span className="text-sm font-semibold text-muted-foreground">
                      Soal semula
                    </span>
                    <p>{promptText(q.prompt)}</p>
                  </div>
                  <ArrowRight size={20} aria-hidden />
                  <div>
                    <span className="text-sm font-semibold text-primary">
                      Pilihan cerita · {STORY_FRAME_LABELS[s.choice.frameId]}
                    </span>
                    <p>{promptText(applyStory(q, s.choice).prompt)}</p>
                  </div>
                </div>
              </article>
            ) : null;
          })}
          <p className="text-sm">
            Baca cerita dan pastikan maksudnya sesuai. Menyimpan cerita
            mengganti teks soal tugas mandiri yang dicentang; soal cek dan
            pertanyaan pembuka tetap seperti semula.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={busy || pkg.frozen || !selected.length}
              onClick={() => void apply()}
            >
              <Check size={18} aria-hidden />
              Simpan {selected.length} soal cerita
            </Button>
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => {
                setResult(undefined);
                setMessage("Pilihan dibuang. Soal semula tetap tersimpan.");
              }}
            >
              Batal · pertahankan soal semula
            </Button>
          </div>
        </section>
      )}
      {message && (
        <p role="status" className="practice-feedback">
          {message}
        </p>
      )}
      {appliedStep && (
        <Button variant="outline" onClick={() => onViewTasks(appliedStep)}>
          Lihat tugas dengan cerita tersimpan
          <ArrowRight size={18} aria-hidden />
        </Button>
      )}
    </div>
  );
}
