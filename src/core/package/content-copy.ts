import type { GeneratedQuestion } from "../../content/templates/types";
import { contentHash } from "../../content/templates/format";

/** A draft wording copy must hash identically before and after schema parsing. */
export function copiedContentHash(
  q: Pick<GeneratedQuestion, "params" | "prompt" | "options" | "reasons">,
): string {
  return contentHash(
    JSON.stringify({
      params: [q.params.a, q.params.b, q.params.c, q.params.d],
      prompt: q.prompt.map((node) =>
        node.kind === "text"
          ? [node.kind, node.text]
          : [node.kind, node.numerator, node.denominator],
      ),
      options: q.options.map((o) => [
        o.label,
        o.text,
        o.canonicalValue,
        o.classification,
        o.misconceptionCode ?? null,
      ]),
      reasons: q.reasons.map((r) => [
        r.label,
        r.text,
        r.classification,
        r.misconceptionCode ?? null,
      ]),
    }),
  );
}
