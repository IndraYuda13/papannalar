// Pure LOCAL teacher boundary. Never send the names list or rejected raw text.
export function previewBisikQuestion(
  raw: string,
  localNames: readonly string[],
):
  | { ok: true; text: string }
  | { ok: false; reason: "identity" | "length" | "instruction" } {
  const text = raw
    .normalize("NFKC")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .trim();
  if (!text || text.length > 500) return { ok: false, reason: "length" };
  const folded = text.toLocaleLowerCase("id-ID");
  if (
    /[^\s@]+@[^\s@]+\.[^\s@]+/u.test(text) ||
    /(?:\+?\d[\s().-]*){7,}/u.test(text) ||
    /(?:nama|absen|alamat|nisn|nomor induk)\s*[:=]/iu.test(text) ||
    localNames.some((name) => {
      const normalized = name
        .normalize("NFKC")
        .toLocaleLowerCase("id-ID")
        .trim();
      return (
        normalized &&
        (folded.includes(normalized) ||
          normalized
            .split(/\s+/)
            .some(
              (word) =>
                word.length >= 3 &&
                folded.split(/[^\p{L}\p{N}]+/u).includes(word),
            ))
      );
    })
  )
    return { ok: false, reason: "identity" };
  if (
    /[<>]|https?:|abaikan.*(?:aturan|instruksi)|system\s*prompt|ignore.*instructions/iu.test(
      text,
    )
  )
    return { ok: false, reason: "instruction" };
  return { ok: true, text };
}
