import { describe, expect, it } from "vitest";
import {
  buildPackage,
  freezePackage,
  replacePackageQuestion,
  allPackageQuestions,
  type PackageVariant,
} from "../../src/core/package/build";
import { seededGroupId } from "../../src/core/math/seed";
import {
  parseTeacherPackage,
  toPublicPackage,
} from "../../src/contracts/package";

const input = {
  id: seededGroupId(71, 0),
  classId: seededGroupId(71, 1),
  grade: 7,
  seed: 2026,
  occupied: [
    { kind: "step" as const, stepId: "D1" as const },
    { kind: "step" as const, stepId: "D3" as const },
  ],
};
describe("PKG01 offline package", () => {
  it.each([1, 2, 3])(
    "grade %i weekly uses recorded placement without mass assessment",
    (grade) => {
      const pkg = buildPackage({
        ...input,
        grade,
        variant: "weekly",
        occupied: [{ kind: "step", stepId: "A2" }],
      });
      expect(pkg.assessment).toEqual([]);
      expect(pkg.activities.some((a) => a.stepId === "A2")).toBe(true);
      expect(parseTeacherPackage(pkg)).toEqual(pkg);
    },
  );
  it.each([1, 2, 3])(
    "initial repeated top for grade %i uses different mathematical parameters",
    { timeout: 30_000 },
    (grade) => {
      for (let seed = 0; seed < 500; seed++) {
        const pkg = buildPackage({
          ...input,
          grade,
          variant: "initial",
          occupied: [],
          seed,
        });
        expect(new Set(pkg.assessment.map((q) => q.mathFingerprint)).size).toBe(
          10,
        );
      }
    },
  );
  it.each(["initial", "weekly", "oral", "short"] as const)(
    "%s has required tasks and nonoverlapping exit parameters",
    (variant) => {
      const pkg = buildPackage({ ...input, variant });
      expect(parseTeacherPackage(pkg)).toEqual(pkg);
      expect(buildPackage({ ...input, variant })).toEqual(pkg);
      expect(pkg.assessment).toHaveLength(
        variant === "oral" ? 0 : variant === "initial" ? 10 : 5,
      );
      expect(new Set(allPackageQuestions(pkg).map((q) => q.id)).size).toBe(
        allPackageQuestions(pkg).length,
      );
      for (const a of pkg.activities) {
        expect(a.board).toHaveLength(3);
        expect(a.independent).toHaveLength(3);
        const stations = [
          ...a.board,
          ...a.independent,
          a.optional,
          a.guided,
        ].map((q) => q.mathFingerprint);
        expect(stations).not.toContain(a.exit.mathFingerprint);
        expect(stations).not.toContain(a.exitContext.mathFingerprint);
        expect(a.exitContext.mathFingerprint).not.toBe(a.exit.mathFingerprint);
      }
    },
  );
  it.each([1, 4, 5, 7, 10, 12])(
    "fresh grade %i covers A1 to target+1 and honest tool gaps",
    (grade) => {
      const pkg = buildPackage({
        ...input,
        grade,
        occupied: [],
        variant: grade <= 3 ? "oral" : "initial",
      });
      expect(pkg.activities[0].stepId).toBe("A1");
      expect(pkg.activities[0].interactiveSupport).toBe("unavailable");
      expect(
        pkg.activities.every((a) => a.board.length === (grade <= 6 ? 2 : 3)),
      ).toBe(true);
      expect(pkg.reviewNotice).toBe("NEEDS_REVIEW");
      expect(pkg.oralGeneralActivity !== null).toBe(grade <= 3);
      expect(parseTeacherPackage(pkg)).toEqual(pkg);
    },
  );
  it("500 package seeds keep station/exit separate including the small A4 domain", () => {
    for (let seed = 0; seed < 500; seed++) {
      const pkg = buildPackage({
        ...input,
        seed,
        grade: 2,
        occupied: [],
        variant: "oral",
      });
      for (const a of pkg.activities) {
        const used = [...a.board, ...a.independent, a.optional, a.guided].map(
          (q) => q.mathFingerprint,
        );
        expect(used).not.toContain(a.exit.mathFingerprint);
        expect(used).not.toContain(a.exitContext.mathFingerprint);
      }
    }
  });
  it("replaces exactly one question and freezes assessment keys", () => {
    const pkg = buildPackage({ ...input, variant: "weekly" });
    const next = replacePackageQuestion(pkg, pkg.assessment[0].id, 1234567);
    expect(next.revision).toBe(2);
    expect(next.contentHash).not.toBe(pkg.contentHash);
    expect(next.assessment[0].mathFingerprint).not.toBe(
      pkg.assessment[0].mathFingerprint,
    );
    expect(next.assessment.slice(1)).toEqual(pkg.assessment.slice(1));
    expect(next.activities).toEqual(pkg.activities);
    const a = pkg.activities[0],
      changed = replacePackageQuestion(pkg, a.exitContext.id, 7821);
    expect(changed.activities[0].exitContext.prompt).not.toEqual(
      a.exitContext.prompt,
    );
    expect(changed.activities[0].board).toEqual(a.board);
    expect(() =>
      replacePackageQuestion(freezePackage(pkg), pkg.assessment[0].id, 2),
    ).toThrow("frozen");
    expect(() => replacePackageQuestion(pkg, seededGroupId(0, 0), 2)).toThrow(
      "Unknown",
    );
  });
  it("rejects invalid inputs and local fields on persistence boundary", () => {
    expect(() =>
      buildPackage({ ...input, variant: "weekly", occupied: [] }),
    ).toThrow();
    expect(() =>
      buildPackage({ ...input, variant: "invalid" as PackageVariant }),
    ).toThrow();
    expect(() =>
      buildPackage({ ...input, variant: "initial", grade: 13 }),
    ).toThrow();
    expect(() =>
      buildPackage({ ...input, variant: "initial", seed: 2 ** 32 }),
    ).toThrow();
    const pkg = buildPackage({ ...input, variant: "weekly" });
    expect(() =>
      parseTeacherPackage({ ...pkg, nickname: "LOCAL_SENTINEL" }),
    ).toThrow();
    const board = toPublicPackage({
      ...pkg,
      nickname: "LOCAL_SENTINEL",
    } as typeof pkg);
    expect(JSON.stringify(board)).not.toMatch(
      /LOCAL_SENTINEL|stepId|answerKey|reasonKey|canonicalValue|misconception|classId/,
    );
  });
});
