"use client";
import { useEffect, useState } from "react";
import type { PresentationState } from "@/contracts/presentation";
import { MathPrompt } from "@/ui/components/math-prompt";
import {
  QuestionVisual,
  needsQuestionVisual,
} from "@/features/layar/question-visual";

/** B9: the timer's urgency is a static 700-weight figure plus a 2px ink underline. No pulse,
 *  no colour cycling, no sound, and no auto-advance — the room is told the time, not alarmed. */
const URGENT_AT = 10;

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
  const expired = remaining <= 0;
  return (
    <section
      aria-label="Soal cek paket"
      className="board-check"
      data-beat="question"
    >
      <h1 className="board-heading board-question" data-board-question>
        <MathPrompt value={value.question.prompt} />
      </h1>
      <div className="board-options board-options-grid" data-board-options>
        {value.question.options.map((o) => (
          <p key={o.label} className="board-option-row">
            <span className="board-option-mark">{o.label}</span>
            <span className="board-option-text">{o.text}</span>
          </p>
        ))}
      </div>
      <p className="board-option-row board-option-row-unknown">
        <span className="board-option-mark board-option-mark-unknown">?</span>
        <span className="board-option-text">Belum tahu</span>
      </p>
      {needsQuestionVisual(state) && (
        <QuestionVisual prompt={value.question.prompt} />
      )}

      <p className="board-note board-position-band">
        {value.total === 10 ? "Cek pertama" : "Cek lanjutan"} · Soal{" "}
        {state.question}/{value.total} · Baris {state.question} pada kartu ·{" "}
        {expired ? "waktu habis" : `${remaining} detik`}
      </p>
      <p
        className="board-note board-instruction-line"
        data-urgent={remaining <= URGENT_AT ? "true" : "false"}
        data-expired={expired ? "true" : "false"}
      >
        {expired
          ? "Tunggu arahan guru sebelum lanjut."
          : "Kerjakan pada kartu. Tunggu arahan guru saat waktu habis."}
      </p>
    </section>
  );
}
