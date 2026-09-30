import { readFile, mkdir, writeFile } from "node:fs/promises";
import { PDFDocument } from "pdf-lib";
import { expect, it } from "vitest";
import { createIndependentPdf } from "../../src/features/package/independent-pdf";
import { buildPackage } from "../../src/core/package/build";
import { seededGroupId } from "../../src/core/math/seed";
it.each([2, 7])(
  "independent PDF grade %i contains real printable tasks, no individual identity",
  async (grade) => {
    const pkg = buildPackage({
      id: seededGroupId(45, 0),
      classId: seededGroupId(45, 1),
      grade,
      variant: "initial",
      occupied: [],
      seed: 52,
    });
    const activity = pkg.activities.find(
      (a) => a.stepId === (grade === 2 ? "A4" : "D1"),
    )!;
    const bytes = await createIndependentPdf(
      activity,
      grade,
      await readFile("public/fonts/atkinson-card.woff"),
    );
    const parsed = await PDFDocument.load(bytes);
    expect(parsed.getPageCount()).toBeGreaterThanOrEqual(1);
    expect(parsed.getTitle()).toBe("PapanNalar - Tugas Mandiri Berdua");
    expect(bytes.length).toBeGreaterThan(5000);
    expect(Buffer.from(bytes).toString()).not.toContain(pkg.classId);
    await mkdir("artifacts/qa/M06", { recursive: true });
    await writeFile(`artifacts/qa/M06/independent-grade-${grade}.pdf`, bytes);
  },
);
