import { expect, test, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { loginTeacher, openBoard } from "../browser/helpers";

const evidenceDir = "artifacts/qa/M01";

function observeRuntime(page: Page) {
  const errors: string[] = [];
  const externalRequests: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.protocol.startsWith("http") && url.hostname !== "127.0.0.1")
      externalRequests.push(url.origin);
  });
  return { errors, externalRequests };
}

async function noHorizontalOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
}

test("Aplikasi Guru terbuka pada HP, font lokal siap dan navigasi ke papan bekerja", async ({
  page,
}) => {
  await loginTeacher(page);
  const observed = observeRuntime(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page).toHaveURL(/\/guru$/);
  await expect(page).toHaveTitle("Aplikasi Guru | PapanNalar");
  await expect(
    page.getByRole("heading", { name: "Siap belajar hari ini?", exact: true }),
  ).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  expect(
    await page
      .locator("main")
      .evaluate((element) => getComputedStyle(element).fontFamily),
  ).toContain("Plus Jakarta Sans");
  expect(
    await page.evaluate(() =>
      document.fonts.check('400 16px "Plus Jakarta Sans"'),
    ),
  ).toBe(true);
  const openBoard = page.getByRole("link", { name: "Buka Layar Kelas" });
  const buttonBox = await openBoard.boundingBox();
  expect(buttonBox?.height).toBeGreaterThanOrEqual(48);
  await noHorizontalOverflow(page);
  await mkdir(evidenceDir, { recursive: true });
  await page.screenshot({
    path: `${evidenceDir}/guru-390x844.png`,
    fullPage: true,
  });
  const opened = page.waitForEvent("popup");
  await openBoard.click();
  const board = await opened;
  await board
    .getByRole("button", { name: "Simpan tampilan", exact: true })
    .click();
  const capability = board.getByRole("region", {
    name: "Tes Kemampuan Papan",
    exact: true,
  });
  await expect(capability).toBeVisible();
  await capability
    .getByRole("button", {
      name: "Tutup tes · lanjut dengan cadangan",
      exact: true,
    })
    .click();
  await expect(
    board.getByRole("heading", { name: "Layar Kelas menunggu." }),
  ).toBeVisible();
  expect(observed.errors).toEqual([]);
  expect(observed.externalRequests).toEqual([]);
});

test("Layar Kelas 1920x1080 memakai font papan, tanpa data guru atau kode pasangan palsu", async ({
  page,
}) => {
  const observed = observeRuntime(page);
  await page.setViewportSize({ width: 1920, height: 1080 });
  await openBoard(page);
  await expect(page).toHaveTitle("Layar Kelas | PapanNalar");
  const heading = page.getByRole("heading", { name: "Layar Kelas menunggu." });
  await expect(heading).toBeVisible();
  await expect(page.getByText(/Pindai QR dengan kamera HP guru/)).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  expect(
    await heading.evaluate((element) => getComputedStyle(element).fontFamily),
  ).toContain("Atkinson Hyperlegible");
  expect(
    await heading.evaluate((element) =>
      parseFloat(getComputedStyle(element).fontSize),
    ),
  ).toBeGreaterThanOrEqual(28);
  expect(
    await page.evaluate(() =>
      document.fonts.check('700 64px "Atkinson Hyperlegible"'),
    ),
  ).toBe(true);
  const buttonBox = await page
    .getByRole("button", { name: "Layar penuh", exact: true })
    .boundingBox();
  expect(buttonBox?.height).toBeGreaterThanOrEqual(48);
  const publicText = await page.locator("body").innerText();
  expect(publicText).not.toMatch(/\b[A-E][1-6]\b|mastery|peringkat/iu);
  await expect(page.getByTestId("pairing-code")).toHaveText(/^\d{3} \d{3}$/);
  await expect(page.locator('[data-surface="guru"]')).toHaveCount(0);
  const stored = await page.evaluate(() => ({
    local: Object.entries(localStorage),
    session: Object.entries(sessionStorage),
  }));
  expect(stored.local.map(([key]) => key)).toEqual(["pn-board-appearance-v1"]);
  expect(stored.session).toEqual([]);
  await noHorizontalOverflow(page);
  await mkdir(evidenceDir, { recursive: true });
  await page.screenshot({
    path: `${evidenceDir}/layar-1920x1080.png`,
    fullPage: true,
    mask: [page.getByTestId("pairing-code")],
  });
  expect(observed.errors).toEqual([]);
  expect(observed.externalRequests).toEqual([]);
});

test("Kontrol layar penuh terhidrasi dan dapat dibuka lalu ditutup", async ({
  page,
}) => {
  const observed = observeRuntime(page);
  await openBoard(page);
  await page.getByRole("button", { name: "Layar penuh", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Keluar layar penuh" }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Keluar layar penuh" }).click();
  await expect(
    page.getByRole("button", { name: "Layar penuh", exact: true }),
  ).toHaveAttribute("aria-pressed", "false");
  expect(observed.errors).toEqual([]);
});

test("Ukuran teks guru 130% tetap dapat dibaca tanpa scroll horizontal", async ({
  page,
}) => {
  await loginTeacher(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/guru");
  await page.addStyleTag({ content: "html { font-size: 130%; }" });
  await expect(
    page.getByRole("link", { name: "Buka Layar Kelas" }),
  ).toBeVisible();
  await noHorizontalOverflow(page);
});
