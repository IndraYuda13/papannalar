"use client";
import { useState } from "react";
import type { LocalScope } from "@/local/scope";
import { BisikControls } from "@/features/guru/bisik-controls";
import {
  getStrategy,
  MISCONCEPTION_CODES,
} from "@/content/strategies/registry";
export function StaticBisik({
  code,
  context,
}: {
  code?: string;
  context?: { scope: LocalScope; classId: string; sessionId: string };
}) {
  const [selected, setSelected] = useState(code ?? "generic-error");
  const strategy = getStrategy(code ?? selected);
  return (
    <section
      aria-label="Bisik statis"
      className="space-y-3 rounded-kartu bg-pn-teal-100 p-4"
    >
      <h4 className="font-bold">Bisik · kartu strategi</h4>
      {!code && (
        <label className="block">
          Kode sumber
          <select
            aria-label="Kode Bisik"
            className="min-h-12 w-full border bg-white px-3"
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
          >
            <option value="generic-error">Tanpa diagnosis khusus</option>
            {MISCONCEPTION_CODES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
      )}
      <p className="font-semibold">{strategy.title}</p>
      <p className="text-sm">
        Sumber: {strategy.code} · Draft, belum direview manusia · tersedia
        offline.
      </p>
      <ol className="list-inside list-decimal space-y-1">
        {strategy.prompts.map((p) => (
          <li key={p}>{p}</li>
        ))}
      </ol>
      <p>
        <strong>Peragaan:</strong> {strategy.demonstrate}
      </p>
      <p>
        <strong>Cek cepat:</strong> {strategy.quickCheck.prompt}
      </p>
      <details>
        <summary className="min-h-12 cursor-pointer">
          Catatan jawaban guru
        </summary>
        {strategy.quickCheck.teacherAnswer}
      </details>
      {context && (
        <BisikControls
          key={`${context.sessionId}:${strategy.code}`}
          scope={context.scope}
          classId={context.classId}
          sessionId={context.sessionId}
          code={strategy.code}
        />
      )}
    </section>
  );
}
