"use client";
import { useEffect, useState } from "react";
import type { PresentationEnvelope } from "@/contracts/presentation";
import type { PublicGuidance } from "@/contracts/guidance";
import { guidanceCall } from "@/features/classroom/guidance-transport";
import { Button } from "@/ui/components/button";
export function GuidanceControls({
  env,
  disabled,
  onChange,
}: {
  env: PresentationEnvelope;
  disabled: boolean;
  onChange: (taskEpoch: string, value: PublicGuidance) => Promise<boolean>;
}) {
  const [confirm, setConfirm] = useState(false),
    [reported, setReported] = useState<number>();
  const { presentationId, channelEpoch } = env,
    taskEpoch = env.payload.taskEpoch;
  const guidance = env.payload.guidance ?? { hint: 0, reveal: false };
  useEffect(() => {
    const controller = new AbortController();
    let busy = false;
    async function poll() {
      if (busy || !navigator.onLine || controller.signal.aborted) return;
      busy = true;
      try {
        const value = await guidanceCall(
          "teacher",
          { action: "read", presentationId, channelEpoch, taskEpoch },
          controller.signal,
        );
        if (!controller.signal.aborted)
          setReported(value.active ? value.hint : undefined);
      } catch {
        /* Keep last report labeled as such; current task is guarded by its epoch. */
      } finally {
        busy = false;
      }
    }
    void poll();
    const timer = setInterval(() => void poll(), 1500);
    return () => {
      controller.abort();
      clearInterval(timer);
    };
  }, [presentationId, channelEpoch, taskEpoch]);
  const hint = Math.max(guidance.hint, reported ?? 0);
  return (
    <section
      aria-label="Petunjuk dan jawaban latihan"
      className="space-y-3 rounded-kartu border p-3"
    >
      <p>Petunjuk terakhir dilaporkan papan: {reported ?? "menunggu"}/3</p>
      <div className="flex flex-wrap gap-3">
        <Button
          disabled={disabled || hint >= 3}
          variant="outline"
          onClick={() =>
            void onChange(taskEpoch, {
              hint: Math.min(3, hint + 1),
              reveal: guidance.reveal,
            })
          }
        >
          Petunjuk berikutnya
        </Button>
        {guidance.reveal ? (
          <Button
            disabled={disabled}
            variant="outline"
            onClick={() => void onChange(taskEpoch, { hint, reveal: false })}
          >
            Tutup jawaban latihan
          </Button>
        ) : (
          <Button
            disabled={disabled}
            variant="outline"
            onClick={() => setConfirm(true)}
          >
            Tunjukkan jawaban
          </Button>
        )}
      </div>
      {confirm && (
        <div
          role="alertdialog"
          aria-label="Konfirmasi jawaban latihan"
          className="space-y-3 border-2 border-primary p-3"
        >
          <p>
            Model dan jawaban latihan akan terlihat oleh seluruh kelas. Sudah
            siap membahas caranya?
          </p>
          <div className="flex flex-wrap gap-3">
            <Button
              disabled={disabled}
              onClick={() =>
                void onChange(taskEpoch, { hint, reveal: true }).then((ok) => {
                  if (ok) setConfirm(false);
                })
              }
            >
              Tampilkan jawaban latihan
            </Button>
            <Button variant="outline" onClick={() => setConfirm(false)}>
              Batal
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
