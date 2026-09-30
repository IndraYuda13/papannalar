import type {
  GeneratedQuestion,
  MathPrompt,
} from "../../content/templates/types";
import { templateFor } from "../../content/templates/registry";
import { withContext } from "../../content/contexts/question";
import { applyStory } from "../../content/contexts/story-frames";
import { copiedContentHash } from "./content-copy";

export const INDEPENDENT_TASK_LABELS = [
  "Konteks",
  "Cari Kesalahan",
  "Latihan",
  "Tantangan Terbuka",
] as const;

function basePrompt(q: GeneratedQuestion): MathPrompt {
  return q.story
    ? applyStory(q, q.story).prompt
    : templateFor(q.stepId, q.metadata.version === "1.0.0" ? 1 : 2).render(
        q.params,
      );
}

function withPrompt(
  q: GeneratedQuestion,
  prompt: MathPrompt,
): GeneratedQuestion {
  if (JSON.stringify(q.prompt) === JSON.stringify(prompt)) return q;
  return {
    ...q,
    prompt,
    metadata: {
      ...q.metadata,
      contentHash: copiedContentHash({ ...q, prompt }),
    },
  };
}

export function independentQuestion(
  q: GeneratedQuestion,
  index: number,
): GeneratedQuestion {
  if (index === 0)
    return withPrompt(q, [
      { kind: "text", text: "Konteks. " },
      ...(q.story ? basePrompt(q) : withContext(q).prompt),
      {
        kind: "text",
        text: " Gambarkan model dan jelaskan caramu kepada pasanganmu.",
      },
    ]);
  if (index === 1) {
    const wrong =
      q.options.find((o) => o.classification === "misconception") ??
      q.options.find((o) => o.classification === "arithmetic-error");
    if (!wrong) throw new Error("Independent error task needs a wrong example");
    return withPrompt(q, [
      { kind: "text", text: "Cari Kesalahan. " },
      ...basePrompt(q),
      {
        kind: "text",
        text: ` Nala menjawab ${wrong.text}. Periksa pekerjaannya, perbaiki, lalu jelaskan dengan model.`,
      },
    ]);
  }
  if (index === 2)
    return withPrompt(q, [
      { kind: "text", text: "Latihan. " },
      ...basePrompt(q),
      {
        kind: "text",
        text: " Kerjakan di buku, lalu bandingkan cara dengan pasanganmu.",
      },
    ]);
  throw new RangeError("Independent task index must be 0, 1 or 2");
}

function openChallenge(q: GeneratedQuestion): string {
  const { a, b, d } = q.params;
  switch (q.stepId) {
    case "A1":
      return `Gambarlah dua kumpulan berbeda yang masing-masing lebih banyak dari ${b} benda. Jelaskan perbandingannya.`;
    case "A2":
    case "B1":
      return "Buat dua penjumlahan berbeda yang hasilnya sama dengan soal ini. Tunjukkan caramu.";
    case "A3":
      return `Buat dua bilangan lain dengan ${a} puluhan penuh. Bandingkan satuannya.`;
    case "A4":
      if (d)
        return `Pilih dua jumlah benda lain yang bisa dibagi ${b} sama banyak. Tunjukkan bagian yang diambil.`;
      return `Gambarlah dua pembagian berbeda yang menunjukkan pecahan senilai dengan ${a}/${b}.`;
    case "B4":
      return `Gambarlah dua pembagian berbeda yang menunjukkan pecahan senilai dengan ${a}/${b}.`;
    case "B2":
    case "B3":
      return `Temukan dua susunan baris berbeda untuk ${a * b} benda. Tuliskan perkaliannya.`;
    case "C1":
      return "Buat dua pembagian berbeda dengan hasil yang sama. Buktikan memakai perkalian.";
    case "C2":
      return "Tentukan dua pasangan bilangan berbeda yang KPK-nya sama dengan soal ini. Jelaskan.";
    case "C3":
    case "D2":
      return "Buat dua pasangan pecahan berbeda yang jumlahnya sama dengan soal ini. Jelaskan dengan model.";
    case "C4":
      return "Buat dua paket pensil dengan banyak berbeda tetapi harga satuan sama. Tentukan harga tiap paket.";
    case "D1":
      return "Buat dua perjalanan berbeda yang berakhir di lantai hasil soal ini. Tentukan lantai awal dan geraknya.";
    case "D3":
      return `Buat dua resep berbeda dengan perbandingan ${a}:${b}. Jelaskan mengapa rasanya sama.`;
    case "D4":
      return "Tuliskan dua bentuk aljabar berbeda yang setara dengan soal ini. Buktikan dengan pengelompokan.";
    case "D5":
      return "Buat dua persamaan lain dengan nilai x yang sama. Tunjukkan operasi pada kedua ruas.";
    case "D6":
      return "Pilih dua nilai x lain. Tentukan titiknya dan jelaskan perubahan y.";
    case "E1":
      return `Buat dua perkalian berpangkat berbasis ${a} yang pangkat akhirnya sama. Jelaskan.`;
    case "E2":
      return "Temukan dua titik lain yang memenuhi semua batas. Jelaskan pemeriksaannya.";
    case "E3":
      return `Buat dua persamaan berbeda yang akarnya ${a} dan ${b}. Jelaskan mengapa akarnya tetap.`;
    case "E4":
      return "Buat dua persamaan pangkat lain dengan solusi x yang sama. Jelaskan.";
  }
}

export function optionalQuestion(q: GeneratedQuestion): GeneratedQuestion {
  return withPrompt(q, [
    { kind: "text", text: "Tantangan Terbuka. " },
    ...basePrompt(q),
    { kind: "text", text: ` Selesaikan soal di atas. ${openChallenge(q)}` },
  ]);
}
