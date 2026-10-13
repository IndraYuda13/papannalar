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
