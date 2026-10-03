"use client";
import { useEffect, useRef, useState } from "react";
import type { TeacherPackage } from "@/core/package/build";
import { applyPackageStories } from "@/core/package/enrichment";
import { toPackageRecipe } from "@/contracts/sync-package";
import { enrichResponseSchema } from "@/contracts/bisik";
import { createPackageRepository } from "@/local/packages";
import type { LocalScope } from "@/local/scope";
import { Button } from "@/ui/components/button";
import { applyStory } from "@/content/contexts/story-frames";
import { promptText } from "@/content/templates/format";
import { aiFallbackMessage } from "@/features/guru/ai-messages";
export function EnrichmentControls({
  pkg,
  scope,
  onUpdated,
  disabled,
}: {
  pkg: TeacherPackage;
  scope: LocalScope;
  onUpdated(value: TeacherPackage): void;
  disabled: boolean;
}) {
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const [result, setResult] =
    useState<ReturnType<typeof enrichResponseSchema.parse>>();
  const pending = useRef<AbortController | null>(null);
  useEffect(() => () => pending.current?.abort(), []);
  async function ask() {
    if (pkg.frozen || busy) return;
    if (!navigator.onLine) {
      setMessage("Tanpa internet: soal dibuat dari templat, tanpa cerita AI.");
      return;
    }
    const controller = new AbortController();
    pending.current = controller;
    setBusy(true);
    setResult(undefined);
    const timer = setTimeout(() => controller.abort(), 30000);
    try {
      const response = await fetch("/api/v1/llm/enrich", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        signal: controller.signal,
        body: JSON.stringify({
          requestId: crypto.randomUUID(),
          recipe: toPackageRecipe(pkg),
        }),
      });
      if (!response.ok) throw new Error();
      const data = enrichResponseSchema.parse(await response.json());
      if (data.packageId !== pkg.id || data.revision !== pkg.revision)
        throw new Error();
      if (data.status === "ai")
        applyPackageStories(pkg, data.revision, data.stories);
      setResult(data);
      setMessage(
        data.status === "ai"
          ? "Pratinjau cerita AI. Periksa makna sebelum menerapkan."
          : `Cerita AI belum tersedia. ${aiFallbackMessage(data.reason)} Latihan tetap bisa dibaca tanpa cerita AI.`,
      );
    } catch {
      setMessage(
        "Cerita soal tidak tersedia. Soal tetap siap tanpa cerita AI.",
      );
    } finally {
      clearTimeout(timer);
      pending.current = null;
      setBusy(false);
    }
  }
  async function apply() {
    if (!result || result.status !== "ai" || !result.stories.length) return;
    setBusy(true);
    const repo = createPackageRepository(scope);
    try {
      const current = await repo.read(pkg.id);
      if (!current) throw new Error();
      const next = applyPackageStories(
        current,
        result.revision,
        result.stories,
      );
      await repo.save(next, current.revision);
      onUpdated(next);
      setResult(undefined);
      setMessage(
        "Cerita tersimpan di perangkat. Angka dan jawaban soal tetap sama.",
      );
    } catch {
      setMessage("Paket sudah berubah atau beku. Cerita tidak diterapkan.");
    } finally {
      repo.close();
      setBusy(false);
    }
  }
  return (
    <div aria-label="Cerita Paket Sesi" className="space-y-2">
      <Button
        variant="outline"
        disabled={disabled || busy || pkg.frozen}
        onClick={() => void ask()}
      >
        Pratinjau cerita AI
      </Button>
      {busy && (
        <Button variant="outline" onClick={() => pending.current?.abort()}>
          Batalkan cerita
        </Button>
      )}
      {result?.status === "ai" && (
        <div>
          {result.stories.map((s) => {
            const q = pkg.activities
              .flatMap((a) => a.independent)
              .find((q) => q.id === s.questionId);
            return q ? (
              <p key={s.questionId}>
                {promptText(applyStory(q, s.choice).prompt)}
              </p>
            ) : null;
          })}
          <p>Cerita dipilih AI dari frame terkurasi; angka diperiksa kode.</p>
          <Button disabled={busy || pkg.frozen} onClick={() => void apply()}>
            Makna sesuai · terapkan cerita
          </Button>
          <Button variant="outline" onClick={() => setResult(undefined)}>
            Gunakan templat saja
          </Button>
        </div>
      )}
      <p role="status">{message}</p>
    </div>
  );
}
