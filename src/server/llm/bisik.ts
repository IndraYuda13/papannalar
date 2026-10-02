import "server-only";
import { bisikOutputSchema } from "../../contracts/bisik";
import { getStrategy, type Strategy } from "../../content/strategies/registry";
import { CONTENT_APPROVALS, isApproved, type ContentApproval } from "./reviews";
import type { BisikInput } from "./provider";
export function staticBisik(code: string) {
  const strategy = getStrategy(code);
  return {
    answer: [...strategy.prompts, strategy.demonstrate].join(" "),
    sourceStrategyIds: [strategy.code],
  };
}
export function approvedStrategy(
  code: string,
  approvals: readonly ContentApproval[] = CONTENT_APPROVALS,
): Strategy | null {
  const s = getStrategy(code);
  return isApproved(s.code, s.metadata.contentHash, approvals) ? s : null;
}
export function bisikInput(strategy: Strategy, question?: string): BisikInput {
  return {
    question:
      question ?? "Sesuaikan pertanyaan pemantik agar mudah digunakan guru.",
    strategies: [
      {
        code: strategy.code,
        prompts: strategy.prompts.map((p) => p),
        demonstrate: strategy.demonstrate,
      },
    ],
  };
}
export function safeQuestionText(text: string): boolean {
  // Defense in depth only; the unknown-name review gate remains mandatory.
  return (
    text.length <= 500 &&
    !/[<>]|https?:|[^\s@]+@[^\s@]+\.[^\s@]+|(?:\+?\d[\s().-]*){7,}|(?:nama|absen|alamat|nisn)\s*[:=]|abaikan.*(?:aturan|instruksi)|ignore.*instructions/iu.test(
      text,
    )
  );
}
export function validateBisik(raw: unknown, sourceCodes: readonly string[]) {
  const result = bisikOutputSchema.parse(raw);
  if (
    result.answer.split(/\s+/u).length > 80 ||
    !safeQuestionText(result.answer) ||
    /\b(bodoh|lemah|remedial|peringkat|skor|level siswa)\b/iu.test(
      result.answer,
    ) ||
    !/\b(guru|siswa|mulai|mana|bagaimana|coba|tunjukkan|pertanyaan|benda|mengapa|berapa|jika)\b/iu.test(
      result.answer,
    ) ||
    new Set(result.sourceStrategyIds).size !==
      result.sourceStrategyIds.length ||
    result.sourceStrategyIds.some((s) => !sourceCodes.includes(s))
  )
    throw new Error("INVALID_RESPONSE");
  return result;
}
