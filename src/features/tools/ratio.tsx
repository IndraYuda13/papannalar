"use client";
import { useReducer, useState, useRef } from "react";
import {
  initialRatio,
  reduceRatio,
  checkRatio,
  type RatioAction,
  type RatioTask,
  type RatioState,
} from "@/core/tools/ratio";
import type { ToolModel } from "@/core/tools/patterns";
import { rational, type Rational } from "@/core/math/rational";
import { ObjectFace } from "@/ui/components/activity-icon";
import { Button } from "@/ui/components/button";
const text = (value: Rational) =>
  value.denominator === 1n
    ? String(value.numerator)
    : `${value.numerator}/${value.denominator}`;
function parse(value: string) {
  if (!/^\d{1,6}(?:\/[1-9]\d{0,4})?$/.test(value))
    throw new Error("Expected exact rational");
  const [n, d = "1"] = value.split("/");
  return rational(BigInt(n), BigInt(d));
}
export function RatioTable({
  task,
  initial,
  onRun,
}: {
  task: RatioTask;
  initial?: RatioState;
  onRun?: (model: ToolModel) => boolean;
}) {
  const [state, dispatch] = useReducer(
    (s: ReturnType<typeof initialRatio>, action: RatioAction) =>
      reduceRatio(s, action, task),
    initial ?? initialRatio(task),
  );
  const [factor, setFactor] = useState("3"),
    [notice, setNotice] = useState("");
  const [highlight, setHighlight] = useState<readonly number[]>([]);
  const drag = useRef<{ id: number; x: number } | null>(null);
  function act(action: RatioAction) {
    try {
      reduceRatio(state, action, task);
      dispatch(action);
      setNotice("");
      setHighlight([]);
    } catch {
      setNotice(
        "Gunakan pengali positif, paling banyak enam kolom. Batalkan langkah terakhir untuk mencoba kembali.",
      );
    }
  }
  function scale() {
    try {
      act({ type: "scale", multiplier: parse(factor) });
    } catch {
      setNotice("Tuliskan bilangan bulat atau pecahan seperti 1/3.");
    }
  }
  return (
    <section
      aria-label="Tabel Rasio"
      data-tool="ratio"
      className="board-tool space-y-6 text-left"
    >
      <p className="text-[40px]">
        Kalikan kedua baris dengan bilangan yang sama.
      </p>
      <div className="overflow-x-auto">
        <table className="min-w-full border-separate border-spacing-3 text-center text-[48px]">
          <thead>
            <tr>
              <th scope="col">Besaran</th>
              {state.columns.map((c, i) => (
                <th key={i} scope="col">
                  {i === 0 ? "Awal" : `× ${text(c.multiplier)}`}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(["x", "y"] as const).map((axis, row) => (
              <tr key={axis}>
                <th scope="row">{row === 0 ? "A" : "B"}</th>
                {state.columns.map((c, i) => (
                  <td
                    key={i}
                    className={`min-h-24 min-w-40 rounded-input border-4 p-4 ${highlight.includes(i) ? "border-dashed border-primary" : "border-primary/30"}`}
                  >
                    {i === 0 ? (
                      state.history.length === 0 &&
                      task[axis === "x" ? "baseX" : "baseY"] <= 12 ? (
                        <span
                          className="ratio-objects"
                          aria-label={`${row === 0 ? "A" : "B"} awal`}
                        >
                          {Array.from(
                            { length: task[axis === "x" ? "baseX" : "baseY"] },
                            (_, n) => (
                              <span className="ratio-object" key={n}>
                                <ObjectFace />
                              </span>
                            ),
                          )}
                        </span>
                      ) : (
                        text(c[axis])
                      )
                    ) : (
                      <input
                        key={`${state.history.length}/${text(c[axis])}`}
                        aria-label={`Nilai ${row === 0 ? "A" : "B"} kolom ${i + 1}`}
                        className="min-h-24 w-44 bg-white p-2 text-center"
                        defaultValue={text(c[axis])}
                        onBlur={(e) => {
                          try {
                            const value = parse(e.target.value);
                            if (text(value) !== text(c[axis]))
                              act({ type: "cell", column: i, axis, value });
                          } catch {
                            e.target.value = text(c[axis]);
                            setNotice("Isi bilangan bulat atau pecahan.");
                          }
                        }}
                      />
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center gap-4 text-[32px]">
        <label>
          Pengali{" "}
          <input
            aria-label="Pengali rasio"
            className="min-h-24 w-40 border bg-white p-3"
            value={factor}
            onChange={(e) => setFactor(e.target.value)}
          />
        </label>
        <Button size="board" onClick={scale}>
          Tambah kolom × pengali
        </Button>
        <Button
          size="board"
          variant="outline"
          className="touch-none"
          aria-label="Seret pengali rasio"
          onPointerDown={(e) => {
            if (drag.current || e.width > 80 || e.height > 80) return;
            drag.current = { id: e.pointerId, x: e.clientX };
            if (e.pointerId !== -77)
              e.currentTarget.setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => {
            if (drag.current?.id === e.pointerId)
              setFactor(
                String(
                  Math.max(
                    1,
                    Math.min(
                      12,
                      1 + Math.round((e.clientX - drag.current.x) / 88),
                    ),
                  ),
                ),
              );
          }}
          onPointerUp={(e) => {
            if (drag.current?.id === e.pointerId) {
              const multiplier = Math.max(
                1,
                Math.min(12, 1 + Math.round((e.clientX - drag.current.x) / 88)),
              );
              drag.current = null;
              setFactor(String(multiplier));
              act({ type: "scale", multiplier: rational(multiplier) });
            }
          }}
          onPointerCancel={() => {
            drag.current = null;
          }}
          onLostPointerCapture={() => {
            drag.current = null;
          }}
        >
          Geser pengali →
        </Button>
        <Button
          size="board"
          variant="outline"
          onClick={() => act({ type: "undo" })}
        >
          Batalkan langkah terakhir
        </Button>
        <Button
          size="board"
          variant="outline"
          onClick={() => act({ type: "reset" })}
        >
          Mulai ulang
        </Button>
        <Button
          size="board"
          onClick={() => {
            const checked = checkRatio(state, task);
            const matches =
              onRun?.({ kind: "ratio", state }) ?? checked.modelMatches;
            setHighlight(checked.mismatchedColumns);
            setNotice(
              matches
                ? "Model sudah sesuai. Jelaskan pengali di kedua baris."
                : "Periksa pengali kedua baris dan nilai tujuan A.",
            );
          }}
        >
          Jalankan
        </Button>
      </div>
      <p role="status" className="min-h-14 text-[40px] text-primary">
        {notice}
      </p>
    </section>
  );
}
