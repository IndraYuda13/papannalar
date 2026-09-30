import { describe, expect, it } from "vitest";
import { paginateDisplayText } from "../../src/features/layar/appearance-pagination";

describe("display text pages", () => {
  it("keeps a fitting prompt on one page", () => {
    expect(paginateDisplayText("−3 − 5 = …", () => true)).toEqual([
      "−3 − 5 = …",
    ]);
  });
  it("preserves all 400 characters, newlines and repeated spaces", () => {
    const text = "Amati  pola\njelaskan alasanmu. ".repeat(16).slice(0, 400);
    const pages = paginateDisplayText(text, (value) => value.length <= 61);
    expect(pages.join("")).toBe(text);
    expect(pages.length).toBeGreaterThan(1);
    expect(pages.every((page) => page.length > 0 && page.length <= 61)).toBe(
      true,
    );
  });
  it("keeps normal words and fractions together at a boundary", () => {
    const text = "Batang berisi 3/4 bagian berwarna.";
    const pages = paginateDisplayText(text, (value) => value.length <= 16);
    expect(pages.join("")).toBe(text);
    expect(
      pages.every((page) => !page.endsWith("3/") && !page.startsWith("/4")),
    ).toBe(true);
  });
  it("breaks an oversized word without losing characters or looping", () => {
    const text = "panjang".repeat(57).slice(0, 399);
    const pages = paginateDisplayText(text, (value) => value.length <= 25);
    expect(pages.join("")).toBe(text);
    expect(pages.every((page) => page.length <= 25)).toBe(true);
  });
  it("does not split surrogate pairs when very little space is available", () => {
    const text = "🟩🟦🟩";
    expect(
      paginateDisplayText(text, (value) => Array.from(value).length <= 1),
    ).toEqual(["🟩", "🟦", "🟩"]);
  });
  it("terminates even when the measuring surface temporarily cannot fit a glyph", () => {
    expect(paginateDisplayText("abc", () => false)).toEqual(["a", "b", "c"]);
    expect(paginateDisplayText("", () => false)).toEqual([""]);
  });
});
