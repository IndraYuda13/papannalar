"use client";
import {
  useReducer,
  useRef,
  useState,
  type PointerEvent,
  type CSSProperties,
} from "react";
import {
  initialFractions,
  reduceFractions,
  checkFractions,
  FRACTION_WHOLE_WIDTH,
  type FractionTask,
  type FractionAction,
  type FractionState,
} from "@/core/tools/fractions";
import type { ToolModel } from "@/core/tools/patterns";
import { PointerOwnership } from "@/core/tools/pointers";
import { ObjectFace } from "@/ui/components/activity-icon";
import { Button } from "@/ui/components/button";
export function Fractions({
  task,
  initial,
  onRun,
}: {
  task: FractionTask;
  initial?: FractionState;
  onRun?: (model: ToolModel) => boolean;
}) {
  const [state, dispatch] = useReducer(
    (s: ReturnType<typeof initialFractions>, action: FractionAction) =>
      reduceFractions(s, action, task),
    initial ?? initialFractions(task),
  );
  const [notice, setNotice] = useState("");
  const locks = useRef(new Map<number, { bar: 0 | 1 | 2; y: number }>());
  const owners = useRef(new PointerOwnership());
  const act = (action: FractionAction) => {
    try {
      reduceFractions(state, action, task);
      dispatch(action);
      setNotice("");
    } catch {
      setNotice(
        "Pembagian bersama melampaui 12 bagian. Pilih pembagian lain atau ulang langkah.",
      );
    }
  };
  function release(e: PointerEvent<HTMLButtonElement>) {
    const lock = locks.current.get(e.pointerId);
    if (!lock) return;
    locks.current.delete(e.pointerId);
    owners.current.release(e.pointerId);
    act({
      type: "move",
      bar: lock.bar,
      offset: state.bars[lock.bar].offset + e.clientY - lock.y,
    });
  }
  return (
    <section
      aria-label="Batang Pecahan"
      data-tool="fractions"
      className="board-tool space-y-4 text-left"
      style={
        {
          "--fraction-min-whole": `${48 * Math.max(...state.bars.slice(0, task.operation === "represent" ? 1 : task.operation === "equivalent" ? 2 : 3).map((bar) => bar.parts))}px`,
        } as CSSProperties
      }
    >
      <p className="text-[32px]">
        {task.operation === "represent"
          ? `Bagi batang menjadi ${task.left.denominator} bagian sama panjang. Ketuk ${Math.abs(task.left.numerator)} bagian${task.left.numerator < 0 ? ", lalu pilih Negatif" : ""}.`
          : task.operation === "equivalent"
            ? "Warnai pecahan yang sama pada dua batang dengan pembagian berbeda."
            : "Warnai kedua pecahan. Samakan pembagiannya, lalu warnai jumlahnya di batang Gabung."}
      </p>
      {state.bars.map((bar, index) => {
        const i = index as 0 | 1 | 2;
        if (
          (task.operation === "represent" && i > 0) ||
          (task.operation === "equivalent" && i > 1)
        )
          return null;
        const wholes = i === 2 ? 2 : 1;
        return (
          <div
            key={i}
            className="fraction-row flex items-center gap-3 overflow-x-auto py-1"
            data-testid={`fraction-row-${i}`}
          >
            <div className="flex w-36 shrink-0 flex-col gap-1">
              <Button
                size="board"
                variant="outline"
                aria-label={`Geser batang ${i + 1}`}
                className="touch-none px-2"
                onPointerDown={(e) => {
                  if (
                    !owners.current.claim(
                      e.pointerId,
                      `bar-${i}`,
                      e.width,
                      e.height,
                    )
                  )
                    return;
                  locks.current.set(e.pointerId, { bar: i, y: e.clientY });
                  if (e.pointerId !== -77)
                    e.currentTarget.setPointerCapture(e.pointerId);
                }}
                onPointerUp={release}
                onPointerCancel={(e) => {
                  locks.current.delete(e.pointerId);
                  owners.current.release(e.pointerId);
                }}
                onLostPointerCapture={(e) => {
                  locks.current.delete(e.pointerId);
                  owners.current.release(e.pointerId);
                }}
              >
                {i === 2 ? "Gabung" : `Batang ${i + 1}`}
              </Button>
            </div>
            <div
              className="space-y-1"
              style={{ transform: `translateY(${bar.offset}px)` }}
            >
              {Array.from({ length: wholes }, (_, whole) => (
                <div
                  key={whole}
                  data-testid={`fraction-whole-${i}-${whole}`}
                  className="flex h-[92px] shrink-0 border-2 border-pn-ink-900"
                  style={{
                    width: `var(--board-fraction-whole, ${FRACTION_WHOLE_WIDTH}px)`,
                  }}
                >
                  {Array.from({ length: bar.parts }, (_, cell) => {
                    const number = whole * bar.parts + cell,
                      selected = bar.selected.includes(number);
                    return (
                      <button
                        key={cell}
                        aria-label={`Batang ${i + 1} bagian ${number + 1}`}
                        aria-pressed={selected}
                        className={`fraction-cell min-h-[88px] min-w-[88px] flex-1 border-r-2 border-pn-ink-900 last:border-r-0 ${selected ? (bar.sign < 0 ? "bg-pn-amber-100 outline outline-2 outline-dashed outline-primary" : "bg-primary") : "bg-white"}`}
                        onClick={() =>
                          act({ type: "paint", bar: i, cell: number })
                        }
                      >
                        <ObjectFace />
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
            <div className="flex shrink-0 items-center gap-2 text-[28px]">
              <label>
                Bagi{" "}
                <select
                  aria-label={`Bagi batang ${i + 1}`}
                  value={bar.parts}
                  className="min-h-24 border bg-white p-2"
                  onChange={(e) =>
                    act({
                      type: "partition",
                      bar: i,
                      parts: Number(e.target.value),
                    })
                  }
                >
                  {Array.from({ length: 11 }, (_, n) => (
                    <option key={n} value={n + 2}>
                      {n + 2}
                    </option>
                  ))}
                </select>
              </label>
              <Button
                size="board"
                variant="outline"
                onClick={() => act({ type: "sign", bar: i })}
                aria-label={`Tanda batang ${i + 1}`}
              >
                {bar.sign < 0 ? "Negatif" : "Positif"}
              </Button>
            </div>
          </div>
        );
      })}
      {state.history.length > 0 && (
        <p className="text-[40px]" data-testid="fraction-values">
          {state.bars
            .slice(
              0,
              task.operation === "represent"
                ? 1
                : task.operation === "equivalent"
                  ? 2
                  : 3,
            )
            .map(
              (bar) =>
                `${bar.sign < 0 ? "−" : ""}${bar.selected.length}/${bar.parts}`,
            )
            .join(" · ")}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        {task.operation === "add" && (
          <Button size="board" onClick={() => act({ type: "equalize" })}>
            Samakan penyebut
          </Button>
        )}
        <Button
          size="board"
          variant="outline"
          onClick={() => act({ type: "undo" })}
        >
          Ulang langkah
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
          onClick={() =>
            setNotice(
              (onRun?.({ kind: "fractions", state }) ??
                checkFractions(state, task).modelMatches)
                ? "Model sudah sesuai. Mengapa panjangnya tetap sama?"
                : "Bandingkan bagian berwarna, tanda, dan pembagian satu utuh.",
            )
          }
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
