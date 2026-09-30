// Canonical order and labels: docs/01_PRD.md, Tangga Nalar Fase A sampai E.
const definitions = [
  ["A1", "A", "Bilangan sampai 20: membilang dan membandingkan"],
  ["A2", "A", "Tambah dan kurang sampai 20"],
  ["A3", "A", "Bilangan sampai 100 dan nilai tempat"],
  ["A4", "A", "Setengah dan seperempat"],
  ["B1", "B", "Nilai tempat sampai 10.000; tambah dan kurang sampai 1.000"],
  ["B2", "B", "Perkalian dan pembagian sampai 100"],
  ["B3", "B", "Kelipatan dan faktor"],
  ["B4", "B", "Pecahan: makna, membandingkan, senilai"],
  ["C1", "C", "Operasi hitung sampai 100.000"],
  ["C2", "C", "KPK dan FPB"],
  ["C3", "C", "Operasi pecahan dan pecahan campuran"],
  ["C4", "C", "Desimal dan rasio satuan"],
  ["D1", "D", "Bilangan Bulat"],
  ["D2", "D", "Pecahan dan Desimal (bilangan rasional)"],
  ["D3", "D", "Rasio, Proporsi, dan Persen"],
  ["D4", "D", "Bentuk Aljabar"],
  ["D5", "D", "Persamaan Linear Satu Variabel"],
  ["D6", "D", "Fungsi Linear dan Sistem Persamaan Linear Dua Variabel"],
  ["E1", "E", "Bilangan berpangkat, termasuk pangkat pecahan dan bentuk akar"],
  ["E2", "E", "Sistem pertidaksamaan linear dua variabel"],
  ["E3", "E", "Persamaan dan fungsi kuadrat"],
  ["E4", "E", "Persamaan dan fungsi eksponensial"],
] as const;

export type StepId = (typeof definitions)[number][0];
export type Phase = (typeof definitions)[number][1];

const phaseGrades = Object.freeze({
  A: Object.freeze([1, 2]),
  B: Object.freeze([3, 4]),
  C: Object.freeze([5, 6]),
  D: Object.freeze([7, 8, 9]),
  E: Object.freeze([10]),
});

export const STEP_REGISTRY = Object.freeze(
  definitions.map(([id, phase, label], index) =>
    Object.freeze({ id, phase, index, label, grades: phaseGrades[phase] }),
  ),
);
export const STEP_IDS = Object.freeze(STEP_REGISTRY.map((step) => step.id));
const byId = new Map(STEP_REGISTRY.map((step) => [step.id, step]));

export function isStepId(value: unknown): value is StepId {
  return typeof value === "string" && byId.has(value as StepId);
}

export function parseStepId(value: unknown): StepId {
  if (!isStepId(value)) throw new RangeError("Invalid StepId");
  return value;
}

export function getStep(id: StepId) {
  return byId.get(parseStepId(id))!;
}

export function compareSteps(left: StepId, right: StepId): number {
  return Math.sign(getStep(left).index - getStep(right).index);
}

export function previousStep(id: StepId): StepId | undefined {
  return STEP_IDS[getStep(id).index - 1];
}

export function nextStep(id: StepId): StepId | undefined {
  return STEP_IDS[getStep(id).index + 1];
}

// Zero-based integer index. Endpoints clamp; invalid numbers never become A1.
export function stepAtClampedIndex(index: number): StepId {
  if (!Number.isSafeInteger(index)) throw new RangeError("Invalid step index");
  return STEP_IDS[Math.max(0, Math.min(STEP_IDS.length - 1, index))];
}

// Inclusive, ascending range. Reversed bounds are a caller error.
export function stepsBetween(first: StepId, last: StepId): readonly StepId[] {
  const start = getStep(first).index;
  const end = getStep(last).index;
  if (start > end) throw new RangeError("Reversed step range");
  return Object.freeze(STEP_IDS.slice(start, end + 1));
}
