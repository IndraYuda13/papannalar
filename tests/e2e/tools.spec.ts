import { openBoard, chooseTeacherMode } from "../browser/helpers";
import { mkdir, writeFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import {
  loginTeacher,
  injectFixture,
  waitForShellCache,
} from "../browser/helpers";
test("TOOL03/04 ratio model, algebra distribution, zero pairs and offline undo", async ({
  page,
  browser,
}) => {
  const errors: string[] = [];
  await loginTeacher(page);
  await chooseTeacherMode(page, "demo");
  await page.getByRole("button", { name: "Buat kelas", exact: true }).click();
  await page.getByLabel("Nama rombel", { exact: true }).fill("7T");
  await page.getByRole("button", { name: "Simpan kelas", exact: true }).click();
  await page.getByRole("button", { name: /Buka kelas 7T/ }).click();
  await page
    .getByRole("button", { name: "Mulai Sesi Tepat Level", exact: true })
    .click();
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
  await page.getByText("Pratinjau Alat Nalar", { exact: true }).click();
  await page
    .getByLabel("Pilih Alat Nalar", { exact: true })
    .selectOption("ratio");
  await page
    .getByRole("button", { name: "Buka latihan Tabel Rasio", exact: true })
    .click();
  const ratio = board.getByRole("region", { name: "Tabel Rasio", exact: true });
  await ratio
    .getByRole("button", { name: "Tambah kolom × pengali", exact: true })
    .click();
  await expect(
    ratio.getByLabel("Nilai A kolom 2", { exact: true }),
  ).toHaveValue("6");
  await expect(
    ratio.getByLabel("Nilai B kolom 2", { exact: true }),
  ).toHaveValue("9");
  await ratio.getByLabel("Nilai B kolom 2", { exact: true }).fill("7");
  await ratio.getByLabel("Nilai B kolom 2", { exact: true }).blur();
  await ratio.getByRole("button", { name: "Jalankan", exact: true }).click();
  await expect(ratio).toContainText("Periksa pengali kedua baris");
  await ratio
    .getByRole("button", { name: "Ulang langkah", exact: true })
    .click();
  await expect(
    ratio.getByLabel("Nilai B kolom 2", { exact: true }),
  ).toHaveValue("9");
  await ratio.getByRole("button", { name: "Jalankan", exact: true }).click();
  await expect(ratio).toContainText("Model sudah sesuai");
  await mkdir("artifacts/qa/M09", { recursive: true });
  await ratio.screenshot({ path: "artifacts/qa/M09/ratio-board.png" });
  await page
    .getByLabel("Pilih Alat Nalar", { exact: true })
    .selectOption("algebra");
  await page
    .getByRole("button", { name: "Buka latihan Ubin Aljabar", exact: true })
    .click();
  const algebra = board.getByRole("region", {
    name: "Ubin Aljabar",
    exact: true,
  });
  for (let group = 1; group <= 3; group++) {
    await algebra
      .getByRole("button", { name: "Tambah kelompok", exact: true })
      .click();
    await algebra
      .getByRole("button", { name: "Tambah ubin +x", exact: true })
      .click();
    for (let i = 0; i < 4; i++)
      await algebra
        .getByRole("button", { name: "Tambah ubin +1", exact: true })
        .click();
    await expect(
      algebra.getByLabel(`Ubin +1 kelompok ${group}`, { exact: true }),
    ).toHaveCount(4);
  }
  await algebra.getByRole("button", { name: "Jalankan", exact: true }).click();
  await expect(algebra).toContainText("Model sudah sesuai: 3x + 12");
  await algebra
    .getByRole("button", { name: "Tambah ubin +1", exact: true })
    .click();
  await algebra
    .getByRole("button", { name: "Tambah ubin −1", exact: true })
    .click();
  await expect(algebra.locator("[data-algebra-tile]")).toHaveCount(17);
  await algebra
    .getByLabel("Ubin +1 kelompok 3", { exact: true })
    .first()
    .click();
  await algebra.getByLabel("Ubin −1 kelompok 3", { exact: true }).click();
  await expect(algebra.locator("[data-algebra-tile]")).toHaveCount(15);
  await algebra
    .getByRole("button", { name: "Ulang langkah", exact: true })
    .click();
  await expect(algebra.locator("[data-algebra-tile]")).toHaveCount(17);
  await injectFixture(board);
  await waitForShellCache(board);
  await context.setOffline(true);
  await algebra
    .getByRole("button", { name: "Ulang langkah", exact: true })
    .click();
  await algebra.getByRole("button", { name: "Jalankan", exact: true }).click();
  await expect(algebra).toContainText("Periksa jumlah kelompok");
  await algebra
    .getByRole("button", { name: "Ulang langkah", exact: true })
    .click();
  await algebra.getByRole("button", { name: "Jalankan", exact: true }).click();
  await expect(algebra).toContainText("Model sudah sesuai: 3x + 12");
  await algebra.screenshot({ path: "artifacts/qa/M09/algebra-board.png" });
  expect(errors).toEqual([]);
  await context.close();
});
test("TOOL02 fractions keep whole size, check the model, undo, and run offline on actual board route", async ({
  page,
  browser,
}) => {
  const errors: string[] = [];
  page.on("pageerror", () => errors.push("teacher-runtime"));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push("teacher-console");
  });
  await loginTeacher(page);
  await chooseTeacherMode(page, "demo");
  await page.getByRole("button", { name: "Buat kelas", exact: true }).click();
  await page.getByLabel("Nama rombel", { exact: true }).fill("7F");
  await page.getByRole("button", { name: "Simpan kelas", exact: true }).click();
  await page.getByRole("button", { name: /Buka kelas 7F/ }).click();
  await page
    .getByRole("button", { name: "Mulai Sesi Tepat Level", exact: true })
    .click();
  const context = await browser.newContext({
    baseURL: "http://127.0.0.1:3100",
    viewport: { width: 1920, height: 1080 },
  });
  const board = await context.newPage();
  board.on("pageerror", () => errors.push("board-runtime"));
  board.on("console", (m) => {
    if (m.type() === "error") errors.push("board-console");
  });
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
  await page.getByText("Pratinjau Alat Nalar", { exact: true }).click();
  await page
    .getByRole("button", { name: "Buka latihan Batang Pecahan", exact: true })
    .click();
  const tool = board.getByRole("region", {
    name: "Batang Pecahan",
    exact: true,
  });
  await expect(tool).toBeVisible();
  const before = await tool.getByTestId("fraction-whole-0-0").boundingBox();
  await tool.getByLabel("Batang 1 bagian 1", { exact: true }).click();
  await tool.getByLabel("Batang 2 bagian 1", { exact: true }).click();
  await tool
    .getByRole("button", { name: "Samakan penyebut", exact: true })
    .click();
  await expect(tool.getByTestId("fraction-values")).toHaveText(
    "3/6 · 2/6 · 0/6",
  );
  const after = await tool.getByTestId("fraction-whole-0-0").boundingBox();
  expect(after!.width).toBe(before!.width);
  for (let n = 1; n <= 5; n++)
    await tool.getByLabel(`Batang 3 bagian ${n}`, { exact: true }).click();
  await tool.getByRole("button", { name: "Jalankan", exact: true }).click();
  await expect(tool).toContainText("Model sudah sesuai");
  await tool
    .getByRole("button", { name: "Ulang langkah", exact: true })
    .click();
  await expect(tool.getByTestId("fraction-values")).toHaveText(
    "3/6 · 2/6 · 4/6",
  );
  await tool.getByRole("button", { name: "Jalankan", exact: true }).click();
  await expect(tool).toContainText("Bandingkan bagian berwarna");
  await tool.getByLabel("Batang 3 bagian 5", { exact: true }).click();
  await tool.getByRole("button", { name: "Jalankan", exact: true }).click();
  await injectFixture(board);
  await waitForShellCache(board);
  await context.setOffline(true);
  await tool.getByLabel("Bagi batang 1", { exact: true }).selectOption("12");
  const cell = await tool
    .getByLabel("Batang 1 bagian 1", { exact: true })
    .boundingBox();
  expect(cell!.width).toBeGreaterThanOrEqual(48);
  expect(cell!.height).toBeGreaterThanOrEqual(48);
  expect(
    (await tool.getByTestId("fraction-whole-0-0").boundingBox())!.width,
  ).toBe(before!.width);
  await tool
    .getByRole("button", { name: "Ulang langkah", exact: true })
    .click();
  await mkdir("artifacts/qa/M09", { recursive: true });
  await tool.screenshot({ path: "artifacts/qa/M09/fractions-board.png" });
  await writeFile(
    "artifacts/qa/M09/fraction-browser.json",
    JSON.stringify(
      {
        sampleCount: 1,
        viewport: [1920, 1080],
        wholeWidthBefore: before!.width,
        wholeWidthAfter: after!.width,
        minCell: [cell!.width, cell!.height],
        offlineInteraction: true,
        errors,
      },
      null,
      2,
    ),
  );
  await tool.getByRole("button", { name: "Mulai ulang", exact: true }).click();
  await expect(tool.getByTestId("fraction-values")).toHaveCount(0);
  expect(errors).toEqual([]);
  await context.close();
});
