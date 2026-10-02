import { describe, expect, it } from "vitest";
import { STEP_IDS } from "../../src/content/ladder/registry";
import {
  QUESTION_TEMPLATES,
  solveTemplate,
  templateFor,
} from "../../src/content/templates/registry";
import {
  answerText,
  canonicalAnswer,
  promptText,
} from "../../src/content/templates/format";
import {
  generateQuestion,
  questionContentHash,
} from "../../src/core/package/question";
import {
  publicQuestionSchema,
  toPublicQuestion,
} from "../../src/contracts/package";
import { rational } from "../../src/core/math/rational";

describe("GEN01 — 500 seeds per active template (11,000 instances)", () => {
  it.each(STEP_IDS)(
    "%s: exact key, three distinct distractors, mapped reasons and draft provenance",
    (step) => {
      for (let seed = 0; seed < 500; seed++) {
        const q = generateQuestion(step, seed),
          p = q.params;
        const selected = q.options.find((o) => o.label === q.answerKey)!;
        expect(new Set(q.options.map((o) => o.canonicalValue)).size).toBe(4);
        expect(new Set(q.options.map((o) => o.text)).size).toBe(4);
        expect(
          q.options.filter((o) => o.classification === "correct"),
        ).toHaveLength(1);
        expect(
          q.reasons.filter((o) => o.classification === "correct"),
        ).toHaveLength(1);
        const codes = q.reasons.flatMap((o) =>
          o.misconceptionCode ? [o.misconceptionCode] : [],
        );
        expect(new Set(codes).size).toBe(codes.length);
        expect(
          q.reasons.find((o) => o.label === q.reasonKey)?.classification,
        ).toBe("correct");
        expect(q.metadata.status).toBe("draft");
        expect(q.metadata.reviewer).toBeNull();
        expect(q.metadata.reviewedAt).toBeNull();
        expect(q.hints).toHaveLength(3);
        expect(promptText(q.prompt)).not.toMatch(/NaN|undefined|Infinity/);
        // Independent arithmetic oracle, including cross multiplication for fractions.
        const numeric: Partial<Record<typeof step, number>> = {
          A1: Math.max(p.a, p.b),
          A2: p.a + p.b,
          A3: Math.floor((p.a * 10 + p.b) / 10),
          A4: p.d ? p.c / p.b : p.a / p.b,
          B1: p.a + p.b,
          B2: (p.a * p.b) / p.a,
          B3: (p.a * p.b) / p.a,
          B4: p.a / p.b,
          C1: (p.a * p.b) / p.b,
          C3: (p.a * p.d + p.c * p.b) / (p.b * p.d),
          C4: (p.a * p.b) / p.a,
          D1: p.a - p.b,
          D2: (p.a * p.d + p.c * p.b) / (p.b * p.d),
          D3: p.b * ((p.a * p.c) / p.a),
          D5: (p.a * p.c + p.b - p.b) / p.a,
          D6: p.a * p.c + p.b,
          E1: p.b + p.c,
          E4: Math.log(p.a ** p.c) / Math.log(p.a) - p.b,
        };
        if (numeric[step] !== undefined) {
          const [n, d] = selected.canonicalValue
            .slice(2)
            .split("/")
            .map(Number);
          expect(n / d).toBeCloseTo(numeric[step]!, 10);
        } else if (step === "C2") {
          const actual = Number(selected.canonicalValue.slice(2).split("/")[0]);
          expect(actual % p.a).toBe(0);
          expect(actual % p.b).toBe(0);
          for (let n = 1; n < actual; n++)
            expect(n % p.a === 0 && n % p.b === 0).toBe(false);
        } else if (step === "D4") {
          expect(selected.canonicalValue).toBe(`l:${p.a}/1;${p.a * p.b}/1`);
        } else if (step === "E2") {
          for (const option of q.options) {
            const [x, y] = option.canonicalValue
              .slice(2)
              .split(";")
              .map((v) => Number(v.split("/")[0]));
            expect(x >= 0 && y >= 0 && x + y <= p.c).toBe(
              option.label === q.answerKey,
            );
          }
        } else if (step === "E3") {
          const values = selected.canonicalValue
            .slice(2)
            .split(";")
            .map((v) => Number(v.split("/")[0]));
          expect(values).toHaveLength(2);
          for (const x of values)
            expect(x * x - (p.a + p.b) * x + p.a * p.b).toBe(0);
        }
      }
    },
  );
  it("reproducible including unsigned boundary seed; registry covers exactly 22 steps", () => {
    expect(QUESTION_TEMPLATES.map((t) => t.stepId)).toEqual(STEP_IDS);
    for (const step of STEP_IDS) {
      expect(generateQuestion(step, 0xffffffff)).toEqual(
        generateQuestion(step, 0xffffffff),
      );
      expect(questionContentHash(generateQuestion(step, 42))).toBe(
        questionContentHash(generateQuestion(step, 42)),
      );
    }
  });
  it("equivalent rationals/sets canonicalize; zeros, negative answers and two roots are exact", () => {
    expect(canonicalAnswer({ kind: "number", value: rational(2, 4) })).toBe(
      "n:1/2",
    );
    expect(
      canonicalAnswer({
        kind: "roots",
        values: [rational(3), rational(2), rational(3)],
      }),
    ).toBe("s:2/1;3/1");
    expect(answerText(solveTemplate("D1", { a: -3, b: 5, c: 0, d: 0 }))).toBe(
      "−8",
    );
    expect(answerText(solveTemplate("D5", { a: 3, b: -7, c: 6, d: 0 }))).toBe(
      "6",
    );
    expect(templateFor("D2").validate({ a: 1, b: 0, c: 1, d: 3 })).not.toEqual(
      [],
    );
    expect(() => generateQuestion("D1", -1)).toThrow();
  });
  it("public serializer emits only allowlisted keys even from an extended teacher object", () => {
    const q = generateQuestion("D1", 2);
    const local = {
      ...q,
      name: "PRIVATE_SENTINEL",
      nickname: "PRIVATE_SENTINEL",
      mastery: 0.85,
    };
    for (const kind of ["question", "reason"] as const) {
      const board = toPublicQuestion(local, kind);
      expect(Object.keys(board).sort()).toEqual([
        "id",
        "options",
        "prompt",
        "unknownLabel",
      ]);
      expect(JSON.stringify(board)).not.toMatch(
        /PRIVATE_SENTINEL|stepId|answerKey|canonicalValue|misconception|reviewer/,
      );
      expect(board.unknownLabel).toBe("?");
      expect(() =>
        publicQuestionSchema.parse({ ...board, name: "PRIVATE_SENTINEL" }),
      ).toThrow();
    }
  });
});
