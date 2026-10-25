import { describe, expect, it } from "vitest";
import { integerText } from "../../src/content/templates/format";

describe("integerText (shared number formatter)", () => {
  // Brand spec: the minus sign is U+2212 everywhere, never an ASCII hyphen.
  // Projected axes (number line, graph) rely on this shared formatter.
  it("uses U+2212 for negatives, not an ASCII hyphen", () => {
    for (const value of [-3, -2, -1, -2.5, -0.25]) {
      const out = integerText(value);
      expect(out).toContain("−"); // U+2212
      expect(out).not.toContain("-"); // ASCII hyphen-minus
      expect(out.codePointAt(0)).toBe(0x2212);
    }
  });
  it("formats decimals with a comma and thousands with a dot", () => {
    expect(integerText(2.5)).toBe("2,5");
    expect(integerText(1500)).toBe("1.500");
    expect(integerText(0)).toBe("0");
    expect(integerText(12)).toBe("12");
  });
});
