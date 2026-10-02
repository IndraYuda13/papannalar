import type { MathPrompt } from "@/content/templates/types";
import type { PublicTool } from "@/contracts/tools";
import { publicDiagram } from "@/core/package/public-diagram";
import type { PresentationState } from "@/contracts/presentation";

export const needsQuestionVisual = (state: PresentationState) =>
  Boolean(state.lesson?.intuitiveOnly || state.layout?.touchZone === "sd");

function Counters({ value }: { value: number }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 340 140"
      className="h-32 w-full max-w-96 text-primary"
    >
      {Array.from({ length: value }, (_, i) => (
        <circle
          key={i}
          cx={18 + (i % 10) * 33}
          cy={35 + Math.floor(i / 10) * 60}
          r={14}
          fill="currentColor"
        />
      ))}
    </svg>
  );
}
export function QuestionVisual({
  prompt,
  tool,
  compact = false,
}: {
  prompt: MathPrompt;
  tool?: PublicTool;
  compact?: boolean;
}) {
  const diagram = publicDiagram(prompt, tool);
  return (
    <figure
      aria-label="Model visual soal"
      data-diagram={diagram.kind}
      className={`my-3 rounded-kartu border-2 border-primary/30 bg-white p-3 text-left text-[28px] ${compact ? "max-w-2xl" : "w-full"}`}
    >
      <figcaption className="sr-only">
        Model dari informasi pada soal. Jelaskan caramu.
      </figcaption>
      {diagram.kind === "counters" && (
        <div className="flex flex-wrap items-center gap-4">
          {diagram.values.map((v, i) => (
            <div key={i} className="flex min-w-64 flex-1 items-center gap-2">
              <div className="flex-1">
                <p>{v} benda</p>
                <Counters value={v} />
              </div>
              {i === 0 && (
                <span className="text-[48px]">
                  {diagram.operation === "add" ? "+" : "?"}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
      {diagram.kind === "place-value" && (
        <div className="flex flex-wrap gap-5">
          {diagram.values.map((value, row) => (
            <div key={row} className="min-w-64 flex-1">
              <p className="font-bold">{value}</p>
              <div className="grid grid-cols-3 gap-2">
                {[100, 10, 1].map((unit, column) => (
                  <div key={unit}>
                    <p>{["Ratusan", "Puluhan", "Satuan"][column]}</p>
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 110 150"
                      className="h-36 w-full text-primary"
                    >
                      {Array.from(
                        { length: Math.floor(value / unit) % 10 },
                        (_, i) =>
                          unit === 1 ? (
                            <circle
                              key={i}
                              cx={16 + (i % 3) * 35}
                              cy={24 + Math.floor(i / 3) * 45}
                              r={11}
                              fill="currentColor"
                            />
                          ) : (
                            <rect
                              key={i}
                              x={5 + (i % 3) * 35}
                              y={8 + Math.floor(i / 3) * 45}
                              width={unit === 100 ? 27 : 8}
                              height={32}
                              rx={2}
                              fill="currentColor"
                            />
                          ),
                      )}
                    </svg>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      {diagram.kind === "fractions" && (
        <div className="flex flex-wrap items-center gap-4">
          {diagram.values.map((v, i) => (
            <div key={i} className="min-w-60 flex-1">
              <p>
                Satu utuh · {v.denominator} bagian sama besar
                {v.numerator < 0 ? " · nilai negatif" : ""}
              </p>
              <div
                className="mt-2 flex h-24 border-2 border-primary"
                aria-hidden="true"
              >
                {Array.from({ length: v.denominator }, (_, part) => (
                  <span
                    key={part}
                    className={`flex-1 border-r-2 border-primary last:border-r-0 ${part < Math.abs(v.numerator) ? "bg-primary" : "bg-white"}`}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      {diagram.kind === "sharing" && (
        <div className="space-y-3">
          <p>
            Bagikan {diagram.total.toLocaleString("id-ID")} benda sama banyak ke{" "}
            {diagram.containers} tempat.
          </p>
          {diagram.total <= 20 && <Counters value={diagram.total} />}
          <div className="flex flex-wrap gap-3" aria-hidden="true">
            {Array.from({ length: diagram.containers }, (_, i) => (
              <div
                key={i}
                className="flex h-20 w-20 items-center justify-center rounded-kartu border-2 border-dashed border-primary text-[48px]"
              >
                ?
              </div>
            ))}
          </div>
        </div>
      )}
      {diagram.kind === "multiples" && (
        <div className="space-y-3">
          {diagram.steps.map((step, i) => (
            <div key={i} className="flex flex-wrap items-center gap-3">
              <span>Langkah {step}</span>
              <span className="flex-1 border-b-4 border-primary px-4 text-[40px]">
                0 → {step} → … → …
              </span>
            </div>
          ))}
        </div>
      )}
      {diagram.kind === "price" && (
        <div className="space-y-3">
          <p>
            {diagram.quantity} pensil · seluruhnya Rp
            {diagram.total.toLocaleString("id-ID")}
          </p>
          <svg
            aria-hidden="true"
            viewBox="0 0 720 100"
            className="h-24 w-full max-w-3xl text-primary"
          >
            {Array.from({ length: diagram.quantity }, (_, i) => (
              <g key={i} transform={`translate(${i * 54 + 10},4)`}>
                <rect x={5} width={28} height={60} fill="currentColor" />
                <path d="M5 60 L19 85 L33 60 Z" fill="currentColor" />
              </g>
            ))}
          </svg>
          <p>Satu pensil → ? rupiah</p>
        </div>
      )}
      {diagram.kind === "quantities" && (
        <div className="flex flex-wrap gap-4">
          {diagram.labels.map((label, i) => (
            <div
              key={i}
              className="flex min-h-24 min-w-24 items-center gap-3 rounded-kartu border-2 border-dashed border-primary p-3"
            >
              <span
                aria-hidden="true"
                className="size-10 rounded-full border-4 border-primary"
              />
              <span>{label}</span>
            </div>
          ))}
        </div>
      )}
    </figure>
  );
}
