import { describe, expect, it } from "vitest";
import { getClassTarget } from "../../src/content/ladder/targets";
import {
  getStep,
  STEP_IDS,
  type StepId,
} from "../../src/content/ladder/registry";
import { initialWindow, weeklyWindow } from "../../src/core/placement/windows";
import {
  initialPlacement,
  type InitialResponse,
} from "../../src/core/placement/initial";
import { lanjut, level } from "../fixtures/placement";

const correct: readonly InitialResponse[] = Array.from(
  { length: 10 },
  (_, i) => ({ rowIndex: i + 1, answer: "correct" }),
);

describe("CORE02 — initial window", () => {
  it.each(Array.from({ length: 12 }, (_, i) => i + 1))(
    "grade %s: 10 slots ending at canonical target",
    (grade) => {
      const target = getClassTarget(grade).stepId;
      const slots = initialWindow(target);
      expect(slots).toHaveLength(10);
      expect(slots.map((slot) => slot.rowIndex)).toEqual([
        1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
      ]);
      expect(slots.at(-1)?.stepId).toBe(target);
      expect(new Set(slots.map((slot) => slot.stepId)).size).toBe(
        Math.min(getStep(target).index + 1, 10),
      );
      expect(Object.isFrozen(slots)).toBe(true);
    },
  );
  it("kelas 7 mencakup B4..D5, kelas 10 D1..E4", () => {
    expect(initialWindow("D5").map((slot) => slot.stepId)).toEqual([
      "B4",
      "C1",
      "C2",
      "C3",
      "C4",
      "D1",
      "D2",
      "D3",
      "D4",
      "D5",
    ]);
    expect(initialWindow("E4").map((slot) => slot.stepId)).toEqual([
      "D1",
      "D2",
      "D3",
      "D4",
      "D5",
      "D6",
      "E1",
      "E2",
      "E3",
      "E4",
    ]);
  });
  it("tangga pendek mengulang top step dengan slot berbeda", () => {
    expect(initialWindow("A1").map((slot) => slot.stepId)).toEqual(
      Array(10).fill("A1"),
    );
    expect(initialWindow("A2").map((slot) => slot.stepId)).toEqual([
      "A1",
      ...Array(9).fill("A2"),
    ]);
    expect(initialWindow("B4").map((slot) => slot.stepId)).toEqual([
      "A1",
      "A2",
      "A3",
      "A4",
      "B1",
      "B2",
      "B3",
      "B4",
      "B4",
      "B4",
    ]);
  });
  it("StepId invalid ditolak", () =>
    expect(() => initialWindow("E5" as StepId)).toThrow());
});

