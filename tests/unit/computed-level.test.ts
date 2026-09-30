import { describe, expect, it } from "vitest";
import { STEP_IDS, type StepId } from "../../src/content/ladder/registry";
import {
  computeLevel,
  createMastery,
  isMastered,
  type Mastery,
} from "../../src/core/placement/computed-level";

describe("Mastery dan computed level (bukan displayed/hysteresis)", () => {
  it.each([
    [0, false],
    [0.799, false],
    [0.799999999, false],
    [0.7999999999999999, false],
    [0.8, true],
    [0.8000000000000002, true],
    [1, true],
  ] as const)(
    "p=%s mastered=%s; tidak melonggarkan threshold dengan epsilon",
    (p, expected) => {
      expect(isMastered(p)).toBe(expected);
    },
  );

  it("inisialisasi tepat 22 probabilitas 0.3 tanpa level/displayed tambahan", () => {
    const state = createMastery();
    expect(Object.keys(state)).toEqual(STEP_IDS);
    expect(Object.values(state)).toEqual(Array(22).fill(0.3));
    expect(computeLevel(state, "D5")).toEqual({ kind: "step", stepId: "A1" });
    expect(Reflect.set(state, "A1", 1)).toBe(false);
  });

  it("memilih langkah belum dikuasai terendah, bukan langkah terakhir/insertion order", () => {
    const entries = STEP_IDS.toReversed().map((id) => [
      id,
      id === "B4" || id === "D1" ? 0.3 : 0.85,
    ]);
    const state = Object.freeze(Object.fromEntries(entries)) as Mastery;
    expect(computeLevel(state, "D5")).toEqual({ kind: "step", stepId: "B4" });
    expect(computeLevel(state, "B3")).toEqual({ kind: "lanjut" });
    expect(state.B4).toBe(0.3);
  });

  it("langkah tepat di target tetap dinilai; langkah di atas target tidak memblokir Lanjut", () => {
    const state = { ...createMastery(0.8), D5: 0.7999999999999999, E4: 0.3 };
    expect(computeLevel(state, "D5")).toEqual({ kind: "step", stepId: "D5" });
    expect(computeLevel(state, "D4")).toEqual({ kind: "lanjut" });
    expect(computeLevel({ ...state, D5: 0.8 }, "D5")).toEqual({
      kind: "lanjut",
    });
  });

  it.each(STEP_IDS)(
    "semua langkah sampai %s dikuasai → Lanjut, bukan alias target/E4",
    (target) => {
      const level = computeLevel(createMastery(0.8), target);
      expect(level).toEqual({ kind: "lanjut" });
      expect(level).not.toHaveProperty("stepId");
    },
  );

  it.each([-0.1, 1.1, NaN, Infinity, -Infinity])(
    "probability invalid %s gagal eksplisit",
    (value) => {
      expect(() => isMastered(value)).toThrow(RangeError);
      expect(() => createMastery(value)).toThrow(RangeError);
      // Validate the whole state even if an earlier unmastered step exists.
      expect(() =>
        computeLevel({ ...createMastery(), E4: value }, "A2"),
      ).toThrow(RangeError);
    },
  );

  it("state parsial/step target invalid tidak diam-diam diberi default", () => {
    expect(() => computeLevel({ A1: 0.3 } as Mastery, "A2")).toThrow(
      RangeError,
    );
    expect(() => computeLevel(createMastery(), "F1" as StepId)).toThrow(
      RangeError,
    );
  });
});
