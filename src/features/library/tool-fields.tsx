"use client";
import type { PublicTool } from "@/contracts/tools";
import { field } from "./client";
export const TOOL_LABELS = [
  ["number-line", "Garis Bilangan / Lift"],
  ["fractions", "Batang Pecahan"],
  ["ratio", "Tabel Rasio"],
  ["algebra", "Ubin Aljabar"],
  ["balance", "Timbangan Persamaan"],
  ["graphs", "Grafik Geser"],
  ["writing", "Menulis di papan"],
] as const;
export function defaultTool(kind: string): PublicTool {
  switch (kind) {
    case "fractions":
      return {
        kind,
        operation: "represent",
        left: { numerator: 1, denominator: 2 },
        right: { numerator: 0, denominator: 2 },
      };
    case "ratio":
      return { kind, baseX: 2, baseY: 3, targetX: 6 };
    case "algebra":
      return { kind, groups: 2, xPerGroup: 1, constantPerGroup: 3 };
    case "balance":
      return {
        kind,
        left: { x: 2, constant: 3 },
        right: { x: 0, constant: 11 },
      };
    case "graphs":
      return {
        kind,
        mode: "linear",
        domain: { minX: -5, maxX: 5, minY: -12, maxY: 12 },
        lines: [{ m: 2, b: 1 }],
        goal: { type: "value", x: 3 },
      };
    default:
      return {
        kind: "number-line",
        origin: { numerator: -3, denominator: 1 },
        delta: { numerator: -5, denominator: 1 },
        orientation: "horizontal",
      };
  }
}
function NumberField({
  label,
  value,
  onChange,
  min = -100,
  max = 100,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <label className="block text-sm">
      {label}
      <input
        type="number"
        className={field}
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}
export function ToolFields({
  tool: t,
  onChange: set,
}: {
  tool: PublicTool;
  onChange: (tool: PublicTool) => void;
}) {
  const grid = "grid grid-cols-2 gap-3";
  if (t.kind === "number-line")
    return (
      <div className={grid}>
        <NumberField
          label="Titik awal"
          value={t.origin.numerator}
          onChange={(n) =>
            set({ ...t, origin: { numerator: n, denominator: 1 } })
          }
        />
        <NumberField
          label="Perubahan (negatif untuk turun)"
          value={t.delta.numerator}
          onChange={(n) =>
            set({ ...t, delta: { numerator: n, denominator: 1 } })
          }
        />
        <label>
          Arah tampilan
          <select
            className={field}
            value={t.orientation}
            onChange={(e) =>
              set({
                ...t,
                orientation:
                  e.target.value === "vertical" ? "vertical" : "horizontal",
              })
            }
          >
            <option value="horizontal">Mendatar</option>
            <option value="vertical">Lift tegak</option>
          </select>
        </label>
        <p className="self-center text-sm">
          Penanda mengikuti satuan bilangan.
        </p>
      </div>
    );
  if (t.kind === "fractions")
    return (
      <div className={grid}>
        <label>
          Aktivitas
          <select
            className={field}
            value={t.operation}
            onChange={(e) =>
              set({
                ...t,
                operation:
                  e.target.value === "add"
                    ? "add"
                    : e.target.value === "equivalent"
                      ? "equivalent"
                      : "represent",
              })
            }
          >
            <option value="represent">Mewakili pecahan</option>
            <option value="add">Penjumlahan</option>
            <option value="equivalent">Pecahan senilai</option>
          </select>
        </label>
        {(["left", "right"] as const).map((side, i) => (
          <div key={side} className="space-y-2">
            <NumberField
              label={`Pembilang ${i + 1}`}
              value={t[side].numerator}
              min={-12}
              max={12}
              onChange={(n) =>
                set({ ...t, [side]: { ...t[side], numerator: n } })
              }
            />
            <NumberField
              label={`Penyebut ${i + 1}`}
              value={t[side].denominator}
              min={2}
              max={12}
              onChange={(n) =>
                set({ ...t, [side]: { ...t[side], denominator: n } })
              }
            />
          </div>
        ))}
      </div>
    );
  if (t.kind === "ratio")
    return (
      <div className={grid}>
        {(
          [
            ["baseX", "Nilai awal X"],
            ["baseY", "Nilai awal Y"],
            ["targetX", "Nilai target X"],
          ] as const
        ).map(([key, label]) => (
          <NumberField
            key={key}
            label={label}
            value={t[key]}
            min={1}
            max={10000}
            onChange={(n) => set({ ...t, [key]: n })}
          />
        ))}
      </div>
    );
  if (t.kind === "algebra")
    return (
      <div className={grid}>
        {(
          [
            ["groups", "Jumlah kelompok", 1, 6],
            ["xPerGroup", "Ubin x per kelompok", -3, 3],
            ["constantPerGroup", "Ubin satuan per kelompok", -9, 9],
          ] as const
        ).map(([key, label, min, max]) => (
          <NumberField
            key={key}
            label={label}
            value={t[key]}
            min={min}
            max={max}
            onChange={(n) => set({ ...t, [key]: n })}
          />
        ))}
      </div>
    );
  if (t.kind === "balance")
    return (
      <div className={grid}>
        {(["left", "right"] as const).map((side, i) => (
          <div key={side}>
            <NumberField
              label={`Koefisien x sisi ${i === 0 ? "kiri" : "kanan"}`}
              value={t[side].x}
              min={-12}
              max={12}
              onChange={(n) => set({ ...t, [side]: { ...t[side], x: n } })}
            />
            <NumberField
              label={`Konstanta sisi ${i === 0 ? "kiri" : "kanan"}`}
              value={t[side].constant}
              onChange={(n) =>
                set({ ...t, [side]: { ...t[side], constant: n } })
              }
            />
          </div>
        ))}
      </div>
    );
  if (t.kind === "graphs" && t.mode === "linear")
    return (
      <div className={grid}>
        <NumberField
          label="Gradien garis"
          value={t.lines[0].m}
          min={-12}
          max={12}
          onChange={(n) => set({ ...t, lines: [{ m: n, b: t.lines[0].b }] })}
        />
        <NumberField
          label="Titik potong Y"
          value={t.lines[0].b}
          onChange={(n) => set({ ...t, lines: [{ m: t.lines[0].m, b: n }] })}
        />
        <NumberField
          label="Nilai x yang dicari"
          value={t.goal.type === "value" ? t.goal.x : 0}
          min={-5}
          max={5}
          onChange={(n) => set({ ...t, goal: { type: "value", x: n } })}
        />
        <p className="self-center text-sm">
          Rentang x −5 sampai 5; y −12 sampai 12.
        </p>
      </div>
    );
  return (
    <p>
      Konfigurasi tersimpan dapat dipreview. Salin ke aktivitas baru untuk
      mengubah jenis.
    </p>
  );
}
