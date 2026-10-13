import { describe, expect, it } from "vitest";
import {
  normaliseGroupCount,
  clampGroupCount,
} from "../../src/ui/group-count";

describe("group count input", () => {
  it("keeps the empty draft instead of collapsing to 0", () => {
    expect(normaliseGroupCount("")).toBe("");
    expect(normaliseGroupCount("0")).toBe("");
    expect(normaliseGroupCount("00")).toBe("");
  });
  it("strips leading zeros so deleting from 3 never yields 03", () => {
    expect(normaliseGroupCount("03")).toBe("3");
    expect(normaliseGroupCount("0")).toBe("");
  });
  it("keeps only digits and caps at two characters", () => {
    expect(normaliseGroupCount("1a2")).toBe("12");
    expect(normaliseGroupCount("123456")).toBe("12");
  });
  it("clamps to the present-student ceiling", () => {
    expect(clampGroupCount("9", 5)).toBe(5);
    expect(clampGroupCount("", 5)).toBe(1);
    expect(clampGroupCount("3", 5)).toBe(3);
    expect(clampGroupCount("0", 5)).toBe(1);
  });
});
