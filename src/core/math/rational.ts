// Exact arithmetic for mathematical answers, not BKT probabilities or a DTO.
// BigInt stays inside the core; a future transport boundary needs explicit mapping.
export type Rational = Readonly<{ numerator: bigint; denominator: bigint }>;

function integer(value: number | bigint): bigint {
  if (typeof value === "bigint") return value;
  if (!Number.isSafeInteger(value))
    throw new RangeError("Invalid exact integer");
  return BigInt(value);
}

function gcd(a: bigint, b: bigint): bigint {
  while (b !== 0n) [a, b] = [b, a % b];
  return a;
}

export function rational(
  numerator: number | bigint,
  denominator: number | bigint = 1n,
): Rational {
  let n = integer(numerator);
  let d = integer(denominator);
  if (d === 0n) throw new RangeError("Zero denominator");
  if (d < 0n) {
    n = -n;
    d = -d;
  }
  const divisor = gcd(n < 0n ? -n : n, d);
  return Object.freeze({ numerator: n / divisor, denominator: d / divisor });
}

function operands(left: Rational, right: Rational) {
  return [
    rational(left.numerator, left.denominator),
    rational(right.numerator, right.denominator),
  ] as const;
}

export function addRational(left: Rational, right: Rational): Rational {
  const [a, b] = operands(left, right);
  return rational(
    a.numerator * b.denominator + b.numerator * a.denominator,
    a.denominator * b.denominator,
  );
}

export function subtractRational(left: Rational, right: Rational): Rational {
  const [a, b] = operands(left, right);
  return rational(
    a.numerator * b.denominator - b.numerator * a.denominator,
    a.denominator * b.denominator,
  );
}

export function multiplyRational(left: Rational, right: Rational): Rational {
  const [a, b] = operands(left, right);
  return rational(a.numerator * b.numerator, a.denominator * b.denominator);
}

export function divideRational(left: Rational, right: Rational): Rational {
  const [a, b] = operands(left, right);
  return rational(a.numerator * b.denominator, a.denominator * b.numerator);
}

export function compareRational(left: Rational, right: Rational): -1 | 0 | 1 {
  const [a, b] = operands(left, right);
  const difference = a.numerator * b.denominator - b.numerator * a.denominator;
  return difference < 0n ? -1 : difference > 0n ? 1 : 0;
}
