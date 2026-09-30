import { describe, expect, it } from "vitest";
import { BKT_GOLDEN } from "../fixtures/bkt-golden";
import {
  observeBkt,
  type AnswerResult,
  type BktObservation,
} from "../../src/core/bkt/observations";
import {
  updateBkt,
  DEFAULT_BKT_PARAMETERS,
  INITIAL_MASTERY,
  type BktParameters,
} from "../../src/core/bkt/update";
import { isMastered } from "../../src/core/placement/computed-level";

const tolerance = 1e-9;

describe("CORE01 — golden BKT source vectors", () => {
  it.each(BKT_GOLDEN)(
    "$label → $expected",
    ({ label, observations, expected }) => {
      const actual = observations.reduce(
        (p, observation) => observeBkt(p, observation).probability,
        INITIAL_MASTERY,
      );
      const error = Math.abs(actual - expected);
      expect(error).toBeLessThanOrEqual(tolerance);
      console.info(
        "CORE01",
        JSON.stringify({ label, actual, expected, error, tolerance }),
      );
    },
  );
});

describe("BKT pure update and safe numeric boundaries", () => {
  it.each([
    [7 / 16 - 1e-12, false],
    [7 / 16, true],
    [7 / 16 + 1e-12, true],
  ] as const)(
    "hasil dekat threshold dari prior %s: mastered=%s",
    (prior, mastered) => {
      // Manual solution: one default correct update from 7/16 is exactly 4/5.
      const probability = updateBkt(prior, true);
      expect(Math.abs(probability - 0.8)).toBeLessThan(1e-11);
      expect(isMastered(probability)).toBe(mastered);
      if (prior === 7 / 16) expect(probability).toBe(0.8);
    },
  );

  it("dua benar/salah berurutan sesuai hitungan pecahan manual, tanpa pembulatan", () => {
    expect(updateBkt(updateBkt(0.3, true), true)).toBeCloseTo(239 / 260, 14);
    expect(updateBkt(updateBkt(0.3, false), false)).toBeCloseTo(
      1223 / 10295,
      14,
    );
  });

  it.each([true, false])(
    "p=0 dan p=1 yang feasible tetap valid (correct=%s)",
    (correct) => {
      expect(updateBkt(0, correct)).toBe(0.1);
      expect(updateBkt(1, correct)).toBe(1);
    },
  );

  it("transition 0 mempertahankan posterior; transition 1 menjadi 1", () => {
    expect(updateBkt(0.3, true, { T: 0, G: 0.2, S: 0.1 })).toBeCloseTo(
      27 / 41,
      14,
    );
    expect(updateBkt(0.3, false, { T: 1, G: 0.2, S: 0.1 })).toBe(1);
  });

  it("oracle integer eksak untuk 2.592 kombinasi prior/T/G/S/hasil", () => {
    const tenths = [0, 1, 3, 5, 8, 10];
    let samples = 0;
    for (const p of tenths)
      for (const t of tenths)
        for (const g of tenths)
          for (const s of tenths)
            for (const correct of [false, true]) {
              const parameters = { T: t / 10, G: g / 10, S: s / 10 };
              // Integer Bayes weights: no production math helper or rounded posterior.
              const known = BigInt(p * (correct ? 10 - s : s));
              const unknown = BigInt((10 - p) * (correct ? g : 10 - g));
              const denominator = known + unknown;
              if (denominator === 0n) {
                expect(() => updateBkt(p / 10, correct, parameters)).toThrow(
                  RangeError,
                );
              } else {
                const exact =
                  Number(known * 10n + unknown * BigInt(t)) /
                  Number(denominator * 10n);
                const actual = updateBkt(p / 10, correct, parameters);
                expect(Math.abs(actual - exact)).toBeLessThanOrEqual(1e-12);
                expect(actual).toBeGreaterThanOrEqual(0);
                expect(actual).toBeLessThanOrEqual(1);
              }
              samples++;
            }
    expect(samples).toBe(2592);
  });

  it("input/config tidak berubah dan output deterministik", () => {
    const config = Object.freeze({ T: 0.1, G: 0.2, S: 0.1 });
    const results = Array.from({ length: 50 }, () =>
      updateBkt(0.3, true, config),
    );
    expect(new Set(results).size).toBe(1);
    expect(config).toEqual(DEFAULT_BKT_PARAMETERS);
    expect(Reflect.set(DEFAULT_BKT_PARAMETERS, "G", 0)).toBe(false);
  });

  it.each([-0.001, 1.001, NaN, Infinity, -Infinity, "0.3", null, undefined])(
    "menolak prior invalid %s",
    (value) => {
      expect(() => updateBkt(value as number, true)).toThrow(RangeError);
    },
  );

  it.each(["T", "G", "S"] as const)(
    "memvalidasi parameter %s, tanpa NaN/coercion",
    (key) => {
      for (const invalid of [
        -1,
        1.1,
        NaN,
        Infinity,
        -Infinity,
        "0.1",
        undefined,
      ]) {
        const parameters = {
          ...DEFAULT_BKT_PARAMETERS,
          [key]: invalid,
        } as BktParameters;
        expect(() => updateBkt(0.3, true, parameters)).toThrow(RangeError);
        expect(() => updateBkt(0.3, false, parameters)).toThrow(RangeError);
      }
    },
  );

  it("menolak outcome invalid, termasuk missing yang belum menjadi observasi", () => {
    for (const invalid of ["correct", "missing", "?", 1, undefined, null])
      expect(() => updateBkt(0.3, invalid as unknown as boolean)).toThrow(
        TypeError,
      );
  });

  it("denominator nol tidak ditutupi oleh T=1 atau fallback 0", () => {
    expect(() => updateBkt(0, true, { T: 1, G: 0, S: 0.1 })).toThrow(
      RangeError,
    );
    expect(() => updateBkt(1, false, { T: 1, G: 0.2, S: 0 })).toThrow(
      RangeError,
    );
  });
});

