import { describe, expect, it } from "vitest";
import { publicDiagram } from "../../src/core/package/public-diagram";
import { generateQuestion } from "../../src/core/package/question";
import { withContext } from "../../src/content/contexts/question";
import { toPublicQuestion } from "../../src/contracts/package";
import { STEP_IDS } from "../../src/content/ladder/registry";
import { demoOpening } from "../../src/core/package/opening";

describe("SD diagrams use only literal public givens", () => {
  it.each(STEP_IDS.slice(0, 12))(
    "%s keeps the actual quantities for 100 plain and contextual questions",
    (step) => {
      for (let seed = 0; seed < 100; seed++) {
        const q = generateQuestion(step, seed),
          { a, b, c, d } = q.params;
        const plain = publicDiagram(toPublicQuestion(q).prompt);
        const contextual = publicDiagram(
          toPublicQuestion(withContext(q)).prompt,
        );
        expect(contextual).toEqual(plain);
        switch (step) {
          case "A1":
            expect(plain).toEqual({
              kind: "counters",
              values: [a, b],
              operation: "compare",
            });
            break;
          case "A2":
            expect(plain).toEqual({
              kind: "counters",
              values: [a, b],
              operation: "add",
            });
            break;
          case "A3":
            expect(plain).toEqual({
              kind: "place-value",
              values: [a * 10 + b],
            });
            break;
          case "A4":
          case "B4":
            expect(plain).toEqual(
              d
                ? { kind: "sharing", total: c, containers: b }
                : {
                    kind: "fractions",
                    values: [{ numerator: a, denominator: b }],
                  },
            );
            break;
          case "B1":
            expect(plain).toEqual({ kind: "place-value", values: [a, b] });
            break;
          case "B2":
          case "B3":
            expect(plain).toEqual({
              kind: "sharing",
              total: a * b,
              containers: a,
            });
            break;
          case "C1":
            expect(plain).toEqual({
              kind: "sharing",
              total: a * b,
              containers: b,
            });
            break;
          case "C2":
            expect(plain).toEqual({ kind: "multiples", steps: [a, b] });
            break;
          case "C3":
            expect(plain).toEqual({
              kind: "fractions",
              values: [
                { numerator: a, denominator: b },
                { numerator: c, denominator: d },
              ],
            });
            break;
          case "C4":
            expect(plain).toEqual({ kind: "price", quantity: a, total: a * b });
            break;
        }
        expect(JSON.stringify(plain)).not.toMatch(
          /answerKey|reasonKey|stepId|misconception|studentId/,
        );
      }
    },
  );
  it("models the SD opening's given fractions, never their summed answer", () => {
    const lesson = demoOpening(5);
    expect(
      publicDiagram([{ kind: "text", text: lesson.prompt }], lesson.tool),
    ).toEqual({
      kind: "fractions",
      values: [
        { numerator: 2, denominator: 3 },
        { numerator: 1, denominator: 4 },
      ],
    });
  });
  it("retains the sign of structured fractions and their contextual text", () => {
    for (let seed = 0; seed < 100; seed++) {
      const q = generateQuestion("D2", seed);
      expect(publicDiagram(q.prompt)).toEqual({
        kind: "fractions",
        values: [
          { numerator: q.params.a, denominator: q.params.b },
          { numerator: q.params.c, denominator: q.params.d },
        ],
      });
      expect(publicDiagram(withContext(q).prompt)).toEqual(
        publicDiagram(q.prompt),
      );
    }
  });
  it("unknown or unbounded prompts use a bounded literal fallback without guessed arithmetic", () => {
    for (const text of [
      "Kenapa?",
      "999999 : 999999 = …",
      "1/999999 + 3/4",
      "Mana lebih banyak: 999999 atau 1000000 jeruk?",
    ]) {
      const d = publicDiagram([{ kind: "text", text }]);
      expect(d.kind).toBe("quantities");
      if (d.kind === "quantities")
        expect(d.labels.length).toBeLessThanOrEqual(4);
    }
  });
});
