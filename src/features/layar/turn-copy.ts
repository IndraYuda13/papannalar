import type { PublicRoles } from "@/contracts/turns";

/**
 * The board's turn-taking sentence, in plain Indonesian (§I.2.2).
 *
 * `Pilot` / `Navigator` are role-play identifiers from the activity engine
 * (`core/turns/scheduler.ts`). They were rendered on the projected board as two numbers in boxes
 * with no explanation of the role, the number or the turn — the owner's exact complaint. §I.2
 * bans the word; §I.2.2 requires that where the turn genuinely matters, the screen explains the
 * interaction **in plain Indonesian, in the place the role is used**.
 *
 * So the role is stated by what the student does — moves the marker, explains the reason — and the
 * attendance numbers stay, because those are the part a student acts on. The attendance numbers
 * are the only per-student data a board may show (it is how a card row is found); no name is ever
 * rendered.
 *
 * One helper, three call sites, so the three screens cannot drift into three vocabularies — which
 * is how the banned word survived in `activity.tsx` after it had been removed from `board-copy.ts`.
 */
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