describe("Observation modes — one pair, one update", () => {
  it("? salah dengan G=0 lokal, observasi berikutnya kembali G=0.2", () => {
    const unknown = observeBkt(0.3, { kind: "regular", answer: "?" });
    expect(unknown).toMatchObject({
      status: "updated",
      correct: false,
      parameters: { G: 0, S: 0.1 },
    });
    const next = observeBkt(unknown.probability, {
      kind: "regular",
      answer: "correct",
    });
    expect(next).toMatchObject({ status: "updated", parameters: { G: 0.2 } });
    expect(next.probability).toBeCloseTo(0.475, 14);
    expect(DEFAULT_BKT_PARAMETERS.G).toBe(0.2);
  });

  it("lisan tunggal menggunakan G=0.05/S=0.1; ? tetap G=0", () => {
    const incorrect = observeBkt(0.3, { kind: "oral", answer: "incorrect" });
    expect(incorrect).toMatchObject({
      status: "updated",
      parameters: { T: 0.1, G: 0.05, S: 0.1 },
    });
    expect(incorrect.probability).toBeCloseTo(193 / 1390, 14);
    expect(
      observeBkt(0.3, { kind: "oral", answer: "?" }).probability,
    ).toBeCloseTo(10 / 73, 14);
  });

  const results: readonly AnswerResult[] = [
    "correct",
    "incorrect",
    "?",
    "missing",
  ];
  it.each(
    results.flatMap((answer) => results.map((reason) => ({ answer, reason }))),
  )(
    "pasangan $answer + $reason menjadi tepat satu observasi/pending",
    ({ answer, reason }) => {
      const input = Object.freeze({
        kind: "exit-pair" as const,
        answer,
        reason,
      });
      const result = observeBkt(0.3, input);
      if (answer === "missing" || reason === "missing") {
        expect(result).toEqual({ status: "pending", probability: 0.3 });
      } else {
        const correct = answer === "correct" && reason === "correct";
        const unknown = answer === "?" || reason === "?";
        expect(result).toMatchObject({
          status: "updated",
          correct,
          parameters: { T: 0.1, G: unknown ? 0 : 0.1, S: 0.2 },
        });
        // Manual ratios for one update (not two updates for answer and reason).
        expect(result.probability).toBeCloseTo(
          unknown ? 13 / 76 : correct ? 247 / 310 : 41 / 230,
          14,
        );
      }
      expect(input).toEqual({ kind: "exit-pair", answer, reason });
    },
  );

  it.each(["regular", "oral"] as const)(
    "%s missing tidak menambah bukti/belajar",
    (kind) => {
      expect(observeBkt(0.3, { kind, answer: "missing" })).toEqual({
        status: "pending",
        probability: 0.3,
      });
    },
  );

  it("transition kustom tervalidasi, tidak mengubah mode/default", () => {
    const result = observeBkt(0.3, { kind: "regular", answer: "correct" }, 0);
    expect(result.probability).toBeCloseTo(27 / 41, 14);
    expect(DEFAULT_BKT_PARAMETERS.T).toBe(0.1);
    expect(() =>
      observeBkt(0.3, { kind: "regular", answer: "missing" }, NaN),
    ).toThrow(RangeError);
    expect(() =>
      observeBkt(NaN, { kind: "regular", answer: "missing" }),
    ).toThrow(RangeError);
  });

  it.each([
    { kind: "invented", answer: "correct" },
    { kind: "regular", answer: "empty" },
    { kind: "exit-pair", answer: "correct" },
    { kind: "exit-pair", answer: "missing", reason: "invented" },
  ])("menolak input mode/answer invalid %#", (observation) => {
    expect(() => observeBkt(0.3, observation as BktObservation)).toThrow(
      RangeError,
    );
  });
});
