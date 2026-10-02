import { STEP_IDS, type StepId } from "../ladder/registry";
import { seededRandom } from "../../core/math/seed";
import {
  addRational,
  divideRational,
  rational,
} from "../../core/math/rational";
import { draftMetadata, integerText } from "./format";
import type {
  Distractor,
  ExactAnswer,
  MathPrompt,
  Params,
  QuestionTemplate,
} from "./types";

const number = (n: number, d = 1): ExactAnswer => ({
  kind: "number",
  value: rational(n, d),
});
const linear = (x: number, c: number): ExactAnswer => ({
  kind: "linear",
  x: rational(x),
  constant: rational(c),
});
const roots = (a: number, b: number): ExactAnswer => ({
  kind: "roots",
  values: [rational(a), rational(b)],
});
const point = (x: number, y: number): ExactAnswer => ({
  kind: "point",
  x: rational(x),
  y: rational(y),
});
const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
function params(step: StepId, seed: number, revision: 1 | 2 = 2): Params {
  const random = seededRandom(seed),
    int = (min: number, max: number) =>
      min + Math.floor(random() * (max - min + 1));
  let a = int(2, 8),
    b = int(2, 8),
    c = int(2, 8),
    d = int(2, 8);
  switch (step) {
    case "A1":
      a = int(2, 15);
      b = a + int(1, 5);
      break;
    case "A2":
      a = int(7, 9);
      b = int(4, 8);
      break;
    case "A3":
      a = int(2, 9);
      b = int(1, 9);
      break;
    case "A4":
      a = int(1, 3);
      b = a === 2 ? 4 : a === 3 ? 4 : int(1, 2) * 2;
      d = int(0, 1);
      c = d ? b * int(1, 5) : 0;
      if (d) a = 1;
      break;
    case "B1":
      a = int(100, 450);
      b = int(100, 450);
      break;
    case "B2":
      a = int(2, 10);
      b = int(2, 10);
      break;
    case "B3":
      a = int(2, 9);
      b = int(2, 9);
      break;
    case "B4":
      b = int(3, 12);
      a = int(1, b - 1);
      break;
    case "C1":
      a = int(101, 9999);
      b = int(2, 10);
      break;
    case "C2":
      a = int(2, 10);
      b = a + int(1, 4);
      break;
    case "C3":
    case "D2":
      b = int(2, 5);
      if (revision === 1) d = int(2, 5);
      else {
        const compatible = [2, 3, 4, 6, 12].filter(
          (denominator) => (b * denominator) / gcd(b, denominator) <= 12,
        );
        d = compatible.length ? compatible[int(0, compatible.length - 1)] : b;
      }
      a = int(1, b - 1);
      c = int(1, d - 1);
      if (revision === 2 && step === "D2" && int(0, 1)) a = -a;
      break;
    case "C4":
      a = int(2, 9);
      b = int(5, 40) * 100;
      break;
    case "D1":
      a = -int(1, 12);
      b = int(1, 12);
      break;
    case "D3":
      a = int(2, 5);
      b = a + int(1, 5);
      c = int(2, 5);
      break;
    case "D4":
      a = int(2, 6);
      b = int(2, 9);
      break;
    case "D5":
      a = int(2, 6);
      c = int(2, 9);
      b = -int(1, Math.min(9, a * c - 1));
      break;
    case "D6":
      a = int(1, 6);
      b = int(1, 9);
      c = int(1, 9);
      break;
    case "E1":
      a = int(2, 5);
      b = int(2, 6);
      c = int(2, 6);
      break;
    case "E2":
      a = int(1, 8);
      b = int(1, 8);
      c = a + b + 1;
      break;
    case "E3":
      a = int(1, 8);
      b = a + int(1, 5);
      break;
    case "E4":
      a = int(2, 4);
      b = int(1, 3);
      c = int(b + 1, 7);
      break;
  }
  // Only mathematically used parameters enter the fingerprint.
  if (!["A4", "C3", "D2"].includes(step)) d = 0;
  if (!["A4", "C3", "D2", "D3", "D5", "D6", "E1", "E2", "E4"].includes(step))
    c = 0;
  return { a, b, c, d };
}
export function solveTemplate(
  step: StepId,
  { a, b, c, d }: Params,
): ExactAnswer {
  switch (step) {
    case "A1":
      return number(Math.max(a, b));
    case "A2":
    case "B1":
      return number(a + b);
    case "A3":
      return number(a);
    case "A4":
      return d ? number(c, b) : number(a, b);
    case "B4":
      return number(a, b);
    case "B2":
    case "B3":
      return number(b);
    case "C1":
      return number(a);
    case "C2":
      return number((a * b) / gcd(a, b));
    case "C3":
    case "D2":
      return {
        kind: "number",
        value: addRational(rational(a, b), rational(c, d)),
      };
    case "C4":
      return {
        kind: "number",
        value: divideRational(rational(a * b), rational(a)),
      };
    case "D1":
      return number(a - b);
    case "D3":
      return number(b * c);
    case "D4":
      return linear(a, a * b);
    case "D5":
      return number(c);
    case "D6":
      return number(a * c + b);
    case "E1":
      return number(b + c);
    case "E2":
      return point(a, b);
    case "E3":
      return roots(a, b);
    case "E4":
      return number(c - b);
  }
}
function render(step: StepId, { a, b, c, d }: Params): MathPrompt {
  const n = integerText;
  let text = "";
  switch (step) {
    case "A1":
      text = `Mana lebih banyak: ${a} atau ${b} jeruk?`;
      break;
    case "A2":
    case "B1":
      text = `${n(a)} + ${n(b)} = …`;
      break;
    case "A3":
      text = `${a * 10 + b} terdiri dari berapa puluhan penuh?`;
      break;
    case "A4":
    case "B4":
      if (d)
        return [
          {
            kind: "text",
            text: `${b === 2 ? "Setengah" : "Seperempat"} dari ${c} benda adalah berapa benda?`,
          },
        ];
      text = `Satu batang dibagi ${b} bagian sama besar. ${a} bagian diwarnai. Berapa bagian dari satu utuh yang diwarnai?`;
      break;
    case "B2":
      text = `${a * b} : ${a} = …`;
      break;
    case "B3":
      text = `Lengkapi pasangan faktor ${a * b}: ${a} × … = ${a * b}`;
      break;
    case "C1":
      text = `${n(a * b)} : ${b} = …`;
      break;
    case "C2":
      text = `KPK dari ${a} dan ${b} = …`;
      break;
    case "C3":
    case "D2":
      return [
        { kind: "fraction", numerator: String(a), denominator: String(b) },
        { kind: "text", text: " + " },
        { kind: "fraction", numerator: String(c), denominator: String(d) },
        { kind: "text", text: " = …" },
      ];
    case "C4":
      text = `${a} pensil harganya Rp${n(a * b)}. Harga satu pensil adalah … rupiah.`;
      break;
    case "D1":
      text = `${n(a)} − ${b} = …`;
      break;
    case "D3":
      text = `${a} : ${b} = ${a * c} : …`;
      break;
    case "D4":
      text = `${a}(x + ${b}) = …`;
      break;
    case "D5":
      text = `${a}x − ${-b} = ${a * c + b}. Nilai x = …`;
      break;
    case "D6":
      text = `y = ${a}x + ${b}. Jika x = ${c}, maka y = …`;
      break;
    case "E1":
      text = `${a}^${b} × ${a}^${c} = ${a} pangkat …`;
      break;
    case "E2":
      text = `Titik mana memenuhi x + y ≤ ${c}, x ≥ 0, dan y ≥ 0?`;
      break;
    case "E3":
      text = `x² − ${a + b}x + ${a * b} = 0. Semua nilai x adalah …`;
      break;
    case "E4":
      text = `${a}^(x + ${b}) = ${n(a ** c)}. Nilai x = …`;
      break;
  }
  return [{ kind: "text", text }];
}
function reason(step: StepId, { a, b, c, d }: Params): string {
  switch (step) {
    case "A1":
      return `${b} berisi semua ${a} benda dan masih ${b - a} benda lagi.`;
    case "A2":
      return `Tambahkan ${b} benda ke ${a} benda, lalu hitung seluruhnya.`;
    case "A3":
      return `Setiap ikatan sepuluh bernilai satu puluhan; ada ${a} ikatan dan ${b} satuan.`;
    case "A4":
    case "B4":
      if (d)
        return `Bagikan ${c} benda menjadi ${b} bagian sama banyak, lalu ambil satu bagian.`;
      return `${a} bagian dari ${b} bagian yang sama besar diwarnai.`;
    case "B1":
      return "Jumlahkan nilai tempat yang sama dan tukarkan sepuluh satuan ke satu puluhan bila perlu.";
    case "B2":
    case "B3":
      return `${a * b} dibagi ke ${a} kelompok sama banyak, masing-masing ${b}.`;
    case "C1":
      return `${b} kelompok masing-masing ${a} menghasilkan ${a * b}.`;
    case "C2":
      return "Cari kelipatan positif pertama yang dimiliki kedua bilangan.";
    case "C3":
    case "D2":
      return `Samakan ukuran bagian: ${a * d}/${b * d} + ${c * b}/${b * d}, lalu jumlahkan pembilangnya.`;
    case "C4":
      return `Bagi total harga ${a * b} dengan ${a} pensil untuk harga satu pensil.`;
    case "D1":
      return `Mulai di ${integerText(a)}, lalu bergerak ${b} langkah ke kiri.`;
    case "D3":
      return `Kedua besaran dikalikan faktor yang sama, yaitu ${c}.`;
    case "D4":
      return `Ada ${a} kelompok; tiap kelompok memuat x dan ${b} satuan.`;
    case "D5":
      return `Tambahkan ${-b} ke kedua ruas, lalu bagi kedua ruas dengan ${a}.`;
    case "D6":
      return `Ganti x dengan ${c}, kalikan dengan ${a}, lalu tambahkan ${b}.`;
    case "E1":
      return "Perkalian dengan basis sama menggabungkan jumlah faktor, sehingga pangkat dijumlahkan.";
    case "E2":
      return `Koordinat tidak negatif dan jumlahnya ${a + b}, yang tidak melebihi ${c}.`;
    case "E3":
      return `(x − ${a})(x − ${b}) = 0; salah satu faktor harus nol.`;
    case "E4":
      return `Ruas kanan adalah ${a} pangkat ${c}; jadi x + ${b} = ${c}.`;
  }
}
function distractors(step: StepId, p: Params): Distractor[] {
  const { a, b, c, d } = p;
  const mis = (
    value: ExactAnswer,
    code: string,
    explanation: string,
  ): Distractor => ({
    value,
    misconceptionCode: code,
    classification: "misconception",
    explanation,
  });
  switch (step) {
    case "A2":
      return [
        mis(
          number(a + b - 1),
          "A2.1",
          "Bilangan awal ikut dihitung sebagai langkah pertama.",
        ),
        mis(
          number(Math.abs(a - b)),
          "A2.2",
          "Jumlah dicari dengan mengurangkan banyak bendanya.",
        ),
      ];
    case "B4":
      return [
        mis(
          number(b - a, b),
          "B4.1",
          "Yang disebut adalah bagian yang tidak diwarnai.",
        ),
        mis(number(b, a), "B4.2", "Jumlah seluruh bagian menjadi pembilang."),
        mis(
          number(a),
          "B4.3",
          "Cukup menghitung bagian berwarna tanpa membandingkan satu utuh.",
        ),
      ];
    case "D1":
      return [
        mis(
          number(-Math.abs(a + b)),
          "D1.2",
          "Kurangi nilai mutlak lalu beri tanda minus.",
        ),
      ];
    case "D2":
      return [
        mis(
          number(a + c, b + d),
          "D2.1",
          "Pembilang dan penyebut masing-masing dijumlahkan langsung.",
        ),
      ];
    case "D3":
      return [
        mis(
          number(b + a * (c - 1)),
          "D3.1",
          "Tambahkan selisih yang sama pada kedua besaran.",
        ),
      ];
    case "D4":
      return [
        mis(
          linear(a, b),
          "D4.2",
          "Faktor di luar kurung hanya mengalikan suku x.",
        ),
      ];
    case "D5":
      return [
        mis(
          number(a * c + 2 * b, a),
          "D5.1",
          "Konstanta dipindah ruas dengan tanda yang sama.",
        ),
        mis(
          number(a * c - a),
          "D5.3",
          "Koefisien x dikurangkan, bukan membagi kedua ruas.",
        ),
      ];
    default:
      return [];
  }
}
export function fallbackDistractor(
  step: StepId,
  p: Params,
  offset: number,
): Distractor {
  const answer = solveTemplate(step, p);
  let value: ExactAnswer;
  switch (answer.kind) {
    case "number":
      value = {
        kind: "number",
        value: addRational(answer.value, rational(offset)),
      };
      break;
    case "linear":
      value = {
        kind: "linear",
        x: answer.x,
        constant: addRational(answer.constant, rational(offset)),
      };
      break;
    case "roots":
      value = roots(-p.a - offset, -p.b - offset);
      break;
    case "point":
      value = point(p.c + offset, p.c + 1);
      break;
  }
  const explanation =
    answer.kind === "point"
      ? `Titik (${p.c + offset}, ${p.c + 1}) dipilih tanpa memeriksa batas jumlah koordinat.`
      : answer.kind === "roots"
        ? `Akar diperkirakan sebagai ${-p.a - offset} dan ${-p.b - offset} tanpa menguji hasil substitusi.`
        : `Hasil perhitungan ditambah ${offset}; operasi tambahan ini tidak diminta soal.`;
  return { value, classification: "arithmetic-error", explanation };
}
function makeTemplate(stepId: StepId, revision: 1 | 2): QuestionTemplate {
  const version = revision === 2 && ["C3", "D2"].includes(stepId) ? 2 : 1;
  return {
    id: `pn-${stepId.toLowerCase()}-v${version}`,
    stepId,
    metadata: {
      ...draftMetadata(
        `S1 bagian 5; S3 ${stepId}; K19 draft`,
        `${stepId}:template-${version}.0.0`,
      ),
      version: version === 2 ? "2.0.0" : "1.0.0",
    },
    generateParams: (seed: number) => params(stepId, seed, revision),
    validate: (p: Params) =>
      Object.values(p).every(Number.isSafeInteger) &&
      (stepId === "D5" ? p.a > 0 : p.b > 0) &&
      (!["C3", "D2"].includes(stepId) || p.d > 0)
        ? []
        : ["Invalid mathematical parameters"],
    solve: (p: Params) => solveTemplate(stepId, p),
    render: (p: Params) => render(stepId, p),
    reason: (p: Params) => reason(stepId, p),
    distractors: (p: Params) => distractors(stepId, p),
  };
}
export const QUESTION_TEMPLATES: readonly QuestionTemplate[] = STEP_IDS.map(
  (step) => makeTemplate(step, 2),
);
export function templateFor(
  step: StepId,
  revision: 1 | 2 = 2,
): QuestionTemplate {
  const template = QUESTION_TEMPLATES.find((t) => t.stepId === step);
  if (!template) throw new RangeError("Unsupported content step");
  return revision === 1 ? makeTemplate(step, 1) : template;
}
