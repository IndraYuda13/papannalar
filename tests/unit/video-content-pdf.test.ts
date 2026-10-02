import { readFile } from "node:fs/promises";
import { PDFDocument, PDFPage } from "pdf-lib";
import { expect, it, vi } from "vitest";
import { createIndependentPdf } from "../../src/features/package/independent-pdf";
import { buildPackage } from "../../src/core/package/build";
import { generateQuestion } from "../../src/core/package/question";
import { seededGroupId } from "../../src/core/math/seed";

it.each([2, 7])(
  "V5 PDF grade %i prints all four tasks with room for work and no private keys",
  async (grade) => {
    const pkg = buildPackage({
      id: seededGroupId(501, 0),
      classId: seededGroupId(501, 1),
      grade,
      variant: "initial",
      occupied: [],
      seed: 52,
    });
    const activity = pkg.activities.find(
      (a) => a.stepId === (grade === 2 ? "A4" : "D1"),
    )!;
    const original = JSON.stringify(activity);
    const drawn = vi.spyOn(PDFPage.prototype, "drawText");
    const boxes = vi.spyOn(PDFPage.prototype, "drawRectangle");
    try {
      const bytes = await createIndependentPdf(
        activity,
        grade,
        await readFile("public/fonts/atkinson-card.woff"),
      );
      const doc = await PDFDocument.load(bytes);
      const printed = drawn.mock.calls.map(([text]) => text).join(" ");
      for (const label of [
        "Konteks.",
        "Cari Kesalahan.",
        "Latihan.",
        "Tantangan Terbuka.",
      ])
        expect(printed).toContain(label);
      expect(printed).toContain("Nala menjawab");
      expect(printed).toContain("3 wajib + 1 boleh");
      expect(printed).not.toMatch(
        /answerKey|reasonKey|studentId|mastery|D1|A4/,
      );
      const workspaces = boxes.mock.calls
        .map(([options]) => options!)
        .filter((b) => b.height === 56);
      expect(workspaces).toHaveLength(4);
      expect(workspaces.every((b) => b.y! >= 55)).toBe(true);
      expect(doc.getPageCount()).toBeGreaterThanOrEqual(1);
      expect(doc.getTitle()).toBe("PapanNalar - Tugas Mandiri Berdua");
      expect(bytes.length).toBeGreaterThan(5000);
      expect(JSON.stringify(activity)).toBe(original);
    } finally {
      drawn.mockRestore();
      boxes.mockRestore();
    }
  },
);

it("V5 PDF A4 set-fraction shows the actual number of objects instead of a one-whole bar", async () => {
  const pkg = buildPackage({
    id: seededGroupId(505, 0),
    classId: seededGroupId(505, 1),
    grade: 2,
    variant: "oral",
    occupied: [],
    seed: 1,
  });
  const setQuestion = Array.from({ length: 16 }, (_, seed) =>
    generateQuestion("A4", seed),
  ).find((q) => q.params.d)!;
  const activity = pkg.activities.find((a) => a.stepId === "A4")!;
  const circles = vi.spyOn(PDFPage.prototype, "drawCircle");
  const boxes = vi.spyOn(PDFPage.prototype, "drawRectangle");
  try {
    await createIndependentPdf(
      {
        ...activity,
        independent: [setQuestion, setQuestion, setQuestion],
        optional: setQuestion,
      },
      2,
      await readFile("public/fonts/atkinson-card.woff"),
    );
    expect(circles).toHaveBeenCalledTimes(setQuestion.params.c * 4);
    expect(
      boxes.mock.calls.filter(([options]) => options?.height === 25),
    ).toHaveLength(0);
  } finally {
    circles.mockRestore();
    boxes.mockRestore();
  }
});
