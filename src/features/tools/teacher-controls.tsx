"use client";
import { useState } from "react";
import { publicTool, type PublicTool } from "@/contracts/tools";
import { Button } from "@/ui/components/button";
import type { FractionTask } from "@/core/tools/fractions";
import type { RatioTask } from "@/core/tools/ratio";
import type { AlgebraTask } from "@/core/tools/algebra";
import type { BalanceTask } from "@/core/tools/balance";
import { GRAPH_EXAMPLES } from "@/core/tools/graph-tasks";
import {
  PATTERNS,
  PATTERN_LABELS,
  type Pattern,
  type NumberLineDescriptor,
} from "@/core/tools/patterns";
export function ToolControls({
  onPublish,
  disabled,
}: {
  onPublish: (task: PublicTool, pattern: Pattern) => Promise<void>;
  disabled: boolean;
}) {
  const [kind, setKind] = useState<PublicTool["kind"]>("fractions");
  const [graphKind, setGraphKind] =
    useState<keyof typeof GRAPH_EXAMPLES>("linear");
  const [balance, setBalance] = useState<BalanceTask>({
    kind: "balance",
    left: { x: 3, constant: -7 },
    right: { x: 0, constant: 11 },
  });
  const [pattern, setPattern] = useState<Pattern>("build");
  const [line, setLine] = useState<NumberLineDescriptor>({
    kind: "number-line",
    origin: { numerator: -3, denominator: 1 },
    delta: { numerator: -5, denominator: 1 },
    orientation: "horizontal",
  });
  const [ratio, setRatio] = useState<RatioTask>({
    kind: "ratio",
    baseX: 2,
    baseY: 3,
    targetX: 6,
  });
  const [algebra, setAlgebra] = useState<AlgebraTask>({
    kind: "algebra",
    groups: 3,
    xPerGroup: 1,
    constantPerGroup: 4,
  });
  const [task, setTask] = useState<FractionTask>({
    kind: "fractions",
    operation: "add",
    left: { numerator: 1, denominator: 2 },
    right: { numerator: 1, denominator: 3 },
  });
  const [message, setMessage] = useState("");
  async function open() {
    try {
      const value = publicTool(
        kind === "graphs"
          ? GRAPH_EXAMPLES[graphKind]
          : kind === "fractions"
            ? task
            : kind === "ratio"
              ? ratio
              : kind === "algebra"
                ? algebra
                : kind === "balance"
                  ? balance
                  : line,
      );
      await onPublish(value, pattern);
      setMessage(
        "Latihan dibuka. Pratinjau alat tidak menambah giliran atau bukti asesmen.",
      );
    } catch {
      setMessage(
        "Periksa parameter alat. Timbangan memerlukan koefisien x berbeda pada kedua ruas (−12 sampai 12) dan konstanta −1000 sampai 1000.",
      );
    }
  }
  return (
    <details className="space-y-3">
      <summary className="min-h-12 cursor-pointer font-bold">
        Pratinjau Alat Nalar
      </summary>
      <label>
        Alat{" "}
        <select
          aria-label="Pilih Alat Nalar"
          value={kind}
          className="min-h-12 border bg-white p-2"
          onChange={(e) => setKind(e.target.value as PublicTool["kind"])}
        >
          <option value="fractions">Batang Pecahan</option>
          <option value="ratio">Tabel Rasio</option>
          <option value="algebra">Ubin Aljabar</option>
          <option value="number-line">Garis Bilangan</option>
          <option value="balance">Timbangan Persamaan</option>
          <option value="graphs">Grafik Geser</option>
        </select>
      </label>
      {kind === "graphs" && (
        <label>
          Jenis grafik
          <select
            aria-label="Jenis grafik"
            value={graphKind}
            className="ml-2 min-h-12 border bg-white p-2"
            onChange={(e) =>
              setGraphKind(e.target.value as keyof typeof GRAPH_EXAMPLES)
            }
          >
            <option value="linear">Nilai fungsi linear</option>
            <option value="intersection">Dua garis / SPLDV</option>
            <option value="inequalities">Irisan pertidaksamaan</option>
            <option value="quadratic">Parabola dan akar</option>
            <option value="exponential">Eksponensial dan pembanding</option>
          </select>
        </label>
      )}
      {kind === "balance" && (
        <div className="flex flex-wrap gap-3">
          {(["left", "right"] as const).map((side) => (
            <fieldset key={side} className="flex gap-2">
              <legend>Ruas {side === "left" ? "kiri" : "kanan"}</legend>
              {(["x", "constant"] as const).map((key) => (
                <label key={key}>
                  {key === "x" ? "Koefisien x" : "Konstanta"}
                  <input
                    aria-label={`${key === "x" ? "Koefisien x" : "Konstanta"} ${side === "left" ? "kiri" : "kanan"}`}
                    type="number"
                    min={key === "x" ? -12 : -1000}
                    max={key === "x" ? 12 : 1000}
                    className="block min-h-12 w-28 border p-2"
                    value={balance[side][key]}
                    onChange={(e) =>
                      setBalance({
                        ...balance,
                        [side]: {
                          ...balance[side],
                          [key]: Number(e.target.value),
                        },
                      })
                    }
                  />
                </label>
              ))}
            </fieldset>
          ))}
        </div>
      )}
      <label>
        Pola{" "}
        <select
          aria-label="Pola interaksi"
          className="min-h-12 border bg-white p-2"
          value={pattern}
          onChange={(e) => setPattern(e.target.value as Pattern)}
        >
          {PATTERNS.map((p) => (
            <option key={p} value={p}>
              {PATTERN_LABELS[p]}
            </option>
          ))}
        </select>
      </label>
      {kind === "number-line" && (
        <div className="flex flex-wrap gap-2">
          {(["origin", "delta"] as const).map((key) => (
            <label key={key}>
              {key === "origin" ? "Titik awal" : "Perpindahan"}
              <input
                type="number"
                aria-label={key === "origin" ? "Titik awal" : "Perpindahan"}
                className="block min-h-12 w-28 border p-2"
                value={line[key].numerator}
                onChange={(e) =>
                  setLine({
                    ...line,
                    [key]: {
                      numerator: Number(e.target.value),
                      denominator: 1,
                    },
                  })
                }
              />
            </label>
          ))}
        </div>
      )}
      {kind === "fractions" && (
        <>
          <p>Batang Pecahan · contoh latihan. Angka dapat diubah guru.</p>
          <label>
            Aktivitas{" "}
            <select
              aria-label="Aktivitas pecahan"
              className="min-h-12 border bg-white p-2"
              value={task.operation}
              onChange={(e) =>
                setTask({
                  ...task,
                  operation: e.target.value as FractionTask["operation"],
                })
              }
            >
              <option value="add">Gabungkan pecahan</option>
              <option value="represent">Bangun pecahan</option>
              <option value="equivalent">Pecahan senilai</option>
            </select>
          </label>
          <div className="flex flex-wrap gap-3">
            {(["left", "right"] as const).map((side, i) => (
              <fieldset key={side} className="flex gap-2">
                <legend>Batang {i + 1}</legend>
                {(["numerator", "denominator"] as const).map((part) => (
                  <label key={part}>
                    {part === "numerator" ? "Pembilang" : "Penyebut"}
                    <input
                      aria-label={`${part === "numerator" ? "Pembilang" : "Penyebut"} batang ${i + 1}`}
                      type="number"
                      min={part === "numerator" ? -12 : 2}
                      max={12}
                      className="block min-h-12 w-24 border p-2"
                      value={task[side][part]}
                      onChange={(e) =>
                        setTask({
                          ...task,
                          [side]: {
                            ...task[side],
                            [part]: Number(e.target.value),
                          },
                        })
                      }
                    />
                  </label>
                ))}
              </fieldset>
            ))}
          </div>
        </>
      )}
      {kind === "ratio" && (
        <div className="flex flex-wrap gap-2">
          {(["baseX", "baseY", "targetX"] as const).map((key, i) => (
            <label key={key}>
              {["Nilai awal A", "Nilai awal B", "Nilai A tujuan"][i]}
              <input
                aria-label={
                  ["Nilai awal A", "Nilai awal B", "Nilai A tujuan"][i]
                }
                type="number"
                min={1}
                max={10000}
                className="block min-h-12 w-28 border p-2"
                value={ratio[key]}
                onChange={(e) =>
                  setRatio({ ...ratio, [key]: Number(e.target.value) })
                }
              />
            </label>
          ))}
        </div>
      )}
      {kind === "algebra" && (
        <div className="flex flex-wrap gap-2">
          {(["groups", "xPerGroup", "constantPerGroup"] as const).map(
            (key, i) => (
              <label key={key}>
                {
                  [
                    "Jumlah kelompok ubin",
                    "Ubin x tiap kelompok",
                    "Konstanta tiap kelompok",
                  ][i]
                }
                <input
                  aria-label={
                    [
                      "Jumlah kelompok ubin",
                      "Ubin x tiap kelompok",
                      "Konstanta tiap kelompok",
                    ][i]
                  }
                  type="number"
                  className="block min-h-12 w-28 border p-2"
                  value={algebra[key]}
                  onChange={(e) =>
                    setAlgebra({ ...algebra, [key]: Number(e.target.value) })
                  }
                />
              </label>
            ),
          )}
        </div>
      )}
      <Button disabled={disabled} onClick={() => void open()}>
        Buka latihan{" "}
        {kind === "graphs"
          ? "Grafik Geser"
          : kind === "fractions"
            ? "Batang Pecahan"
            : kind === "ratio"
              ? "Tabel Rasio"
              : kind === "algebra"
                ? "Ubin Aljabar"
                : kind === "balance"
                  ? "Timbangan Persamaan"
                  : "Garis Bilangan"}
      </Button>
      <p role="status">{message}</p>
    </details>
  );
}
