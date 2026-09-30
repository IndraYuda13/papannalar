import { readFile } from "node:fs/promises";
import { PDFDocument } from "pdf-lib";
import { expect, test } from "@playwright/test";
import { loginTeacher } from "../browser/helpers";

test("teacher downloads all three real A4 PDFs locally without runtime errors", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await loginTeacher(page);
  await page.setViewportSize({ width: 390, height: 844 });
  const panel = page.getByRole("region", { name: "Cetak Kartu Nalar" });
  for (const kind of ["initial", "weekly", "exit"]) {
    await panel.getByLabel("Jenis kartu").selectOption(kind);
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      panel.getByRole("button", { name: "Unduh PDF A4" }).click(),
    ]);
    expect(download.suggestedFilename()).toBe(`papannalar-${kind}-A4.pdf`);
    const file = await download.path();
    expect(file).not.toBeNull();
    const pdf = await PDFDocument.load(await readFile(file!));
    expect(pdf.getPageCount()).toBe(1);
    expect(pdf.getPage(0).getWidth()).toBeCloseTo(595.27559, 4);
    await expect(panel.getByRole("status")).toContainText("PDF siap");
  }
  await panel.screenshot({
    path: "artifacts/qa/M03/m03a/teacher-print-panel.png",
  });
  expect(errors).toEqual([]);
});
