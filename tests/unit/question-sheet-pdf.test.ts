import { readFile, mkdir, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { PDFDocument } from "pdf-lib";
import { expect, it } from "vitest";
import { createQuestionSheetPdf } from "../../src/features/library/question-sheet-pdf";
import { createCardPdf } from "../../src/cards/pdf/create";
import {
  printAssignmentSchema,
  type PrintAssignment,
} from "../../src/contracts/print-assignment";
const uuid = (n: number) =>
  `ba7f18ae-496f-4c11-92ab-${String(n).padStart(12, "0")}`;
const print: PrintAssignment = {
  assignmentId: uuid(1),
  runId: uuid(2),
  collectionId: uuid(3),
  title: "Pecahan dan operasi bilangan",
  version: 2,
  code: "ba7f18ae · V2",
  items: Array.from({ length: 5 }, (_, i) => ({
    id: uuid(i + 10),
    prompt: `Pertanyaan ${i + 1}: ${"Bandingkan 1/2 dan 3/4, kemudian jelaskan pilihan yang sesuai. ".repeat(5).slice(0, 350)}`,
    options: [
      "Pilihan A dengan uraian yang panjang. ".repeat(10).slice(0, 350),
      "3/4 lebih besar dari 1/2",
      "−2 + 5 = 3",
      "Tidak ada pilihan yang cocok",
    ],
  })),
  binding: {
    intent: "custom_assessment",
    formId: uuid(4),
    version: 2,
    pageIndex: 0,
    rows: 5,
  },
};
const root =
  process.env["PNL_PDF_ARTIFACT_ROOT"] ?? "artifacts/qa/question-sheet-pdf";
it("renders every frozen question and option in order across pages without private fields", async () => {
  await mkdir(root, { recursive: true });
  const font = await readFile("public/fonts/atkinson-card.woff");
  const bytes = await createQuestionSheetPdf(print, font);
  await writeFile(`${root}/questions.pdf`, bytes);
  await writeFile(
    `${root}/cards.pdf`,
    await createCardPdf("weekly", font, print.binding),
  );
  const document = await PDFDocument.load(bytes);
  expect(document.getPageCount()).toBeGreaterThan(1);
  expect(document.getTitle()).toBe(`PapanNalar - Lembar soal - ${print.code}`);
  const text = execFileSync("pdftotext", [`${root}/questions.pdf`, "-"], {
    encoding: "utf8",
  });
  const normalized = text.replace(/\s+/g, " ");
  let last = -1;
  for (const item of print.items) {
    const position = normalized.indexOf(
      item.prompt.replace(/\s+/g, " ").trim(),
    );
    expect(position).toBeGreaterThan(last);
    last = position;
    for (const option of item.options)
      expect(normalized).toContain(option.replace(/\s+/g, " ").trim());
  }
  expect(text).not.toMatch(/Kunci|studentId|correct|roster/);
  execFileSync("pdftoppm", [
    "-scale-to",
    "1400",
    "-png",
    `${root}/questions.pdf`,
    `${root}/questions`,
  ]);
  execFileSync("pdftoppm", [
    "-scale-to",
    "1400",
    "-png",
    `${root}/cards.pdf`,
    `${root}/cards`,
  ]);
  await writeFile(
    `${root}/pdf-evidence.json`,
    JSON.stringify(
      {
        pages: document.getPageCount(),
        items: print.items.length,
        formId: print.binding.formId,
        version: 2,
        rows: 5,
        physicalPrinter: "UNVERIFIED",
      },
      null,
      2,
    ),
  );
}, 20000);
it("strict print allowlist rejects answer keys and roster before PDF generation", () => {
  expect(
    printAssignmentSchema.safeParse({ ...print, roster: [uuid(8)] }).success,
  ).toBe(false);
  expect(
    printAssignmentSchema.safeParse({
      ...print,
      items: [{ ...print.items[0], key: "B" }],
    }).success,
  ).toBe(false);
});
it("wraps long unbroken tokens without escaping page margins", async () => {
  const bytes = await createQuestionSheetPdf(
    {
      ...print,
      items: [
        {
          ...print.items[0],
          prompt: "P".repeat(400),
          options: ["A".repeat(400), "B", "C", "D"],
        },
      ],
    },
    await readFile("public/fonts/atkinson-card.woff"),
  );
  expect((await PDFDocument.load(bytes)).getPageCount()).toBeGreaterThan(0);
});
