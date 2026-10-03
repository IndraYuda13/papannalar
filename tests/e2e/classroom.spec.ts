import { openTeacherExample } from "../browser/helpers";
import { openBoard, chooseTeacherMode } from "../browser/helpers";
import { expect, test } from "@playwright/test";
import {
  loginTeacher,
  injectFixture,
  waitForShellCache,
} from "../browser/helpers";
test("teacher pairs board, public groups render and number line/lift respond locally", async ({
  page,
  browser,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await loginTeacher(page);
  await chooseTeacherMode(page, "demo");
  await page.getByRole("button", { name: "Buat kelas", exact: true }).click();
  await page.getByLabel("Nama kelas", { exact: true }).fill("7B");
  await page.getByRole("button", { name: "Simpan kelas", exact: true }).click();
  await page.getByRole("button", { name: /Buka kelas 7B/ }).click();
  await openTeacherExample(page);
  await page
    .getByRole("button", { name: "Jalankan contoh sesi", exact: true })
    .click();
  await expect(page.getByTestId("scan-count")).toContainText("29/32");
  const boardContext = await browser.newContext({
      baseURL: "http://127.0.0.1:3100",
      viewport: { width: 1920, height: 1080 },
    }),
    board = await boardContext.newPage();
  board.on("pageerror", (e) => errors.push(e.message));
  await openBoard(board);
  await expect(board.getByTestId("pairing-code")).toHaveText(/\d{3} \d{3}/);
  await page
    .getByLabel("Kode pasangan", { exact: true })
    .fill(
      (await board.getByTestId("pairing-code").innerText()).replace(/\s/g, ""),
    );
  await page
    .getByRole("button", { name: "Hubungkan papan", exact: true })
    .click();
  await expect(page.getByTestId("pairing-status")).toContainText(
    "Layar tersambung",
  );
  await expect(
    board.getByRole("heading", { name: /Lift dari basement/ }),
  ).toBeVisible();
  await board.getByLabel("Besar lompatan").fill("7");
  await board.getByRole("button", { name: "Lompat", exact: true }).click();
  await board.getByRole("button", { name: "Jalankan", exact: true }).click();
  await expect(board.getByTestId("number-position")).toContainText(
    "Posisi 5 · perpindahan 7 lantai",
  );
  await expect(
    board.getByText("Model sudah sesuai. Ceritakan arah lompatanmu."),
  ).toBeVisible();
  for (const n of ["07", "12", "25"]) {
    await page
      .getByRole("button", { name: `Fixture sintetis ${n}`, exact: true })
      .click();
    await page
      .getByRole("button", { name: "Simpan hasil", exact: true })
      .click();
    await expect(page.getByLabel("Review kartu")).toHaveCount(0);
  }
  await expect(page.getByTestId("scan-count")).toContainText("32/32");
  const controls = page.getByLabel("Kontrol Layar Kelas");
  await controls.getByRole("button", { name: "Kelompok", exact: true }).click();
  await expect(board.getByTestId("public-group")).toHaveCount(3);
  await expect(board.getByLabel("Absen Segitiga Biru")).toHaveText(
    "01 · 02 · 03 · 04 · 05 · 06 · 07",
  );
  expect(await board.locator("main").innerText()).not.toMatch(
    /\bD[1-6]\b|mastery|peringkat|nama siswa/i,
  );
  await board.screenshot({ path: "artifacts/qa/M04/m04b/groups-1920.png" });
  await controls.getByRole("button", { name: "Stasiun", exact: true }).click();
  await expect(
    board.getByRole("heading", { name: "Segitiga Biru · −3 − 5", exact: true }),
  ).toBeVisible();
  await board.getByLabel("Besar lompatan").fill("-5");
  await board.getByRole("button", { name: "Lompat", exact: true }).click();
  await board.getByRole("button", { name: "Jalankan", exact: true }).click();
  await expect(board.getByTestId("number-position")).toHaveText("Posisi −8");
  await expect(
    board.getByText("Model sudah sesuai. Ceritakan arah lompatanmu."),
  ).toBeVisible();
  await board
    .getByRole("button", { name: "Batalkan langkah terakhir", exact: true })
    .click();
  await expect(board.getByTestId("number-position")).toHaveText("Posisi −3");
  // Real pointer drag, then one-step undo.
  const marker = board.getByTestId("number-marker"),
    box = await marker.boundingBox(),
    svg = await board
      .getByRole("img", { name: "Garis bilangan mendatar" })
      .boundingBox();
  expect(box!.width).toBeGreaterThanOrEqual(88);
  await board.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await board.mouse.down();
  await board.mouse.move(
    svg!.x + (svg!.width * (60 + (2 / 20) * 1200)) / 1320,
    box!.y + box!.height / 2,
    { steps: 6 },
  );
  await board.mouse.up();
  await expect(board.getByTestId("number-position")).toHaveText("Posisi −8");
  await board.screenshot({
    path: "artifacts/qa/M04/m04b/number-line-1920.png",
  });
  expect(
    await board.evaluate(() => ({
      local: Object.keys(localStorage),
      session: Object.keys(sessionStorage),
    })),
  ).toEqual({ local: ["pn-board-appearance-v1"], session: [] });
  await injectFixture(board);
  await waitForShellCache(board);
  await boardContext.setOffline(true);
  await expect(board.getByTestId("board-connection")).toContainText("Offline");
  await board
    .getByRole("button", { name: "Batalkan langkah terakhir", exact: true })
    .click();
  await board.getByRole("button", { name: "Lompat", exact: true }).click();
  await expect(board.getByTestId("number-position")).toHaveText("Posisi −8");
  await expect(page.getByTestId("pairing-status")).not.toContainText(
    "Layar tersambung",
    { timeout: 20000 },
  );
  await controls.getByRole("button", { name: "Refleksi", exact: true }).click();
  await expect(
    board.getByRole("heading", { name: "Segitiga Biru · −3 − 5", exact: true }),
  ).toBeVisible();
  await boardContext.setOffline(false);
  await expect(
    board.getByRole("heading", { name: "Refleksi", exact: true }),
  ).toBeVisible();
  await expect(page.getByTestId("pairing-status")).toContainText(
    "Layar tersambung",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page
    .getByLabel("Kontrol Layar Kelas")
    .screenshot({ path: "artifacts/qa/M04/m04c/controls-mobile.png" });
  await boardContext.setOffline(true);
  await openBoard(board);
  await expect(
    board.getByRole("heading", { name: "Layar Kelas menunggu.", exact: true }),
  ).toBeVisible();
  await expect(board.getByTestId("public-group")).toHaveCount(0);
  await expect(board.getByText(/Offline. Sambungkan internet/)).toBeVisible();
  await controls
    .getByRole("button", { name: "Putuskan layar", exact: true })
    .click();
  expect(errors).toEqual([]);
  await boardContext.close();
});
