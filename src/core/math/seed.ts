import { integer } from "../validation";

// Mulberry32: reproducible simulation/label randomness, never a credential source.
export function seededRandom(seed: number): () => number {
  integer(seed);
  if (seed > 0xffffffff) throw new RangeError("Invalid seed");
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value ^= value + Math.imul(value ^ (value >>> 7), 61 | value);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function seededShuffle<T>(input: readonly T[], seed: number): T[] {
  const result = [...input];
  const random = seededRandom(seed);
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function seededGroupId(seed: number, ordinal: number): string {
  integer(ordinal);
  const random = seededRandom(
    (seed ^ Math.imul(ordinal + 1, 0x9e3779b9)) >>> 0,
  );
  const bytes = Array.from({ length: 16 }, () => Math.floor(random() * 256));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
