"use client";
import { useReducer, useRef, useState, type PointerEvent } from "react";
import {
  initialBalance,
  reduceBalance,
  checkBalance,
  type BalanceTask,
  type BalanceState,
  type BalanceAction,
  type BalanceOperation,
  type LinearExpression,
} from "@/core/tools/balance";
import { rational, type Rational } from "@/core/math/rational";
import { exactText, linearText, type ToolModel } from "@/core/tools/patterns";
import { PointerOwnership } from "@/core/tools/pointers";
import { ObjectFace } from "@/ui/components/activity-icon";
import { Button } from "@/ui/components/button";

const text = (v: Rational) => exactText(v).replaceAll("-", "−");
const weightChoices = [
  { term: "constant", sign: 1 },
  { term: "constant", sign: -1 },
  { term: "x", sign: 1 },
  { term: "x", sign: -1 },
] as const;
function parse(value: string) {
  if (!/^-?\d{1,4}(?:\/[1-9]\d{0,3})?$/.test(value))
    throw new RangeError("Exact value required");
  const [n, d = "1"] = value.split("/");
  return rational(BigInt(n), BigInt(d));
}
function operationText(op: BalanceOperation) {
  return op.kind === "add"
    ? `Tambah ${text(op.value)}${op.term === "x" ? "x" : ""}`
    : `${op.kind === "divide" ? "Bagi" : "Kali"} ${text(op.value)}`;
}
function Weights({ value }: { value: LinearExpression }) {
  return (
    <div
      className="flex min-h-28 flex-wrap items-end justify-center gap-3"
      aria-hidden="true"
    >
      {(["x", "constant"] as const).flatMap((term) => {
        const v = value[term];
        if (!v.numerator) return [];
        const magnitude = v.numerator < 0n ? -v.numerator : v.numerator;
        const separate = v.denominator === 1n && magnitude <= 8n;
        return Array.from(
          { length: separate ? Number(magnitude) : 1 },
          (_, i) => (
            <span
              key={`${term}-${i}`}
              className={`balance-weight flex min-h-[88px] min-w-[88px] items-center justify-center border-4 px-3 text-[36px] ${term === "x" ? "rounded-t-3xl border-primary bg-secondary" : "border-pn-amber-500 bg-white"} ${v.numerator < 0n ? "border-dashed" : ""}`}
            >
              {separate
                ? `${v.numerator < 0n ? "−" : ""}${term === "x" ? "x" : "1"}`
                : `${text(v)}${term === "x" ? "x" : " satuan"}`}
              <ObjectFace />
            </span>
          ),
        );
      })}
      {!value.x.numerator && !value.constant.numerator && (
        <span className="text-[40px]">0</span>
      )}
    </div>
  );
}
export function Balance({
  task,
  initial,
  onRun,
}: {
  task: BalanceTask;
  initial?: BalanceState;
  onRun?: (model: ToolModel) => boolean;
}) {
  const [state, dispatch] = useReducer(
    (s: BalanceState, action: BalanceAction) => reduceBalance(s, action, task),
    initial ?? initialBalance(task),
  );
  const [value, setValue] = useState("1"),
    [notice, setNotice] = useState("");
  const [highlight, setHighlight] = useState<readonly ("left" | "right")[]>([]);
  const drop = useRef<HTMLDivElement>(null),
    owners = useRef(new PointerOwnership());
  const drags = useRef(
    new Map<number, { x: number; y: number; operation: BalanceOperation }>(),
  );
  const suppressClick = useRef(false);
  function act(action: BalanceAction) {
    try {
      reduceBalance(state, action, task);
      dispatch(action);
      setNotice("");
      setHighlight([]);
    } catch {
      setNotice(
        "Pembagi dan pengali harus bukan nol. Batalkan langkah terakhir jika nilai atau jumlah langkah terlalu besar.",
      );
    }
  }
  function operate(
    kind: "add" | "multiply" | "divide",
    term: "x" | "constant" = "constant",
    negate = false,
  ) {
    try {
      const amount = parse(value),
        v = negate ? rational(-amount.numerator, amount.denominator) : amount;
      act({
        type: "operate",
        operation:
          kind === "add" ? { kind, term, value: v } : { kind, value: v },
      });
    } catch {
      setNotice("Isi bilangan bulat atau pecahan, misalnya −2 atau 1/3.");
    }
  }
  function cancel(e: PointerEvent<HTMLButtonElement>) {
    owners.current.release(e.pointerId);
    drags.current.delete(e.pointerId);
  }
  function start(
    e: PointerEvent<HTMLButtonElement>,
    label: string,
    operation: BalanceOperation,
  ) {
    suppressClick.current = false;
    if (!owners.current.claim(e.pointerId, label, e.width, e.height)) return;
    drags.current.set(e.pointerId, { x: e.clientX, y: e.clientY, operation });
    if (e.pointerId !== -77) e.currentTarget.setPointerCapture(e.pointerId);
  }
  function chooseWeight(operation: BalanceOperation, detail: number) {
    const skip = suppressClick.current && detail > 0;
    suppressClick.current = false;
    if (!skip) act({ type: "operate", operation });
  }
  function release(e: PointerEvent<HTMLButtonElement>) {
    const drag = drags.current.get(e.pointerId);
    cancel(e);
    if (!drag || Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 12)
      return;
    suppressClick.current = e.pointerId !== -77;
    const rect = drop.current?.getBoundingClientRect();
    if (
      rect &&
      e.clientX >= rect.left &&
      e.clientX <= rect.right &&
      e.clientY >= rect.top &&
      e.clientY <= rect.bottom
    )
      act({ type: "operate", operation: drag.operation });
  }
  return (
    <section
      aria-label="Timbangan Persamaan"
      data-tool="balance"
      className="board-tool space-y-4 text-left"
    >
      <p className="text-[32px]">
        Kantong x belum diketahui. Ubah kedua ruas dengan operasi yang sama.
      </p>
      <div
        ref={drop}
        data-testid="balance-drop"
        className="rounded-kartu border-4 border-primary p-4"
      >
        <p className="mb-3 text-center text-[28px]">
          Seret beban ke sini untuk menambah pada kedua ruas
        </p>
        <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-4">
          {(["left", "right"] as const).map((side, i) => (
            <div key={side} className="contents">
              {i === 1 && (
                <span aria-hidden="true" className="pb-8 text-[56px]">
                  =
                </span>
              )}
              <div
                className={`min-w-0 space-y-3 border-b-8 p-3 ${highlight.includes(side) ? "border-dashed border-pn-amber-500" : "border-primary"}`}
              >
                <p className="text-center text-[28px]">
                  Ruas {i === 0 ? "kiri" : "kanan"}
                </p>
                <Weights value={state.frame[side]} />
                <p
                  data-testid={`balance-${side}`}
                  className="text-center text-[48px] font-bold"
                >
                  {linearText(state.frame[side])}
                </p>
              </div>
            </div>
          ))}
        </div>
        <div className="mx-auto h-6 w-8 bg-primary" aria-hidden="true" />
      </div>
      <div className="board-balance-weights flex flex-wrap items-center gap-3">
        {weightChoices.map(({ term, sign }) => {
          const operation: BalanceOperation = {
            kind: "add",
            term,
            value: rational(sign),
          };
          const label = `Beban ${sign === 1 ? "+" : "−"}${term === "x" ? "x" : "1"}`;
          return (
            <Button
              key={label}
              size="board"
              variant="outline"
              className="touch-none"
              aria-label={label}
              onPointerDown={(e) => start(e, label, operation)}
              onPointerUp={release}
              onPointerCancel={cancel}
              onLostPointerCapture={cancel}
              onClick={(e) => chooseWeight(operation, e.detail)}
            >
              <ObjectFace />
              {label}
            </Button>
          );
        })}
      </div>
      <div className="board-balance-operations flex flex-wrap items-end gap-3">
        <label className="text-[28px]">
          Nilai operasi
          <input
            aria-label="Nilai operasi timbangan"
            inputMode="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="block min-h-24 w-40 border-2 bg-white p-3 text-[40px]"
          />
        </label>
        <Button size="board" variant="outline" onClick={() => operate("add")}>
          Tambah kedua ruas
        </Button>
        <Button
          size="board"
          variant="outline"
          onClick={() => operate("add", "constant", true)}
        >
          Kurangi kedua ruas
        </Button>
        <Button
          size="board"
          variant="outline"
          onClick={() => operate("add", "x")}
        >
          Tambah x kedua ruas
        </Button>
        <Button
          size="board"
          variant="outline"
          onClick={() => operate("multiply")}
        >
          Kali kedua ruas
        </Button>
        <Button
          size="board"
          variant="outline"
          onClick={() => operate("divide")}
        >
          Bagi kedua ruas
        </Button>
      </div>
      {state.history.length > 0 && (
        <details className="text-[28px]">
          <summary className="min-h-24 cursor-pointer py-6">
            Jejak operasi ({state.history.length})
          </summary>
          <ol className="list-inside list-decimal">
            {[...state.history, state.frame].map((frame, i) => (
              <li key={i}>
                {frame.operation
                  ? `${operationText(frame.operation)} pada kedua ruas: `
                  : "Awal: "}
                {linearText(frame.left)} = {linearText(frame.right)}
              </li>
            ))}
          </ol>
        </details>
      )}
      <div className="board-balance-actions flex flex-wrap gap-4">
        <Button
          size="board"
          variant="outline"
          disabled={!state.history.length}
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
            const checked = checkBalance(state, task),
              matches =
                onRun?.({ kind: "balance", state }) ?? checked.modelMatches;
            setHighlight(checked.mismatchedSides);
            setNotice(
              matches
                ? "Model sudah sesuai. Jelaskan mengapa kedua ruas tetap setara."
                : !checked.legalHistory && state.history.length
                  ? "Periksa langkah bergaris putus: apakah operasi yang sama berlaku pada seluruh isi kedua ruas?"
                  : "Sisakan satu x melalui operasi yang sama pada kedua ruas.",
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
