import type { MathPrompt } from "../../content/templates/types";
import type { ToolTask } from "../tools/patterns";

export type PublicDiagram =
  | { kind: "counters"; values: number[]; operation: "compare" | "add" }
  | { kind: "place-value"; values: number[] }
  | { kind: "fractions"; values: { numerator: number; denominator: number }[] }
  | { kind: "sharing"; total: number; containers: number }
  | { kind: "multiples"; steps: number[] }
  | { kind: "price"; quantity: number; total: number }
  | { kind: "quantities"; labels: string[] };

// Decode only the public, deterministic prompt grammar. This never receives keys,
// StepId, student data, or a solved result. Unknown wording has a literal-only fallback.
export function publicDiagram(
  prompt: MathPrompt,
  openingTool?: ToolTask,
): PublicDiagram {
  if (openingTool?.kind === "fractions")
    return {
      kind: "fractions",
      values: (openingTool.operation === "represent"
        ? [openingTool.left]
        : [openingTool.left, openingTool.right]
      ).map((v) => ({ numerator: v.numerator, denominator: v.denominator })),
    };
  let text = prompt
    .map((n) =>
      n.kind === "text" ? n.text : `${n.numerator}/${n.denominator}`,
    )
    .join("");
  const fractions = [...text.matchAll(/([−-]?\d+)\/(\d+)/g)].map((n) => ({
    numerator: Number(n[1].replace("−", "-")),
    denominator: Number(n[2]),
  }));
  if (
    fractions.length &&
    fractions.length <= 2 &&
    fractions.every(
      (n) =>
        Number.isInteger(n.numerator) &&
        n.denominator >= 2 &&
        n.denominator <= 12 &&
        Math.abs(n.numerator) <= n.denominator,
    )
  )
    return { kind: "fractions", values: fractions };
  // The contextual variants preserve the same given quantities. Normalize only
  // known catalogue wording, without inferring a solution or an assessment key.
  text = text
    .replace(
      /Dua keranjang berisi (\d+) dan (\d+) jeruk\./,
      "Mana lebih banyak: $1 atau $2 jeruk?",
    )
    .replace(/Ada (\d+) kelereng, lalu mendapat (\d+) lagi\./, "$1 + $2 = …")
    .replace(
      /Buku memiliki (\d+) halaman\./,
      "$1 terdiri dari berapa puluhan penuh?",
    )
    .replace(/Persediaan (\d+) buku ditambah (\d+) buku\./, "$1 + $2 = …")
    .replace(
      /Martabak dibagi (\d+) sama besar\. Diambil (\d+) potong\./,
      "Satu batang dibagi $1 bagian sama besar. $2 bagian diwarnai",
    )
    .replace(
      /Ada (\d+) potong kue\. (Setengah|Seperempat) dibagikan\./,
      "$2 dari $1 benda",
    )
    .replace(
      /(\d+) kursi disusun dalam (\d+) baris sama banyak\./,
      "$1 : $2 = …",
    )
    .replace(/([\d.]+) botol dibagikan rata untuk (\d+) hari\./, "$1 : $2 = …")
    .replace(
      /Dua lampu berkedip setiap (\d+) dan (\d+) detik\./,
      "KPK dari $1 dan $2",
    )
    .replace(/(\d+) pensil berharga Rp([\d.]+)/, "$1 pensil harganya Rp$2");
  const integer = (value: string) => Number(value.replaceAll(".", ""));
  let match = text.match(/Mana lebih banyak: (\d+) atau (\d+) jeruk\?/);
  if (match && Math.max(+match[1], +match[2]) <= 20)
    return {
      kind: "counters",
      values: [+match[1], +match[2]],
      operation: "compare",
    };
  match = text.match(/([\d.]+) \+ ([\d.]+) = …/);
  if (match) {
    const values = [integer(match[1]), integer(match[2])];
    if (values.every((n) => n >= 0 && n <= 999))
      return values.every((n) => n <= 20)
        ? { kind: "counters", values, operation: "add" }
        : { kind: "place-value", values };
  }
  match = text.match(/(\d+) terdiri dari berapa puluhan penuh\?/);
  if (match && +match[1] <= 999)
    return { kind: "place-value", values: [+match[1]] };
  match = text.match(
    /Satu batang dibagi (\d+) bagian sama besar\. (\d+) bagian diwarnai/,
  );
  if (match && +match[1] >= 2 && +match[1] <= 12 && +match[2] <= +match[1])
    return {
      kind: "fractions",
      values: [{ numerator: +match[2], denominator: +match[1] }],
    };
  match = text.match(/(Setengah|Seperempat) dari (\d+) benda/);
  if (match && +match[2] <= 100)
    return {
      kind: "sharing",
      total: +match[2],
      containers: match[1] === "Setengah" ? 2 : 4,
    };
  match = text.match(/([\d.]+) : (\d+) = …/);
  if (match && integer(match[1]) <= 100000 && +match[2] >= 1 && +match[2] <= 12)
    return { kind: "sharing", total: integer(match[1]), containers: +match[2] };
  match = text.match(/pasangan faktor (\d+): (\d+) × …/);
  if (match && +match[1] <= 100 && +match[2] >= 1 && +match[2] <= 12)
    return { kind: "sharing", total: +match[1], containers: +match[2] };
  match = text.match(/KPK dari (\d+) dan (\d+)/);
  if (
    match &&
    +match[1] >= 1 &&
    +match[2] >= 1 &&
    Math.max(+match[1], +match[2]) <= 20
  )
    return { kind: "multiples", steps: [+match[1], +match[2]] };
  match = text.match(/(\d+) pensil harganya Rp([\d.]+)/);
  if (match && +match[1] >= 1 && +match[1] <= 12 && integer(match[2]) <= 100000)
    return { kind: "price", quantity: +match[1], total: integer(match[2]) };
  const labels = [...text.matchAll(/−?\d+(?:[.,]\d+)*(?:\/\d+)?/g)]
    .slice(0, 4)
    .map((m) => m[0]);
  return {
    kind: "quantities",
    labels: labels.length ? labels : ["Model", "Alasan"],
  };
}
