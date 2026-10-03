"use client";
import { useEffect, useState } from "react";
import type { PresentationState } from "@/contracts/presentation";
import { MathPrompt } from "@/ui/components/math-prompt";
import {
  QuestionVisual,
  needsQuestionVisual,
} from "@/features/layar/question-visual";
export function CheckBoard({ state }: { state: PresentationState }) {
  const value = state.check!;
  const [remaining, setRemaining] = useState(value.seconds as number);
  useEffect(() => {
    const started = performance.now();
    const timer = setInterval(
      () =>
        setRemaining(
          Math.max(
            0,
            value.seconds - Math.floor((performance.now() - started) / 1000),
          ),
        ),
      250,
    );
    return () => clearInterval(timer);
  }, [value.seconds]);
  return (
    <section aria-label="Soal cek paket" className="w-full space-y-8">
      <p className="text-[32px]">
        {value.total === 10 ? "Cek pertama" : "Cek lanjutan"} · Soal{" "}
        {state.question}/{value.total} · Baris {state.question} pada kartu ·{" "}
        {remaining} detik
      </p>
      <h1 className="text-[56px] font-bold">
        <MathPrompt value={value.question.prompt} />
      </h1>
      {needsQuestionVisual(state) && (
        <QuestionVisual prompt={value.question.prompt} />
      )}
      <div className="grid grid-cols-2 gap-6 text-[48px]">
        {value.question.options.map((o) => (
          <p
            key={o.label}
            className="min-h-24 rounded-kartu border-4 border-primary p-4"
          >
            {o.label}. {o.text}
          </p>
        ))}
      </div>
      <p className="text-[40px]">?. Belum tahu</p>
      <p className="text-[28px]">
        Isi satu pilihan. Saat waktu habis, tunggu arahan guru.
      </p>
    </section>
  );
}
