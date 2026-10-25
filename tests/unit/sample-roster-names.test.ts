import { describe, expect, it } from "vitest";
import {
  SAMPLE_STUDENT_NAMES,
  SAMPLE_STUDENT_NAME_LIMIT,
  sampleStudentName,
} from "../../src/content/demo/sample-names";

describe("sample roster names", () => {
  it("covers every attendance number the roster allows, without a duplicate", () => {
    expect(SAMPLE_STUDENT_NAMES).toHaveLength(SAMPLE_STUDENT_NAME_LIMIT);
    expect(new Set(SAMPLE_STUDENT_NAMES).size).toBe(SAMPLE_STUDENT_NAME_LIMIT);
    for (let n = 1; n <= SAMPLE_STUDENT_NAME_LIMIT; n++)
      expect(sampleStudentName(n)).toBe(SAMPLE_STUDENT_NAMES[n - 1]);
  });

  it("refuses an attendance number outside the roster range", () => {
    for (const value of [0, -1, 41, 1.5, Number.NaN])
      expect(() => sampleStudentName(value)).toThrow(RangeError);
  });
});
