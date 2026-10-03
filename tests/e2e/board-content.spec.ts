import { openBoard, chooseTeacherMode } from "../browser/helpers";
import { test, expect, type Page } from "@playwright/test";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import {
  loginTeacher,
  injectFixture,
  waitForShellCache,
} from "../browser/helpers";
test.use({ trace: "off" });
async function packageFixture(page: Page) {
  await page.addScriptTag({
    content: await readFile(".browser-tests/package-fixture.js", "utf8"),
  });
}
async function navigation(page: Page) {
  const handle = page.getByRole("button", {
    name: "Buka navigasi sesi",
    exact: true,
  });
  const nav = page.getByRole("navigation", { name: "Navigasi sesi papan" });
  if (await nav.isVisible()) {
    await nav
      .getByRole("button", { name: "Tutup navigasi", exact: true })
      .click();
    await expect(handle).toBeFocused();
  }
  await handle.click();
  await expect(nav).toBeVisible();
  await nav
    .getByRole("combobox", { name: "Tampilan sesi", exact: true })
    .focus();
  // The five-second auto-hide must never remove the focused menu.
  await page.waitForTimeout(5100);
  await expect(nav).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(nav).toBeHidden();
  await expect(handle).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(nav).toBeVisible();
  return nav;
}
test("CACHE01 board content uses actual IndexedDB: empty, strict input, persistence, clear and no group data", async ({
  page,
}) => {
  await openBoard(page);
  await packageFixture(page);
  expect(
    await page.evaluate(() => window.__packageFixture.exerciseBoardCache()),
  ).toEqual({
    empty: true,
    rejected: true,
    persisted: true,
    onlyContent: true,
    erased: true,
  });
});
test("CACHE02 teacher uploads package, board navigates offline, explicit handoff reconciles, reload loses roster and retains content", async ({
  page,
  browser,
}) => {
  test.setTimeout(150000);
  await mkdir("artifacts/qa/M15", { recursive: true });
  const errors: string[] = [];
  const context = await browser.newContext({
    baseURL: "http://127.0.0.1:3100",
    viewport: { width: 1920, height: 1080 },
  });
  const board = await context.newPage();
  let offline = false;
  for (const [label, surface] of [
    ["teacher", page],
    ["board", board],
  ] as const) {
    surface.on("pageerror", () => errors.push(`${label}:runtime`));
    surface.on("console", (m) => {
      if (
        m.type() === "error" &&
        !(offline && /ERR_INTERNET_DISCONNECTED|Failed to fetch/.test(m.text()))
      )
        errors.push(`${label}:console`);
    });
  }
  await loginTeacher(page);
  await chooseTeacherMode(page, "demo");
  await page.getByRole("button", { name: "Buat kelas", exact: true }).click();
  await page.getByLabel("Nama kelas", { exact: true }).fill("7P");
  await page.getByRole("button", { name: "Simpan kelas", exact: true }).click();
  await page.getByRole("button", { name: /Buka kelas 7P/ }).click();
  await page.getByRole("button", { name: "Siapkan soal", exact: true }).click();
  await expect(
    page.getByRole("region", { name: "Paket Sesi", exact: true }),
  ).toContainText("Latihan tersimpan di perangkat ini");
  await page
    .getByRole("button", { name: "Mulai sesi dengan soal ini", exact: true })
    .click();
  await openBoard(board);
  await page
    .getByLabel("Kode pasangan", { exact: true })
    .fill(
      (await board.getByTestId("pairing-code").textContent())!.replace(
        /\s/g,
        "",
      ),
    );
  await page
    .getByRole("button", { name: "Hubungkan papan", exact: true })
    .click();
  const transfer = page.getByRole("region", {
    name: "Paket offline papan",
    exact: true,
  });
  await expect(transfer).toContainText(
    "Paket offline sudah tersimpan di papan",
    { timeout: 30000 },
  );
  await injectFixture(board);
  await waitForShellCache(board);
  await packageFixture(board);
  const cache = await board.evaluate(() =>
    window.__packageFixture.inspectBoardCache(),
  );
  expect(cache.present).toBe(true);
  expect(cache.privateFields).toBe(false);
  expect(cache.activities).toBeGreaterThan(1);
  offline = true;
  await context.setOffline(true);
  const nav = await navigation(board);
  await nav.getByRole("button", { name: "Lanjut", exact: true }).click();
  await expect(
    board.getByRole("region", { name: "Soal cek paket", exact: true }),
  ).toContainText("Soal 1/10");
  await nav.getByRole("button", { name: "Lanjut", exact: true }).click();
  await expect(
    board.getByRole("region", { name: "Soal cek paket", exact: true }),
  ).toContainText("Soal 2/10");
  await expect(board.getByTestId("board-connection")).toContainText(
    "Kendali lokal",
  );
  await expect(page.getByTestId("pairing-status")).toContainText(
    "Menunggu layar menerapkan tampilan",
    { timeout: 15000 },
  );
  await context.setOffline(false);
  offline = false;
  await expect(transfer).toContainText("Papan memakai kendali lokal", {
    timeout: 20000,
  });
  await transfer
    .getByRole("button", { name: "Gunakan tampilan papan", exact: true })
    .click();
  await expect(board.getByTestId("board-connection")).toContainText(
    "Tersambung",
    { timeout: 20000 },
  );
  await expect(
    board.getByRole("region", { name: "Soal cek paket", exact: true }),
  ).toContainText("Soal 2/10");
  await expect(page.getByTestId("pairing-status")).toContainText(
    "Layar tersambung",
  );
  const second = await navigation(board);
  await second.getByRole("button", { name: "Lanjut", exact: true }).click();
  await expect(transfer).toContainText("Papan memakai kendali lokal");
  await transfer
    .getByRole("button", { name: "Kembali ke tampilan HP", exact: true })
    .click();
  await expect(board.getByTestId("board-connection")).toContainText(
    "Tersambung",
  );
  await expect(
    board.getByRole("region", { name: "Soal cek paket", exact: true }),
  ).toContainText("Soal 2/10");
  offline = true;
  await context.setOffline(true);
  await board.reload();
  await expect(
    board.getByRole("region", { name: "Tes Kemampuan Papan", exact: true }),
  ).toHaveCount(0);
  await board.getByText("Menu papan", { exact: true }).click();
  await board
    .getByRole("button", { name: "Buka paket tersimpan", exact: true })
    .click();
  await expect(board.getByTestId("board-connection")).toContainText(
    "daftar kelompok tidak disimpan",
  );
  const selector = board.getByLabel("Aktivitas tanpa daftar kelompok", {
    exact: true,
  });
  const last = await selector.locator("option").last().getAttribute("value");
  await selector.selectOption(last!);
  await expect(
    board.getByRole("region", { name: "Latihan dari cache", exact: true }),
  ).toBeVisible();
  expect(
    await board
      .getByRole("region", { name: "Latihan dari cache", exact: true })
      .innerText(),
  ).not.toMatch(/Absen|Segitiga Biru|D[1-6]|A[1-4]/);
  await board.getByText("Menu papan", { exact: true }).click();
  await board.screenshot({ path: "artifacts/qa/M15/board-offline-cache.png" });
  await packageFixture(board);
  expect(
    (await board.evaluate(() => window.__packageFixture.inspectBoardCache()))
      .privateFields,
  ).toBe(false);
  await writeFile(
    "artifacts/qa/M15/board-content-browser.json",
    JSON.stringify(
      {
        environment: "LOCAL_CHROMIUM",
        cache,
        handoff: ["board", "teacher"],
        offlineReload: true,
        hardware: "NOT_RUN",
        errors,
      },
      null,
      2,
    ),
  );
  expect(errors).toEqual([]);
  await context.close();
});