describe("CORE02 — initial placement direct anchor", () => {
  it.each(["incorrect", "?"] as const)(
    "first wrong %s: .85 below window, below-range, no BKT",
    (answer) => {
      const result = initialPlacement(
        "D5",
        correct.map((row, i) => (i === 0 ? { ...row, answer } : row)),
      );
      expect(result.status).toBe("placed");
      if (result.status !== "placed") throw new Error("Expected placement");
      expect(result.computed).toEqual(level("B4"));
      expect(result.belowRange).toEqual({
        kind: "below-range",
        lowestTestedStep: "B4",
      });
      for (const step of ["A1", "A2", "A3", "A4", "B1", "B2", "B3"] as const)
        expect(result.mastery[step]).toBe(0.85);
      for (const step of STEP_IDS.slice(7))
        expect(result.mastery[step]).toBe(0.3);
    },
  );
  it("lowest wrong menang walaupun urutan respons diacak atau ada salah di atasnya", () => {
    const responses = correct
      .map((row) => ({
        ...row,
        answer:
          row.rowIndex === 6 || row.rowIndex === 9
            ? ("incorrect" as const)
            : ("correct" as const),
      }))
      .toReversed();
    const result = initialPlacement("D5", responses);
    expect(result).toMatchObject({
      status: "placed",
      computed: level("D1"),
      belowRange: { kind: "none" },
    });
    if (result.status !== "placed") throw new Error("Expected placement");
    expect(result.mastery.C4).toBe(0.85);
    expect(result.mastery.D1).toBe(0.3);
    expect(result.mastery.E4).toBe(0.3);
  });
  it.each(["A1", "A2", "D5", "E4"] as const)(
    "K03 all-correct %s: .85 through target, Lanjut",
    (target) => {
      const result = initialPlacement(target, correct);
      expect(result).toMatchObject({
        status: "placed",
        computed: lanjut,
        belowRange: { kind: "none" },
      });
      if (result.status !== "placed") throw new Error("Expected placement");
      STEP_IDS.forEach((step, i) =>
        expect(result.mastery[step]).toBe(
          i <= getStep(target).index ? 0.85 : 0.3,
        ),
      );
    },
  );
  it("satu salah di pengulangan top step tidak dibatalkan jawaban benar lainnya", () => {
    const result = initialPlacement(
      "A2",
      correct.map((row) =>
        row.rowIndex === 8 ? { ...row, answer: "incorrect" } : row,
      ),
    );
    expect(result).toMatchObject({
      status: "placed",
      computed: level("A2"),
      belowRange: { kind: "none" },
      mastery: { A1: 0.85, A2: 0.3 },
    });
    expect(
      initialPlacement(
        "A1",
        correct.map((row) =>
          row.rowIndex === 10 ? { ...row, answer: "?" } : row,
        ),
      ),
    ).toMatchObject({
      belowRange: { kind: "below-range", lowestTestedStep: "A1" },
    });
  });
  it("missing/absent tetap pending tanpa mengarang mastery atau below-range", () => {
    expect(initialPlacement("D5", [])).toEqual({
      status: "pending",
      missingRows: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    });
    expect(initialPlacement("D5", correct.slice(1))).toEqual({
      status: "pending",
      missingRows: [1],
    });
    expect(
      initialPlacement(
        "D5",
        correct.map((row) =>
          row.rowIndex === 1
            ? { ...row, answer: "?" }
            : row.rowIndex === 2
              ? { ...row, answer: "missing" }
              : row,
        ),
      ),
    ).toEqual({ status: "pending", missingRows: [2] });
  });
  it.each([
    { rows: [{ rowIndex: 0, answer: "correct" }] },
    { rows: [{ rowIndex: 11, answer: "correct" }] },
    { rows: [{ rowIndex: 1.5, answer: "correct" }] },
    {
      rows: [
        { rowIndex: 1, answer: "correct" },
        { rowIndex: 1, answer: "incorrect" },
      ],
    },
    { rows: [{ rowIndex: 1, answer: "invented" }] },
    {
      rows: [
        { rowIndex: 1, answer: "correct", displayName: "LOCAL_ONLY_CANARY" },
      ],
    },
  ])("invalid response rows fail explicitly %#", ({ rows }) =>
    expect(() =>
      initialPlacement("D5", rows as readonly InitialResponse[]),
    ).toThrow(),
  );
});

describe("Weekly window, K14 provisional edges", () => {
  it("lowest occupied D1 → C3,C4,D1,D2,D3", () => {
    expect(weeklyWindow("D5", [level("D3"), level("D1"), lanjut])).toEqual([
      "C3",
      "C4",
      "D1",
      "D2",
      "D3",
    ]);
  });
  it.each(["A1", "A2", "A3"] as const)(
    "lower boundary %s clamps to A1",
    (step) => {
      expect(weeklyWindow("A2", [level(step)])).toEqual([
        "A1",
        "A2",
        "A3",
        "A4",
        "B1",
      ]);
    },
  );
  it.each(["E2", "E3", "E4"] as const)(
    "upper boundary %s keeps five steps",
    (step) => {
      expect(weeklyWindow("E4", [level(step)])).toEqual([
        "D6",
        "E1",
        "E2",
        "E3",
        "E4",
      ]);
    },
  );
  it.each(STEP_IDS)("valid/deterministic window for occupied %s", (step) => {
    const result = weeklyWindow("E4", [level(step)]);
    expect(result).toHaveLength(5);
    expect(weeklyWindow("E4", [level(step), level(step)])).toEqual(result);
    expect(result.map((id) => getStep(id).index)).toEqual(
      Array.from({ length: 5 }, (_, i) => getStep(result[0]).index + i),
    );
  });
  it("semua Lanjut memakai target; kelas kosong tidak mengarang occupied level", () => {
    expect(weeklyWindow("D5", [lanjut, lanjut])).toEqual([
      "D3",
      "D4",
      "D5",
      "D6",
      "E1",
    ]);
    expect(weeklyWindow("E4", [lanjut])).toEqual([
      "D6",
      "E1",
      "E2",
      "E3",
      "E4",
    ]);
    expect(() => weeklyWindow("D5", [])).toThrow();
    expect(() =>
      weeklyWindow("D5", [{ kind: "step", stepId: "E5" as StepId }]),
    ).toThrow();
  });
});
