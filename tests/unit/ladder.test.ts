import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  STEP_IDS,
  STEP_REGISTRY,
  compareSteps,
  getStep,
  isStepId,
  nextStep,
  parseStepId,
  previousStep,
  stepAtClampedIndex,
  stepsBetween,
  type StepId,
} from "../../src/content/ladder/registry";
import {
  CLASS_TARGETS,
  getClassTarget,
  parseGrade,
} from "../../src/content/ladder/targets";

describe("Registry canonical 22 Tangga Nalar", () => {
  it("memiliki tepat 22 ID unik berurutan, tanpa level Lanjut/Fase F", () => {
    expect(STEP_IDS).toEqual(
      "A1 A2 A3 A4 B1 B2 B3 B4 C1 C2 C3 C4 D1 D2 D3 D4 D5 D6 E1 E2 E3 E4".split(
        " ",
      ),
    );
    expect(new Set(STEP_IDS).size).toBe(22);
  });

  it("label/fase/relasi kelas persis tabel PRD, bukan metadata pedagogi baru", () => {
    const prd = readFileSync("docs/01_PRD.md", "utf8");
    const rows = [
      ...prd.matchAll(
        /^\| ([A-E][1-6]) \| ([A-E]) \((\d+)(?: sampai (\d+))?\) \| ([^|]+) \|/gm,
      ),
    ];
    expect(rows).toHaveLength(22);
    rows.forEach((row, index) => {
      const first = Number(row[3]);
      const last = Number(row[4] ?? row[3]);
      expect(STEP_REGISTRY[index]).toEqual({
        id: row[1],
        phase: row[2],
        index,
        label: row[5].trim(),
        grades: Array.from(
          { length: last - first + 1 },
          (_, offset) => first + offset,
        ),
      });
    });
  });

  it("previous/next melintasi fase dan berhenti pada batas", () => {
    expect(previousStep("A1")).toBeUndefined();
    expect(nextStep("E4")).toBeUndefined();
    expect(previousStep("D1")).toBe("C4");
    expect(nextStep("D6")).toBe("E1");
    STEP_IDS.forEach((id, index) => {
      expect(getStep(id).index).toBe(index);
      expect(previousStep(id)).toBe(STEP_IDS[index - 1]);
      expect(nextStep(id)).toBe(STEP_IDS[index + 1]);
    });
  });

  it("compare dan range memakai index canonical; kedua batas inclusive", () => {
    expect(compareSteps("C4", "D1")).toBe(-1);
    expect(compareSteps("E1", "D6")).toBe(1);
    expect(compareSteps("D1", "D1")).toBe(0);
    expect(stepsBetween("C3", "D3")).toEqual(["C3", "C4", "D1", "D2", "D3"]);
    expect(stepsBetween("A1", "E4")).toEqual(STEP_IDS);
    expect(stepsBetween("E4", "E4")).toEqual(["E4"]);
    expect(() => stepsBetween("D1", "C4")).toThrow(RangeError);
  });

  it("clamp index integer tidak menciptakan A0/E5", () => {
    expect(stepAtClampedIndex(-100)).toBe("A1");
    expect(stepAtClampedIndex(0)).toBe("A1");
    expect(stepAtClampedIndex(12)).toBe("D1");
    expect(stepAtClampedIndex(21)).toBe("E4");
    expect(stepAtClampedIndex(100)).toBe("E4");
  });

  it.each([NaN, Infinity, -Infinity, 0.5, Number.MAX_SAFE_INTEGER + 1])(
    "clamp menolak index invalid %s",
    (index) => {
      expect(() => stepAtClampedIndex(index)).toThrow(RangeError);
    },
  );

  it.each([
    "A0",
    "A5",
    "D7",
    "E5",
    "F1",
    "Lanjut",
    "LANJUT",
    "a1",
    " A1",
    1,
    null,
    undefined,
  ])("parser menolak StepId invalid %s", (value) => {
    expect(isStepId(value)).toBe(false);
    expect(() => parseStepId(value)).toThrow(RangeError);
  });

  it("parser menerima semua ID; helper juga memvalidasi runtime callers", () => {
    for (const id of STEP_IDS) expect(parseStepId(id)).toBe(id);
    expect(() => getStep("A5" as StepId)).toThrow(RangeError);
    expect(() => compareSteps("A1", "F1" as StepId)).toThrow(RangeError);
    expect(() => previousStep("A0" as StepId)).toThrow(RangeError);
    expect(() => nextStep("E5" as StepId)).toThrow(RangeError);
  });

  it("registry dan metadata tidak dapat dimutasi oleh consumer", () => {
    expect(Reflect.set(STEP_IDS, 0, "E4")).toBe(false);
    expect(Reflect.set(STEP_REGISTRY[0], "label", "changed")).toBe(false);
    expect(Reflect.set(getStep("E4").grades, 0, 12)).toBe(false);
    expect(getStep("A1").id).toBe("A1");
  });
});

describe("Target kelas canonical", () => {
  it.each([
    [1, "A2"],
    [2, "A4"],
    [3, "B2"],
    [4, "B4"],
    [5, "C2"],
    [6, "C4"],
    [7, "D5"],
    [8, "D6"],
    [9, "D6"],
    [10, "E4"],
    [11, "E4"],
    [12, "E4"],
  ] as const)("kelas %s → %s", (grade, target) => {
    expect(getClassTarget(grade)).toEqual({
      grade,
      stepId: target,
      prerequisiteOnly: grade >= 11,
    });
    expect(parseGrade(grade)).toBe(grade);
  });

  it("override tervalidasi tidak menulis ulang default atau snapshot sebelumnya", () => {
    const before = getClassTarget(7);
    expect(getClassTarget(7, "C4").stepId).toBe("C4");
    expect(before.stepId).toBe("D5");
    expect(CLASS_TARGETS[7]).toBe("D5");
    expect(() => getClassTarget(7, "F1" as StepId)).toThrow(RangeError);
    expect(Reflect.set(CLASS_TARGETS, 7, "A1")).toBe(false);
  });

  it.each([0, -1, 13, 1.5, NaN, Infinity, -Infinity, "7", null, undefined])(
    "menolak grade invalid %s tanpa coercion",
    (grade) => {
      expect(() => parseGrade(grade)).toThrow(RangeError);
      expect(() => getClassTarget(grade as number, "A2")).toThrow(RangeError);
    },
  );
});
