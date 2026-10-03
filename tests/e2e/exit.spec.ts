import { openTeacherExample } from "../browser/helpers";
import { openBoard, chooseTeacherMode } from "../browser/helpers";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { test, expect } from "@playwright/test";
import {
  loginTeacher,
  injectFixture,
  waitForShellCache,
} from "../browser/helpers";
test("exit storage is atomic, frozen, idempotent, isolated and can reopen offline", async ({
  page,
  context,
}) => {
  await loginTeacher(page);
  await injectFixture(page);
  await waitForShellCache(page);
  await page.addScriptTag({
    content: await readFile(".browser-tests/exit-fixture.js", "utf8"),
  });
  await context.setOffline(true);
  const value = await page.evaluate(() => window.__exitFixture.exercise());
  expect(value).toMatchObject({
    first: "saved",
    duplicate: "duplicate",
    before: { events: 1, outbox: 1 },
    correction: "saved",
    conflict: "conflict",
    frozen: true,
    isolated: true,
    counts: { events: 2, outbox: 2 },
    parentSessionId: true,
    keysPreserved: true,
    revision: 2,
    privateAbsent: true,
  });
  expect(value.summary).toEqual([
    {
      stepId: "C3",
      expected: 3,
      assessed: 1,
      understood: 0,
      pending: 2,
      percent: 0,
    },
  ]);
});
test("EXIT01 teacher freezes package, board gets each public row, manual review and correction survive offline", async ({
  page,
  browser,
}) => {
  const errors: string[] = [];
  await loginTeacher(page);
  await chooseTeacherMode(page, "demo");
  await page.getByRole("button", { name: "Buat kelas", exact: true }).click();
  await page.getByLabel("Nama rombel", { exact: true }).fill("7E");
  await page.getByRole("button", { name: "Simpan kelas", exact: true }).click();
  await page.getByRole("button", { name: /Buka kelas 7E/ }).click();
  await page.getByRole("button", { name: "Siapkan soal", exact: true }).click();
  await expect(
    page.getByRole("region", { name: "Paket Sesi", exact: true }),
  ).toContainText("Latihan tersimpan di perangkat ini");
  await openTeacherExample(page);
  await page
    .getByRole("button", { name: "Jalankan contoh sesi", exact: true })
    .click();
  for (const n of ["07", "12", "25"]) {
    await page
      .getByRole("button", { name: `Fixture sintetis ${n}`, exact: true })
      .click();
    await page
      .getByRole("button", { name: "Simpan hasil", exact: true })
      .click();
    await expect(page.getByLabel("Review kartu", { exact: true })).toHaveCount(
      0,
    );
  }
  const context = await browser.newContext({
      baseURL: "http://127.0.0.1:3100",
      viewport: { width: 1920, height: 1080 },
    }),
    board = await context.newPage();
  for (const surface of [page, board]) {
    surface.on("pageerror", () => errors.push("runtime"));
    surface.on("console", (m) => {
      if (m.type() === "error") errors.push("console");
    });
  }
  await openBoard(board);
  const code = await board.getByTestId("pairing-code").textContent();
  await page
    .getByLabel("Kode pasangan", { exact: true })
    .fill(code!.replace(/\s/g, ""));
  await page
    .getByRole("button", { name: "Hubungkan papan", exact: true })
    .click();
  await expect(page.getByTestId("pairing-status")).toContainText(
    "Layar tersambung",
  );
  const exit = page.getByRole("region", {
    name: "Hasil Kartu Keluar",
    exact: true,
  });
  await exit
    .getByRole("button", {
      name: "Bekukan Kartu Keluar dari paket",
      exact: true,
    })
    .click();
  await expect(exit).toContainText("Kelompok dan soal keluar dikunci");
  for (const row of [1, 2, 3]) {
    await exit
      .getByRole("button", {
        name: `Tampilkan baris keluar ${row}`,
        exact: true,
      })
      .click();
    await expect(
      board.getByRole("heading", {
        name: `Kartu Keluar · Baris ${row}/3`,
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      board
        .getByRole("region", { name: "Kartu Keluar kelompok", exact: true })
        .locator("section"),
    ).toHaveCount(3);
  }
  await expect(board.locator("body")).not.toContainText(
    /C3|D1|D3|benar dan paham|answerKey|reasonKey/,
  );
  await exit.getByRole("button", { name: "Input manual", exact: true }).click();
  await exit
    .getByLabel("Absen keluar", { exact: true })
    .selectOption({ label: "1" });
  for (const row of [1, 2, 3])
    await exit
      .getByLabel(`Keluar baris ${row}`, { exact: true })
      .selectOption("?");
  await exit
    .getByRole("button", { name: "Simpan hasil keluar", exact: true })
    .click();
  await expect(exit.getByTestId("exit-count")).toHaveText(
    "1/32 hasil keluar tersimpan",
  );
  await expect(
    exit.getByLabel("Ringkasan benar dan paham", { exact: true }),
  ).toContainText("0/1 pasangan dinilai");
  await exit.getByText("Koreksi hasil keluar", { exact: true }).click();
  await exit
    .getByRole("button", { name: "Koreksi keluar absen 1", exact: true })
    .click();
  await exit
    .getByLabel("Keluar baris 2", { exact: true })
    .selectOption("missing");
  await injectFixture(page);
  await waitForShellCache(page);
  await page.context().setOffline(true);
  await exit
    .getByRole("button", { name: "Ganti hasil keluar", exact: true })
    .click();
  await expect(exit).toContainText("Hasil keluar tersimpan lokal");
  await expect(
    exit.getByLabel("Ringkasan benar dan paham", { exact: true }),
  ).not.toContainText("0/1 pasangan dinilai");
  await mkdir("artifacts/qa/M10", { recursive: true });
  await board
    .getByRole("region", { name: "Kartu Keluar kelompok", exact: true })
    .screenshot({ path: "artifacts/qa/M10/exit-board.png" });
  expect(errors).toEqual([]);
  await writeFile(
    "artifacts/qa/M10/exit-browser.json",
    JSON.stringify(
      {
        rows: 3,
        groups: 3,
        received: 1,
        expected: 32,
        correctionOffline: true,
        runtimeErrors: 0,
        physicalScan: "NOT_RUN",
      },
      null,
      2,
    ),
  );
  await context.close();
});
