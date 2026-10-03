import { openTeacherExample } from "../browser/helpers";
import { openBoard, chooseTeacherMode } from "../browser/helpers";
import {
  test,
  expect,
  type Page,
  type Browser,
  type Locator,
} from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import {
  loginTeacher,
  injectFixture,
  waitForShellCache,
} from "../browser/helpers";

async function paired(page: Page, browser: Browser) {
  await loginTeacher(page);
  await chooseTeacherMode(page, "demo");
  await page.getByRole("button", { name: "Buat kelas", exact: true }).click();
  await page.getByLabel("Nama rombel", { exact: true }).fill("10T");
  await page.getByRole("button", { name: "Simpan kelas", exact: true }).click();
  await page.getByRole("button", { name: /Buka kelas 10T/ }).click();
  await openTeacherExample(page);
  await page
    .getByRole("button", { name: "Jalankan contoh sesi", exact: true })
    .click();
  const context = await browser.newContext({
      baseURL: "http://127.0.0.1:3100",
      viewport: { width: 1920, height: 1080 },
    }),
    board = await context.newPage();
  const errors: string[] = [];
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
    .selectOption("balance");
  async function open(pattern: string) {
    await page
      .getByLabel("Pola interaksi", { exact: true })
      .selectOption(pattern);
    await page
      .getByRole("button", {
        name: "Buka latihan Timbangan Persamaan",
        exact: true,
      })
      .click();
    const label: Record<string, string> = {
      build: "Bangun Model",
      predict: "Tebak Dulu",
      watch: "Lihat Dulu · angka berbeda",
      "find-error": "Cari Kesalahan",
      open: "Tantangan Terbuka",
      together: "Berdua",
      explore: "Jelajah",
    };
    await expect(
      board.getByRole("heading", { name: label[pattern], exact: true }),
    ).toBeVisible();
  }
  return { context, board, errors, open };
}
async function operation(tool: Locator, amount: string, label: string) {
  await tool
    .getByLabel("Nilai operasi timbangan", { exact: true })
    .fill(amount);
  await tool.getByRole("button", { name: label, exact: true }).click();
}
async function solve(tool: Locator) {
  await operation(tool, "7", "Tambah kedua ruas");
  await expect(tool.getByTestId("balance-left")).toHaveText("3x");
  await expect(tool.getByTestId("balance-right")).toHaveText("18");
  await operation(tool, "3", "Bagi kedua ruas");
  await expect(tool.getByTestId("balance-left")).toHaveText("x");
  await expect(tool.getByTestId("balance-right")).toHaveText("6");
  await tool.getByRole("button", { name: "Jalankan", exact: true }).click();
  await expect(tool.getByRole("status")).toContainText("Model sudah sesuai");
}
test("TOOL05 actual balance: symmetric drag/cancel, exact 3x−7=11, zero guard, offline undo", async ({
  page,
  browser,
}) => {
  const { context, board, errors, open } = await paired(page, browser);
  await open("build");
  const tool = board.getByRole("region", {
    name: "Timbangan Persamaan",
    exact: true,
  });
  await expect(tool.getByTestId("balance-left")).toHaveText("3x − 7");
  await tool.getByRole("button", { name: "Jalankan", exact: true }).click();
  await expect(tool.getByRole("status")).toContainText("Sisakan satu x");
  const weight = tool.getByRole("button", { name: "Beban +1", exact: true });
  await weight.scrollIntoViewIfNeeded();
  const from = (await weight.boundingBox())!,
    to = (await tool.getByTestId("balance-drop").boundingBox())!;
  expect(from.height).toBeGreaterThanOrEqual(48);
  await board.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await board.mouse.down();
  await board.mouse.move(to.x + to.width / 2, to.y + to.height - 30, {
    steps: 6,
  });
  await board.mouse.up();
  await expect(tool.getByTestId("balance-left")).toHaveText("3x − 6");
  await expect(tool.getByTestId("balance-right")).toHaveText("12");
  await weight.dispatchEvent("pointerdown", {
    pointerId: -77,
    width: 1,
    height: 1,
    clientX: 0,
    clientY: 0,
  });
  await weight.dispatchEvent("pointercancel", { pointerId: -77 });
  await weight.dispatchEvent("pointerup", {
    pointerId: -77,
    clientX: to.x + 20,
    clientY: to.y + 20,
  });
  await expect(tool.getByTestId("balance-right")).toHaveText("12");
  await tool
    .getByRole("button", { name: "Ulang langkah", exact: true })
    .click();
  await operation(tool, "0", "Bagi kedua ruas");
  await expect(tool.getByRole("status")).toContainText("bukan nol");
  await expect(tool.getByTestId("balance-right")).toHaveText("11");
  await injectFixture(board);
  await waitForShellCache(board);
  await context.setOffline(true);
  await solve(tool);
  await tool
    .getByRole("button", { name: "Ulang langkah", exact: true })
    .click();
  await expect(tool.getByTestId("balance-right")).toHaveText("18");
  await operation(tool, "3", "Bagi kedua ruas");
  await tool.getByRole("button", { name: "Jalankan", exact: true }).click();
  await mkdir("artifacts/qa/M14", { recursive: true });
  await tool.screenshot({ path: "artifacts/qa/M14/balance-board.png" });
  await writeFile(
    "artifacts/qa/M14/balance-browser.json",
    JSON.stringify(
      {
        sampleCount: 1,
        viewport: [1920, 1080],
        symbolicUnknownWeight: true,
        exactResult: "x = 6",
        dragChangesBothSides: true,
        cancelNoChange: true,
        offlineUndo: true,
        buttonHeight: from.height,
        errors,
      },
      null,
      2,
    ),
  );
  expect(errors).toEqual([]);
  await context.close();
});
test("TOOL05 seven patterns: predictions, distinct twin, Nala repair, open paths and separate models", async ({
  page,
  browser,
}) => {
  test.setTimeout(180000);
  const { context, board, errors, open } = await paired(page, browser);
  const tool = board.getByRole("region", {
    name: "Timbangan Persamaan",
    exact: true,
  });
  await open("predict");
  await expect(tool).toHaveCount(0);
  await board.getByLabel("Nilai tebakan", { exact: true }).fill("6");
  await board
    .getByRole("button", { name: "Simpan tebakan dan coba model", exact: true })
    .click();
  await solve(tool);
  await expect(board.getByTestId("prediction-comparison")).toContainText(
    "Tebakan 6 · Hasil model x = 6",
  );
  await board.clock.install();
  await open("watch");
  const example = board.getByRole("region", {
    name: "Contoh kembar",
    exact: true,
  });
  await expect(example.getByTestId("balance-left")).toHaveText("2x + 4");
  await expect(example.getByTestId("balance-right")).toHaveText("10");
  await board.clock.runFor(31000);
  await expect(example).toContainText("Hasil contoh: x = 3");
  await board
    .getByRole("button", { name: "Coba soal sendiri", exact: true })
    .click();
  await board.clock.resume();
  await expect(tool.getByTestId("balance-left")).toHaveText("3x − 7");
  await open("find-error");
  await expect(tool.getByTestId("balance-right")).toHaveText("4");
  await tool.getByRole("button", { name: "Jalankan", exact: true }).click();
  await expect(tool.getByRole("status")).toContainText("Periksa langkah");
  await tool
    .getByRole("button", { name: "Ulang langkah", exact: true })
    .click();
  await solve(tool);
  await open("open");
  await expect(tool.getByTestId("balance-left")).toHaveText("3x − 7");
  await solve(tool);
  const wall = board.getByRole("complementary", {
    name: "Dinding model",
    exact: true,
  });
  await expect(wall).toContainText("Model unik (1)");
  await tool.getByRole("button", { name: "Jalankan", exact: true }).click();
  await expect(wall).toContainText("sudah ada di dinding");
  await tool.getByRole("button", { name: "Mulai ulang", exact: true }).click();
  await operation(tool, "3", "Bagi kedua ruas");
  await operation(tool, "7/3", "Tambah kedua ruas");
  await tool.getByRole("button", { name: "Jalankan", exact: true }).click();
  await expect(wall).toContainText("Model unik (2)");
  await open("together");
  await expect(tool).toHaveCount(1);
  await solve(tool);
  await board
    .getByRole("button", { name: "Giliran Pilot B", exact: true })
    .click();
  await expect(tool.getByTestId("balance-left")).toHaveText("3x − 7");
  await solve(tool);
  await expect(board.getByTestId("two-model-results")).toContainText(
    "Cara A: x = 6 · Cara B: x = 6",
  );
  await open("explore");
  await expect(tool.getByTestId("balance-left")).toHaveText("3x − 7");
  await expect(
    board.getByText(
      "Ubah satu hal pada model. Apa yang berubah? Apa yang tetap?",
      { exact: true },
    ),
  ).toBeVisible();
  await operation(tool, "-1", "Kali kedua ruas");
  await expect(tool.getByTestId("balance-left")).toHaveText("−3x + 7");
  await expect(tool.getByTestId("balance-right")).toHaveText("−11");
  await open("build");
  await expect(tool.getByTestId("balance-left")).toHaveText("3x − 7");
  expect(errors).toEqual([]);
  await context.close();
});
