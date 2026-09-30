import type { GeneratedQuestion, Params } from "../../content/templates/types";
import {
  fallbackDistractor,
  templateFor,
} from "../../content/templates/registry";
import { integerText as n } from "../../content/templates/format";
import { copiedContentHash } from "./content-copy";

// Authored alternatives, not truncated explanations. These remain draft K19
// content; classification, option order and the frozen reason key never change.
const misconceptions: Readonly<Record<string, string>> = {
  "A2.1": "Bilangan awal ikut dihitung sebagai langkah pertama.",
  "A2.2": "Jumlah dicari dengan mengurangkan banyak bendanya.",
  "B4.1": "Hitung bagian yang tidak diwarnai.",
  "B4.2": "Jumlah seluruh bagian menjadi pembilang.",
  "B4.3": "Hitung bagian berwarna saja, abaikan satu utuh.",
  "D1.2": "Kurangi nilai mutlak, lalu beri tanda minus.",
  "D2.1": "Pembilang dan penyebut masing-masing dijumlahkan langsung.",
  "D3.1": "Tambahkan selisih yang sama pada kedua besaran.",
  "D4.2": "Faktor luar hanya mengalikan x.",
  "D5.1": "Konstanta dipindah ruas dengan tanda yang sama.",
  "D5.3": "Kurangkan koefisien x dari kedua ruas.",
};

function correctReason(q: GeneratedQuestion): string {
  const { a, b, c, d } = q.params;
  switch (q.stepId) {
    case "A1":
      return `${b} memuat ${a} benda dan ${b - a} tambahan.`;
    case "A2":
      return `Gabungkan ${a} dan ${b} benda, hitung seluruhnya.`;
    case "A3":
      return `${a} ikatan sepuluh berarti ${a} puluhan.`;
    case "A4":
    case "B4":
      return d
        ? `Bagi ${c} benda menjadi ${b} kelompok; ambil satu.`
        : `Ambil ${a} dari ${b} bagian sama besar.`;
    case "B1":
      return "Jumlahkan sesuai nilai tempat; lakukan pertukaran bila perlu.";
    case "B2":
    case "B3":
      return `${a} kelompok berisi ${b}; seluruhnya ${a * b}.`;
    case "C1":
      return `Pembagian dibalik: ${b} × ${n(a)} = ${n(a * b)}.`;
    case "C2":
      return "Kelipatan positif bersama yang terkecil.";
    case "C3":
    case "D2":
      return "Samakan penyebut dengan pecahan senilai; jumlahkan pembilang.";
    case "C4":
      return `Harga satu pensil: ${n(a * b)} dibagi ${a}.`;
    case "D1":
      return `Dari ${n(a)}, mundur ${b} langkah.`;
    case "D3":
      return `Kalikan kedua besaran dengan ${c}.`;
    case "D4":
      return `Kalikan x dan ${b} dengan ${a}.`;
    case "D5":
      return `Tambah ${-b}, lalu bagi ${a}, pada kedua ruas.`;
    case "D6":
      return `Ganti x dengan ${c}: ${a}×${c}+${b}.`;
    case "E1":
      return "Basis sama: pangkat dijumlahkan saat perkalian.";
    case "E2":
      return `Koordinat nonnegatif; jumlahnya tidak melebihi ${c}.`;
    case "E3":
      return "Hasil kali nol; salah satu faktor nol.";
    case "E4":
      return `Basis sama, jadi x + ${b} = ${c}.`;
  }
}

function arithmeticReason(
  kind: ReturnType<typeof fallbackDistractor>["value"]["kind"],
  p: Params,
  offset: number,
): string {
  if (kind === "point")
    return `Pilih (${p.c + offset}, ${p.c + 1}) tanpa memeriksa batas jumlah.`;
  if (kind === "roots")
    return `Pilih akar ${n(-p.a - offset)} dan ${n(-p.b - offset)} tanpa substitusi.`;
  return `Tambahkan ${offset} pada hasil hitungan.`;
}

/** Both copies are teacher-side content. Only label/text belong on the board. */
export function exitReasonCopy(q: GeneratedQuestion) {
  const template = templateFor(
    q.stepId,
    q.metadata.version === "1.0.0" ? 1 : 2,
  );
  const wrong = template.distractors(q.params);
  return q.reasons.map((reason) => {
    let text: string;
    let teacherExplanation: string;
    if (reason.classification === "correct") {
      text = correctReason(q);
      teacherExplanation = template.reason(q.params);
    } else if (reason.misconceptionCode) {
      const original = wrong.find(
        (d) => d.misconceptionCode === reason.misconceptionCode,
      );
      const authored = misconceptions[reason.misconceptionCode];
      if (!original || !authored) throw new Error("Unsupported exit reason");
      text = authored;
      teacherExplanation = original.explanation;
    } else {
      // Match the existing deterministic distractor, never infer an offset by
      // chopping/parsing its prose. This also makes repeated projection safe.
      let match: { text: string; teacherExplanation: string } | undefined;
      for (let offset = 1; offset <= 50; offset++) {
        const candidate = fallbackDistractor(q.stepId, q.params, offset);
        const authored = arithmeticReason(
          candidate.value.kind,
          q.params,
          offset,
        );
        if (reason.text === candidate.explanation || reason.text === authored) {
          match = { text: authored, teacherExplanation: candidate.explanation };
          break;
        }
      }
      if (!match) throw new Error("Unsupported exit reason");
      ({ text, teacherExplanation } = match);
    }
    return { label: reason.label, text, teacherExplanation };
  });
}

export function withPublicExitReasons(q: GeneratedQuestion): GeneratedQuestion {
  const copies = exitReasonCopy(q);
  const reasons = q.reasons.map((reason, i) => ({
    ...reason,
    text: copies[i].text,
  }));
  if (reasons.every((reason, i) => reason.text === q.reasons[i].text)) return q;
  return {
    ...q,
    reasons,
    metadata: {
      ...q.metadata,
      contentHash: copiedContentHash({ ...q, reasons }),
    },
  };
}
