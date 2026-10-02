"use client";
import { useState } from "react";
import Link from "next/link";
import { Button } from "./button";
import { DecorativeScene, type SceneAsset } from "./decorative-scene";
import { MotionBoundary } from "./motion-boundary";
const TOOLS = [
  {
    asset: "learning-board",
    title: "Belajar bersama",
    description:
      "Tampilkan pertanyaan dan ajak kelas mencoba dengan alat yang dapat disentuh.",
  },
  {
    asset: "balance-scale",
    title: "Timbangan persamaan",
    description:
      "Amati keseimbangan kedua ruas. Terapkan operasi yang sama untuk memahami persamaan.",
  },
  {
    asset: "algebra-kit",
    title: "Ubin aljabar",
    description:
      "Susun ubin, temukan pasangan nol, lalu hubungkan bentuk dengan ekspresi aljabar.",
  },
] as const;
export function ToolExplorer() {
  const [asset, setAsset] = useState<SceneAsset>("learning-board");
  const tool = TOOLS.find((t) => t.asset === asset)!;
  return (
    <MotionBoundary className="studio-panel studio-tools bg-card">
      <div>
        <p className="studio-eyebrow">Dari ide menjadi pengalaman</p>
        <h2 className="text-xl font-bold">Jelajahi alat belajar</h2>
        <div
          className="studio-tools-controls mt-4"
          aria-label="Pilih ilustrasi alat"
        >
          {TOOLS.map((t) => (
            <Button
              key={t.asset}
              variant="outline"
              aria-pressed={asset === t.asset}
              onClick={() => setAsset(t.asset)}
            >
              {t.title}
            </Button>
          ))}
        </div>
        <h3 className="mt-5 font-bold">{tool.title}</h3>
        <p className="mt-2 text-sm text-muted-foreground">{tool.description}</p>
        <Link
          className="mt-3 inline-flex min-h-12 items-center font-semibold text-primary"
          href="/guru/soal"
        >
          Lihat soal & presentasi →
        </Link>
      </div>
      <DecorativeScene key={asset} asset={asset} />
    </MotionBoundary>
  );
}
