import { openTeacherExample } from "../browser/helpers";
import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import {
  loginTeacher,
  injectFixture,
  waitForShellCache,
  chooseTeacherMode,
} from "../browser/helpers";

test("IndexedDB v1 migration, CAS, duplicate, reopen, atomic rollback and deletion", async ({
  page,
}) => {
  await loginTeacher(page);
  await page.addScriptTag({
    content: await readFile(".browser-tests/assessment-fixture.js", "utf8"),
  });
  const result = await page.evaluate(() =>
    window.__assessmentFixture.exercise(),
  );
  expect(result).toMatchObject({
    migrated: true,
    empty: 0,
    first: "saved",
    duplicate: "duplicate",
    correction: "saved",
    conflict: "conflict",
    before: { events: 2, outbox: 2 },
    persisted: 2,
    rolledBack: true,
    after: 2,
    counts: { events: 2, outbox: 2 },
    observations: 5,
    removed: 0,
  });
  expect(result.eventKeys).toEqual([
    "schemaVersion",
    "eventId",
    "classId",
    "sessionId",
    "studentId",
    "operation",
    "baseRevision",
    "revision",
    "source",
    "assessmentId",
    "bindingVersion",
    "choices",
    "responses",
  ]);
});

test("scan review / Ganti / Lewati / manual fallback and offline durable reload", async ({
  page,
  context,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await loginTeacher(page);
  await chooseTeacherMode(page, "demo");
  await page.getByRole("button", { name: "Buat kelas", exact: true }).click();
  await page.getByLabel("Nama rombel", { exact: true }).fill("7B");
  await page.getByRole("button", { name: "Simpan kelas", exact: true }).click();
  await page.getByRole("button", { name: /Buka kelas 7B/ }).click();
  await openTeacherExample(page);
  await page
    .getByRole("button", { name: "Jalankan contoh sesi", exact: true })
    .click();
  await expect(page.getByTestId("scan-count")).toHaveText(
    "29/32 kartu tersimpan lokal",
  );
  await page
    .getByRole("button", { name: "Fixture sintetis 07", exact: true })
    .click();
  await expect(page.getByLabel("Review kartu")).toBeVisible();
  await page.getByRole("button", { name: "Simpan hasil", exact: true }).click();
  await expect(page.getByTestId("scan-count")).toHaveText(
    "30/32 kartu tersimpan lokal",
  );
  await page
    .getByRole("button", { name: "Fixture sintetis 07", exact: true })
    .click();
  await page.getByRole("button", { name: "Simpan hasil", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Ganti", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Jawaban baris 3").selectOption("B");
  await page.getByRole("button", { name: "Ganti", exact: true }).click();
  await expect(page.getByTestId("scan-count")).toHaveText(
    "30/32 kartu tersimpan lokal",
  );
  await page
    .getByRole("button", { name: "Fixture sintetis 12", exact: true })
    .click();
  await page.getByRole("button", { name: "Lewati", exact: true }).click();
  await expect(page.getByTestId("scan-count")).toHaveText(
    "30/32 kartu tersimpan lokal",
  );
  await page.evaluate(() => {
    Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
      value: () =>
        Promise.reject(new DOMException("denied", "NotAllowedError")),
    });
  });
  await page
    .getByRole("button", { name: "Gunakan kamera", exact: true })
    .click();
  await expect(page.getByText(/Kamera belum tersedia/)).toBeVisible();
  await page.getByRole("button", { name: "Input manual", exact: true }).click();
  await page.getByLabel("Nomor absen kartu").selectOption("12");
  for (const [i, choice] of ["A", "B", "C", "?", "?"].entries())
    await page.getByLabel(`Jawaban baris ${i + 1}`).selectOption(choice);
  await page.getByRole("button", { name: "Simpan hasil", exact: true }).click();
  await expect(page.getByTestId("scan-count")).toHaveText(
    "31/32 kartu tersimpan lokal",
  );
  await injectFixture(page);
  await waitForShellCache(page);
  await context.setOffline(true);
  await page.reload();
  await chooseTeacherMode(page, "demo");
  await expect(page.getByTestId("scan-count")).toHaveText(
    "31/32 kartu tersimpan lokal",
  );
  await page
    .getByRole("button", { name: "Fixture sintetis 25", exact: true })
    .click();
  await page.getByRole("button", { name: "Simpan hasil", exact: true }).click();
  await expect(page.getByTestId("scan-count")).toHaveText(
    "32/32 kartu tersimpan lokal",
  );
  await expect(page.getByLabel("Kelompok guru")).toContainText(
    "Segitiga Biru · D1 · 7 siswa",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .locator('section[aria-label="Sesi Tepat Level"]')
    .screenshot({ path: "artifacts/qa/M03/m03c/session-mobile.png" });
  expect(errors).toEqual([]);
});
