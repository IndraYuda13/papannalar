import { readFile, mkdir, writeFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import {
  loginTeacher,
  injectFixture,
  waitForShellCache,
} from "../browser/helpers";

test("package cache survives reopen with CAS, freeze and tenant isolation", async ({
  page,
}) => {
  await loginTeacher(page);
  await page.addScriptTag({
    content: await readFile(".browser-tests/package-fixture.js", "utf8"),
  });
  expect(await page.evaluate(() => window.__packageFixture.exercise())).toEqual(
    {
      empty: 0,
      conflict: true,
      immutable: true,
      persisted: true,
      otherCount: 0,
      publicKeys: ["activities", "assessment", "id", "opening", "revision"],
    },
  );
});
test("teacher prepares and replaces offline package, reloads its cache and sees tool gaps", async ({
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
  await page.getByLabel("Nama rombel", { exact: true }).fill("7P");
  await page.getByRole("button", { name: "Simpan kelas", exact: true }).click();
  await page.getByRole("button", { name: /Buka kelas 7P/ }).click();
  await injectFixture(page);
  await waitForShellCache(page);
  await context.setOffline(true);
  const start = Date.now();
  await page
    .getByRole("button", { name: "Siapkan Paket Sesi", exact: true })
    .click();
  await expect(page.getByText(/Paket tersimpan lokal/)).toBeVisible();
  const packageMs = Date.now() - start;
  await page.getByText("Pratinjau soal cek (10)", { exact: true }).click();
  const question = page
    .getByRole("region", { name: "Paket Sesi", exact: true })
    .locator("ol > li")
    .first();
  const original = await question.locator("p").first().innerText();
  await question
    .getByRole("button", { name: "Ganti soal 1", exact: true })
    .click();
  await expect(question.locator("p").first()).not.toHaveText(original);
  await page.getByLabel("Materi paket").selectOption("A1");
  await expect(
    page.getByText(/Alat interaktif untuk materi ini belum tersedia/),
  ).toBeVisible();
  await page.reload();
  await page.getByLabel("Data kelas").selectOption("demo");
  await expect(page.getByText(/NEEDS_REVIEW.*Versi 2/)).toBeVisible();
  expect(errors).toEqual([]);
  await mkdir("artifacts/qa/M06", { recursive: true });
  await page.screenshot({
    path: "artifacts/qa/M06/package-offline-mobile.png",
    fullPage: true,
  });
  await writeFile(
    "artifacts/qa/M06/package-browser.json",
    JSON.stringify(
      {
        sampleCount: 1,
        packageMs,
        runtimeErrors: 0,
        offlineReload: "PASS",
        environment: "Chromium desktop, simulated offline",
      },
      null,
      2,
    ),
  );
});

test("C01 CSV stays local, invalid batch changes nothing, and empty name deletes identity", async ({
  page,
}) => {
  const requests: string[] = [];
  page.on("request", (request) =>
    requests.push(request.url() + (request.postData() ?? "")),
  );
  await loginTeacher(page);
  await page.getByLabel("Data kelas").selectOption("demo");
  await page.getByRole("button", { name: "Buat kelas", exact: true }).click();
  await page.getByLabel("Nama rombel", { exact: true }).fill("7CSV");
  await page.getByRole("button", { name: "Simpan kelas", exact: true }).click();
  await page.getByRole("button", { name: /Buka kelas 7CSV/ }).click();
  await page
    .getByText("Nama opsional · hanya perangkat ini", { exact: true })
    .click();
  const upload = page.getByLabel("Impor CSV lokal (absen,nama)");
  await upload.setInputFiles({
    name: "local.csv",
    mimeType: "text/csv",
    buffer: Buffer.from("absen,nama\n1,PRIVATE_CSV_SENTINEL"),
  });
  await expect(page.getByLabel("Daftar absen")).toContainText(
    "PRIVATE_CSV_SENTINEL",
  );
  await upload.setInputFiles({
    name: "bad.csv",
    mimeType: "text/csv",
    buffer: Buffer.from("absen,nama\n1,INVALID_CSV_SENTINEL\n1,DUPLICATE"),
  });
  await expect(page.getByText(/CSV tidak diimpor/)).toBeVisible();
  await expect(page.getByLabel("Daftar absen")).toContainText(
    "PRIVATE_CSV_SENTINEL",
  );
  await expect(page.getByLabel("Daftar absen")).not.toContainText(
    "INVALID_CSV_SENTINEL",
  );
  await page
    .getByRole("button", { name: "Simpan nama lokal", exact: true })
    .click();
  await expect(page.getByLabel("Daftar absen")).not.toContainText(
    "PRIVATE_CSV_SENTINEL",
  );
  expect(requests.join("\n")).not.toMatch(
    /PRIVATE_CSV_SENTINEL|INVALID_CSV_SENTINEL/,
  );
});

test("static Bisik and printable independent tasks work offline", async ({
  page,
  context,
}) => {
  const errors: string[] = [];
  page.on("pageerror", () => errors.push("pageerror"));
  await loginTeacher(page);
  await page.getByLabel("Data kelas").selectOption("demo");
  await page.getByRole("button", { name: "Buat kelas", exact: true }).click();
  await page.getByLabel("Nama rombel", { exact: true }).fill("7T");
  await page.getByRole("button", { name: "Simpan kelas", exact: true }).click();
  await page.getByRole("button", { name: /Buka kelas 7T/ }).click();
  await injectFixture(page);
  await waitForShellCache(page);
  await page
    .getByRole("button", { name: "Siapkan Paket Sesi", exact: true })
    .click();
  await expect(page.getByText(/Paket tersimpan lokal/)).toBeVisible();
  await page.reload(); // newly controlled shell can serve lazy PDF chunks offline
  await page.getByLabel("Data kelas").selectOption("demo");
  await context.setOffline(true);
  await page.getByLabel("Kode Bisik").selectOption("D1.2");
  await expect(
    page.getByRole("region", { name: "Bisik statis" }),
  ).toContainText("Pengurangan dari bilangan negatif");
  const download = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Unduh tugas mandiri PDF", exact: true })
    .click();
  const file = await download;
  expect(file.suggestedFilename()).toBe("papannalar-tugas-mandiri.pdf");
  await file.saveAs("artifacts/qa/M06/independent-browser.pdf");
  expect(errors).toEqual([]);
});
