import type { PublicRoles } from "@/contracts/turns";

function numbers(values: readonly number[]) {
  return values.map((n) => String(n).padStart(2, "0")).join(" · ");
}

export function turnInstruction(roles?: PublicRoles): string | undefined {
  if (!roles) return undefined;
  const movers = numbers(roles.pilots);
  const explainers = numbers(roles.navigators);
  if (movers && explainers)
    return `Absen ${movers} menggeser penanda; absen ${explainers} menjelaskan alasannya. Siswa lain menulis tebakan di buku.`;
  if (movers)
    return `Absen ${movers} menggeser penanda. Siswa lain menulis tebakan di buku.`;
  if (explainers)
    return `Absen ${explainers} menjelaskan alasannya. Siswa lain menulis tebakan di buku.`;
  return "Setiap kelompok bergiliran: satu siswa menggeser penanda, satu menjelaskan alasannya.";
}

/**
 * The hand-over control on the two-touch moment, when simultaneous touches are unavailable.
 * An instruction, not a role name: it says what pressing it does to the lesson.
 */
export function turnHandOverLabel(next: "A" | "B") {
  return `Serahkan giliran ke sisi ${next}`;
}
