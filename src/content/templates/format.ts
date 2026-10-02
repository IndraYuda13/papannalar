import {
  rational,
  compareRational,
  type Rational,
} from "../../core/math/rational";
import type { ExactAnswer, MathPrompt, ReviewMetadata } from "./types";

export function integerText(value: number | bigint): string {
  return value.toLocaleString("id-ID").replaceAll("-", "−");
}
export function rationalText(value: Rational): string {
  const v = rational(value.numerator, value.denominator);
  return v.denominator === 1n
    ? integerText(v.numerator)
    : `${integerText(v.numerator)}/${integerText(v.denominator)}`;
}
export function answerText(value: ExactAnswer): string {
  switch (value.kind) {
    case "number":
      return rationalText(value.value);
    case "linear":
      return `${rationalText(value.x)}x ${value.constant.numerator < 0n ? "−" : "+"} ${rationalText(rational(value.constant.numerator < 0n ? -value.constant.numerator : value.constant.numerator, value.constant.denominator))}`;
    case "roots":
      return [...value.values]
        .sort(compareRational)
        .map(rationalText)
        .join(" dan ");
    case "point":
      return `(${rationalText(value.x)}, ${rationalText(value.y)})`;
  }
}
export function canonicalAnswer(value: ExactAnswer): string {
  const key = (v: Rational) => {
    const n = rational(v.numerator, v.denominator);
    return `${n.numerator}/${n.denominator}`;
  };
  switch (value.kind) {
    case "number":
      return `n:${key(value.value)}`;
    case "linear":
      return `l:${key(value.x)};${key(value.constant)}`;
    case "point":
      return `p:${key(value.x)};${key(value.y)}`;
    case "roots":
      return `s:${[...new Set([...value.values].sort(compareRational).map(key))].join(";")}`;
  }
}
export function promptText(prompt: MathPrompt): string {
  return prompt
    .map((node) =>
      node.kind === "text"
        ? node.text
        : `${node.numerator}/${node.denominator}`,
    )
    .join("");
}
// Stable content identity, not a security primitive or credential.
export function contentHash(text: string): string {
  let hash = 2166136261;
  for (const char of text)
    hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return `fnv1a-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}
export function draftMetadata(
  sourceRef: string,
  content: string,
): ReviewMetadata {
  return {
    version: "1.0.0",
    status: "draft",
    reviewer: null,
    reviewedAt: null,
    sourceRef,
    contentHash: contentHash(content),
  };
}
