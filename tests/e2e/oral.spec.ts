import { readFile, mkdir } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import {
  loginTeacher,
  injectFixture,
  waitForShellCache,
} from "../browser/helpers";
test("oral CAS/frozen baseline/reopen/undo/skip/resume use real IndexedDB", async ({
  page,
}) => {
  await loginTeacher(page);
  await page.addScriptTag({
    content: await readFile(".browser-tests/oral-fixture.js", "utf8"),
  });
  expect(await page.evaluate(() => window.__oralFixture.exercise())).toEqual({
    empty: 0,
    conflict: true,
    immutable: true,
    persisted: 2,
    afterUndo: 0,
    skipped: "skipped",
    resumed: "active",
    beforeComplete: [],
    packagePlacements: [{ kind: "step", stepId: "A2" }],
    inactivePlacements: [],
  });
});
test("oral grade 2 goes down on first wrong, skips without evidence, and resumes offline", async ({
  page,
  context,
}) => {
  const errors: string[] = [];
  page.on("pageerror", () => errors.push("pageerror"));
  page.on("console", (m) => {
    if (m.type() === "error")
      errors.push(m.text().replace(/https?:\/\/\S+/g, "[URL]"));
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await loginTeacher(page);
  await page.getByLabel("Data kelas").selectOption("demo");
  await page.getByRole("button", { name: "Buat kelas", exact: true }).click();
  await page.getByLabel("Nama rombel", { exact: true }).fill("2L");
  await page.getByLabel("Tingkat kelas", { exact: true }).fill("2");
  await page.getByRole("button", { name: "Simpan kelas", exact: true }).click();
  await page.getByRole("button", { name: /Buka kelas 2L/ }).click();
  await injectFixture(page);
  await waitForShellCache(page);
  await context.setOffline(true);
  const oral = page.getByRole("region", { name: "Cek Lisan", exact: true });
  await oral
    .getByRole("button", { name: "Mulai atau buka cek lisan", exact: true })
    .click();
  await expect(oral).toContainText("Absen 1 · A2");
  await oral.getByRole("button", { name: "Salah", exact: true }).click();
  await expect(oral).toContainText("Absen 1 · A1");
  await oral.getByRole("button", { name: "Lewati siswa", exact: true }).click();
  await expect(oral).toContainText("Dilewati. Tidak ada observasi");
  await expect(oral).toContainText("1 jawaban lisan tersimpan");
  await page.reload();
  await page.getByLabel("Data kelas").selectOption("demo");
  await expect(oral).toContainText("Dilewati. Tidak ada observasi");
  await oral
    .getByRole("button", { name: "Lanjutkan cek lisan", exact: true })
    .click();
  await oral.getByRole("button", { name: "Benar", exact: true }).click();
  await expect(oral).toContainText("Penempatan lisan: A2");
  await expect(oral).toContainText("2 jawaban lisan tersimpan");
  await oral
    .getByRole("button", { name: "Batalkan jawaban terakhir", exact: true })
    .click();
  await oral
    .getByRole("button", { name: "Diam atau belum tahu", exact: true })
    .click();
  await expect(oral).toContainText("Penempatan lisan: A1");
  await expect(oral).toContainText("2 jawaban lisan tersimpan");
  expect(errors).toEqual([]);
  await mkdir("artifacts/qa/M07", { recursive: true });
  await oral.screenshot({ path: "artifacts/qa/M07/oral-offline-mobile.png" });
});
