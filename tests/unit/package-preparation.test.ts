import { it, expect } from "vitest";
import {
  buildPackage,
  freezePackage,
  changePackageOpening,
  replacePackageQuestion,
} from "../../src/core/package/build";
import { preparationFingerprint } from "../../src/local/package-preparation";
import { parseTeacherPackage } from "../../src/contracts/package";
it("local preparation follows actual contents; revision/freeze cannot fake review, while edits invalidate the reminder", () => {
  const pkg = buildPackage({
    id: "52000000-0000-4000-8000-000000000001",
    classId: "52000000-0000-4000-8000-000000000002",
    grade: 7,
    variant: "initial",
    seed: 31,
    occupied: [],
  });
  expect(preparationFingerprint(freezePackage(pkg))).toBe(
    preparationFingerprint(pkg),
  );
  expect(preparationFingerprint(parseTeacherPackage(pkg))).toBe(
    preparationFingerprint(pkg),
  );
  expect(preparationFingerprint({ ...pkg, revision: 99 })).toBe(
    preparationFingerprint(pkg),
  );
  expect(preparationFingerprint(changePackageOpening(pkg, "D1"))).not.toBe(
    preparationFingerprint(pkg),
  );
  expect(
    preparationFingerprint(
      replacePackageQuestion(pkg, pkg.assessment[0].id, 87),
    ),
  ).not.toBe(preparationFingerprint(pkg));
  expect(pkg.status).toBe("draft");
  expect(pkg.reviewNotice).toBe("NEEDS_REVIEW");
});
