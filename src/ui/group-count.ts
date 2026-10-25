/** Digits only, no leading zero, max two characters. "" means "belum diisi". */
export function normaliseGroupCount(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 2);
  const stripped = digits.replace(/^0+/, "");
  return stripped;
}

/** Final value used for the request; never below 1, never above presentCount. */
export function clampGroupCount(raw: string, ceiling: number): number {
  const parsed = Number.parseInt(raw, 10);
  const safeCeiling = Number.isInteger(ceiling) && ceiling > 0 ? ceiling : 1;
  if (!Number.isFinite(parsed) || parsed < 1) return 1;
  return Math.min(parsed, safeCeiling);
}

/** TaRL rotates three stations (Guru, Papan, Mandiri), so a freshly prepared
 *  class defaults to three groups. This is the ceiling for the suggestion. */
export const MAX_GROUP_CEILING = 3;
/** Students-per-group heuristic. It only decides when to drop below three for a
 *  very small class; it never raises the count past the three-station ceiling. */
export const STUDENTS_PER_GROUP = 6;

/** Suggested group count for a fresh class, as the string the field expects.
 *  Aims for three groups and falls back to fewer only when the class is tiny,
 *  never returning zero for empty or invalid input. */
export function suggestedGroupCount(presentCount: number): string {
  const present =
    Number.isFinite(presentCount) && presentCount > 0 ? presentCount : 0;
  const bySize = Math.ceil(present / STUDENTS_PER_GROUP);
  return String(Math.max(1, Math.min(MAX_GROUP_CEILING, bySize)));
}
