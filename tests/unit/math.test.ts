import { describe, expect, it } from "vitest";
import { assertProbability } from "../../src/core/math/probability";
import {
  rational,
  addRational,
  subtractRational,
  multiplyRational,
  divideRational,
  compareRational,
} from "../../src/core/math/rational";

describe("Matematika eksak — pecahan integer ternormalisasi", () => {
  it("normalisasi gcd, tanda penyebut, nol dan integer", () => {
    expect(rational(2, 4)).toEqual({ numerator: 1n, denominator: 2n });
    expect(rational(2, -4)).toEqual({ numerator: -1n, denominator: 2n });
    expect(rational(-2, -4)).toEqual(rational(1, 2));
    expect(rational(0, -100)).toEqual({ numerator: 0n, denominator: 1n });
    expect(rational(7)).toEqual({ numerator: 7n, denominator: 1n });
  });

  it("contoh PRD D2 dan katalog C3 dihitung eksak", () => {
    expect(addRational(rational(1, 2), rational(1, 3))).toEqual(rational(5, 6));
    expect(addRational(rational(2, 3), rational(1, 4))).toEqual(
      rational(11, 12),
    );
    expect(addRational(rational(1, 10), rational(2, 10))).toEqual(
      rational(3, 10),
    );
    expect(compareRational(rational(1, 2), rational(2, 4))).toBe(0);
  });

  it("kurang/kali/bagi dengan negatif dan hasil nol", () => {
    expect(subtractRational(rational(-3), rational(5))).toEqual(rational(-8));
    expect(subtractRational(rational(1, 2), rational(2, 4))).toEqual(
      rational(0),
    );
    expect(multiplyRational(rational(-2, 3), rational(-9, 4))).toEqual(
      rational(3, 2),
    );
    expect(divideRational(rational(3, 4), rational(-1, 2))).toEqual(
      rational(-3, 2),
    );
    expect(compareRational(rational(1, 5), rational(1, 3))).toBe(-1);
    expect(compareRational(rational(-1, 5), rational(-1, 3))).toBe(1);
  });

  it("BigInt mencegah overflow dan tidak menggunakan float equality", () => {
    const large = 9007199254740993n;
    expect(multiplyRational(rational(large), rational(large))).toEqual(
      rational(large * large),
    );
    expect(divideRational(rational(large * 7n, 3), rational(7, 3))).toEqual(
      rational(large),
    );
    expect(compareRational(rational(large), rational(large - 1n))).toBe(1);
  });

  it("output/input immutable; operand tidak ternormalisasi divalidasi ulang", () => {
    const value = rational(2, 3);
    expect(Reflect.set(value, "numerator", 9n)).toBe(false);
    expect(addRational({ numerator: 2n, denominator: -4n }, value)).toEqual(
      rational(1, 6),
    );
    expect(value).toEqual({ numerator: 2n, denominator: 3n });
  });

  it("menolak denominator/divisor nol, termasuk raw operand", () => {
    expect(() => rational(1, 0)).toThrow(RangeError);
    expect(() => divideRational(rational(1), rational(0))).toThrow(RangeError);
    expect(() =>
      addRational({ numerator: 1n, denominator: 0n }, rational(1)),
    ).toThrow(RangeError);
  });

  it.each([
    0.5,
    NaN,
    Infinity,
    -Infinity,
    Number.MAX_SAFE_INTEGER + 1,
    "2",
    null,
  ])("menolak integer invalid/unsafe %s", (value) => {
    expect(() => rational(value as number)).toThrow(RangeError);
    expect(() => rational(1, value as number)).toThrow(RangeError);
  });

  it("identitas aritmetika pada 324 pasangan pecahan bertanda", () => {
    let samples = 0;
    for (let a = -4; a <= 4; a++)
      for (let d = 1; d <= 4; d++)
        for (let b = -4; b <= 4; b++) {
          const left = rational(a, d);
          const right = rational(b, 3);
          expect(subtractRational(addRational(left, right), right)).toEqual(
            left,
          );
          if (b !== 0)
            expect(
              divideRational(multiplyRational(left, right), right),
            ).toEqual(left);
          samples++;
        }
    expect(samples).toBe(324);
  });
});

describe("Probability validation", () => {
  it.each([0, 0.3, 0.7999999999999999, 0.8, 1])(
    "menerima %s tanpa rounding",
    (p) => {
      expect(() => assertProbability(p)).not.toThrow();
    },
  );
  it.each([
    -Number.EPSILON,
    1 + Number.EPSILON,
    NaN,
    Infinity,
    -Infinity,
    "0.8",
    null,
  ])("menolak %s", (p) =>
    expect(() => assertProbability(p)).toThrow(RangeError),
  );
});
