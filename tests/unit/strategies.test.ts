import { describe, expect, it } from "vitest";
import {
  getStrategy,
  STRATEGIES,
  MISCONCEPTION_CODES,
  GENERIC_STRATEGY,
} from "../../src/content/strategies/registry";
describe("23 static strategies with honest review provenance", () => {
  it("covers exactly 18 phase D + 5 SD source codes", () => {
    expect(STRATEGIES).toHaveLength(23);
    expect(new Set(STRATEGIES.map((s) => s.code)).size).toBe(23);
    expect(STRATEGIES.filter((s) => s.code.startsWith("D"))).toHaveLength(18);
    expect(STRATEGIES.map((s) => s.code)).toEqual(MISCONCEPTION_CODES);
  });
  it.each(MISCONCEPTION_CODES)(
    "%s supplies 3 prompts, demonstration and a computed check, all draft",
    (code) => {
      const s = getStrategy(code);
      expect(s.code).toBe(code);
      expect(s.prompts).toHaveLength(3);
      expect(s.prompts.every((p) => p.endsWith("?"))).toBe(true);
      expect(s.demonstrate.length).toBeGreaterThan(20);
      expect(s.quickCheck.prompt.length).toBeGreaterThan(8);
      expect(s.quickCheck.teacherAnswer).not.toMatch(/NaN|undefined/);
      expect(s.metadata.status).toBe("draft");
      expect(s.metadata.reviewer).toBeNull();
      expect(s.metadata.reviewedAt).toBeNull();
      expect(s.metadata.sourceRef).toContain(code);
    },
  );
  it("unknown/draft-only/absent diagnosis gets generic support without inventing codes", () => {
    for (const code of [undefined, "D6.1", "E3.1", "NOT_A_CODE"])
      expect(getStrategy(code)).toBe(GENERIC_STRATEGY);
    expect(getStrategy("D1.2").quickCheck.teacherAnswer).toBe("−6");
    expect(getStrategy("D2.1").quickCheck.teacherAnswer).toBe("5/6");
    expect(getStrategy("D3.2").quickCheck.teacherAnswer).toBe("121");
    expect(getStrategy("D5.1").quickCheck.teacherAnswer).toBe("7");
  });
});
