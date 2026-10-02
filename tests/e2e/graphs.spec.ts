import { openBoard } from "../browser/helpers";
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
  await page.getByLabel("Data kelas").selectOption("demo");
  await page.getByRole("button", { name: "Buat kelas", exact: true }).click();
  await page.getByLabel("Nama rombel", { exact: true }).fill("10G");
  await page.getByRole("button", { name: "Simpan kelas", exact: true }).click();
  await page.getByRole("button", { name: /Buka kelas 10G/ }).click();
  await page
    .getByRole("button", { name: "Mulai Sesi Tepat Level", exact: true })
    .click();
  const context = await browser.newContext({
      baseURL: "http://127.0.0.1:3100",
      viewport: { width: 1920, height: 1080 },
    }),
    board = await context.newPage(),
    errors: string[] = [];
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
    .selectOption("graphs");
  const tool = board.getByRole("region", { name: "Grafik Geser", exact: true });
  async function open(kind: string, pattern = "build") {
    await page.getByLabel("Jenis grafik", { exact: true }).selectOption(kind);
    await page
      .getByLabel("Pola interaksi", { exact: true })
      .selectOption(pattern);
    await page
      .getByRole("button", { name: "Buka latihan Grafik Geser", exact: true })
      .click();
    const labels: Record<string, string> = {
      build: "Bangun Model",
      predict: "Tebak Dulu",
      watch: "Lihat Dulu · angka berbeda",
      "find-error": "Cari Kesalahan",
      open: "Tantangan Terbuka",
      together: "Berdua",
      explore: "Jelajah",
    };
    await expect(
      board.getByRole("heading", { name: labels[pattern], exact: true }),
    ).toBeVisible();
    if (!["watch", "predict"].includes(pattern))
      await expect(tool.getByTestId("graph-target")).toContainText(
        (
          {
            linear: "y = 2x + 1",
            intersection: "A: y = x + 20",
            inequalities: "1x + 1y ≤ 4",
            quadratic: "1x² − 5x + 6",
            exponential: "(2)^(x + 1)",
          } as Record<string, string>
        )[kind],
      );
  }
  return { context, board, tool, errors, open };
}
async function coefficient(tool: Locator, label: string, value: string) {
  const field = tool.getByLabel(label, { exact: true });
  await field.fill(value);
  await field.blur();
}
async function point(tool: Locator, x: string, y?: string) {
  await tool.getByLabel("Koordinat x grafik", { exact: true }).fill(x);
  if (y !== undefined)
    await tool.getByLabel("Koordinat y grafik", { exact: true }).fill(y);
  await tool
    .getByRole("button", {
      name: y === undefined ? "Titik pada kurva A" : "Letakkan titik uji",
      exact: true,
    })
    .click();
}
async function run(tool: Locator) {
  await tool.getByRole("button", { name: "Jalankan", exact: true }).click();
  await expect(tool.getByRole("status")).toContainText("Model sudah sesuai");
}
async function linear(tool: Locator) {
  await coefficient(tool, "Kemiringan A", "2");
  await coefficient(tool, "Titik potong y A", "1");
  await point(tool, "3");
  await run(tool);
}
async function evidence(tool: Locator, name: string, errors: string[]) {
  await mkdir("artifacts/qa/M14", { recursive: true });
  await tool.screenshot({ path: `artifacts/qa/M14/graph-${name}.png` });
  await expect(
    tool.page().getByRole("link", { name: "Langsung ke isi", exact: true }),
  ).not.toBeInViewport();
  await tool.getByTestId("graph-plot").scrollIntoViewIfNeeded();
  await tool.page().screenshot({
    path: `artifacts/qa/M14/graph-${name}-viewport.png`,
    fullPage: false,
  });
  await writeFile(
    `artifacts/qa/M14/graph-${name}.json`,
    JSON.stringify(
      { sampleCount: 1, viewport: [1920, 1080], mode: name, errors },
      null,
      2,
    ),
  );
  expect(errors).toEqual([]);
}
test("TOOL06 D6 linear slider is one undo step; point, exact table, and wrong guess are checked", async ({
  page,
  browser,
}) => {
  const { context, board, tool, errors, open } = await paired(page, browser);
  await open("linear");
  const slider = tool.getByLabel("Geser Kemiringan A", { exact: true });
  await slider.scrollIntoViewIfNeeded();
  const rect = (await slider.boundingBox())!,
    thumbWidth = await slider.evaluate((e) =>
      parseFloat(getComputedStyle(e, "::-webkit-slider-thumb").width),
    );
  expect(thumbWidth).toBeGreaterThanOrEqual(88);
  await board.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2);
  await board.mouse.down();
  await board.mouse.move(
    rect.x + 44 + ((rect.width - 88) * 16) / 24,
    rect.y + rect.height / 2,
    { steps: 8 },
  );
  await expect(tool.getByLabel("Kemiringan A", { exact: true })).toHaveValue(
    "4",
  );
  await board.mouse.up();
  await expect(tool.getByTestId("graph-model")).toContainText("4x");
  await tool
    .getByRole("button", { name: "Ulang langkah", exact: true })
    .click();
  await expect(tool.getByLabel("Kemiringan A", { exact: true })).toHaveValue(
    "0",
  );
  await expect(tool.getByTestId("graph-model")).toHaveCount(0);
  await linear(tool);
  await expect(tool.getByTestId("graph-point")).toHaveText("Titik (3, 7)");
  await point(tool, "3", "24");
  await tool.getByRole("button", { name: "Jalankan", exact: true }).click();
  await expect(tool.getByRole("status")).toContainText("Periksa titik");
  await point(tool, "3");
  await run(tool);
  const marker = await tool
    .getByLabel("Seret titik uji grafik", { exact: true })
    .boundingBox();
  expect(marker!.width).toBeGreaterThanOrEqual(88);
  await evidence(tool, "linear", errors);
  await context.close();
});
test("TOOL06 SPLDV two lines intersect at 5 GB / 25 and share exact table values", async ({
  page,
  browser,
}) => {
  const { context, tool, errors, open } = await paired(page, browser);
  await open("intersection");
  await coefficient(tool, "Kemiringan A", "1");
  await coefficient(tool, "Titik potong y A", "20");
  await coefficient(tool, "Kemiringan B", "5");
  await point(tool, "5");
  await tool
    .getByRole("button", { name: "Satu titik potong", exact: true })
    .click();
  await run(tool);
  await expect(tool.getByTestId("graph-point")).toHaveText("Titik (5, 25)");
  await expect(tool.getByTestId("graph-intersection")).toHaveCount(1);
  const row = tool
    .getByRole("rowheader", { name: "5", exact: true })
    .locator("..");
  await expect(row.getByRole("cell")).toHaveText(["25", "25"]);
  await evidence(tool, "intersection", errors);
  await context.close();
});
test("TOOL06 E2 shades intersection of all inequalities, detects empty region, and works offline", async ({
  page,
  browser,
}) => {
  const { context, board, tool, errors, open } = await paired(page, browser);
  await open("inequalities");
  for (const name of ["Batas 1 ≤", "Batas 2 ≥", "Batas 3 ≥"])
    await tool.getByRole("button", { name, exact: true }).click();
  await tool.getByRole("button", { name: "Arsir irisan", exact: true }).click();
  await point(tool, "1", "2");
  await run(tool);
  await expect(tool.getByTestId("graph-feasible")).toHaveCount(1);
  await point(tool, "-1", "1");
  await tool.getByRole("button", { name: "Jalankan", exact: true }).click();
  await expect(tool.getByRole("status")).toContainText("Periksa titik");
  await point(tool, "1", "2");
  await coefficient(tool, "Batas ruas 2", "5");
  await expect(tool.getByTestId("graph-feasible")).toHaveCount(0);
  await injectFixture(board);
  await waitForShellCache(board);
  await context.setOffline(true);
  await tool
    .getByRole("button", { name: "Ulang langkah", exact: true })
    .click();
  await expect(tool.getByTestId("graph-feasible")).toHaveCount(1);
  await run(tool);
  await evidence(tool, "inequalities", errors);
  await context.close();
});
test("TOOL06 E3 parabola roots 2 and 3; reversed roots and undo are real model changes", async ({
  page,
  browser,
}) => {
  const { context, tool, errors, open } = await paired(page, browser);
  await open("quadratic");
  await expect(tool.getByTestId("graph-roots")).toHaveCount(0);
  await coefficient(tool, "Koefisien b", "-5");
  await coefficient(tool, "Koefisien c", "6");
  await tool
    .getByRole("button", { name: "Tandai akar model", exact: true })
    .click();
  await expect(tool.getByTestId("graph-roots")).toHaveText(
    "Akar model: 2 dan 3",
  );
  await run(tool);
  await coefficient(tool, "Koefisien b", "5");
  await tool
    .getByRole("button", { name: "Tandai akar model", exact: true })
    .click();
  await expect(tool.getByTestId("graph-roots")).toHaveText(
    "Akar model: −3 dan −2",
  );
  await tool.getByRole("button", { name: "Jalankan", exact: true }).click();
  await expect(tool.getByRole("status")).toContainText("Bandingkan koefisien");
  for (let i = 0; i < 2; i++)
    await tool
      .getByRole("button", { name: "Ulang langkah", exact: true })
      .click();
  await expect(tool.getByTestId("graph-roots")).toHaveText(
    "Akar model: 2 dan 3",
  );
  await run(tool);
  await evidence(tool, "quadratic", errors);
  await context.close();
});
test("TOOL06 E4 exponent is multiplicative and compared with a line; no overflow or off-domain point", async ({
  page,
  browser,
}) => {
  const { context, tool, errors, open } = await paired(page, browser);
  await open("exponential");
  await coefficient(tool, "Geser pangkat", "1");
  await point(tool, "3");
  await run(tool);
  await expect(tool.getByTestId("graph-point")).toHaveText("Titik (3, 16)");
  const row = tool
    .getByRole("rowheader", { name: "3", exact: true })
    .locator("..");
  await expect(row.getByRole("cell")).toHaveText(["16", "8"]);
  await point(tool, "7", "16");
  await expect(tool.getByRole("status")).toContainText("rentang");
  await expect(
    tool.getByLabel("Koordinat x grafik", { exact: true }),
  ).toHaveValue("3");
  await expect(tool.getByTestId("graph-point")).toHaveText("Titik (3, 16)");
  await coefficient(tool, "Pembilang basis (penyebut 1)", "1");
  await expect(tool.getByRole("status")).toContainText("basis");
  await expect(
    tool.getByLabel("Pembilang basis (penyebut 1)", { exact: true }),
  ).toHaveValue("2");
  await expect(tool.getByTestId("graph-model")).toContainText("(2)^(x + 1)");
  await run(tool);
  await evidence(tool, "exponential", errors);
  await context.close();
});
test("TOOL06 all seven patterns share graph engine, retain independent turns and deduplicate points", async ({
  page,
  browser,
}) => {
  test.setTimeout(180000);
  const { context, board, tool, errors, open } = await paired(page, browser);
  await open("linear", "predict");
  await expect(tool).toHaveCount(0);
  await board.getByLabel("Nilai tebakan", { exact: true }).fill("7");
  await board
    .getByRole("button", { name: "Simpan tebakan dan coba model", exact: true })
    .click();
  await linear(tool);
  await expect(board.getByTestId("prediction-comparison")).toContainText(
    "Tebakan 7 · Hasil model (3, 7)",
  );
  await board.clock.install();
  await open("linear", "watch");
  await expect(
    board.getByRole("region", { name: "Contoh kembar", exact: true }),
  ).toContainText("y = 3x + 2");
  await board.clock.runFor(31000);
  await expect(
    board.getByRole("region", { name: "Contoh kembar", exact: true }),
  ).toContainText("Hasil contoh: (2, 8)");
  await board
    .getByRole("button", { name: "Coba soal sendiri", exact: true })
    .click();
  await board.clock.resume();
  await open("linear", "find-error");
  await expect(tool.getByTestId("graph-point")).toHaveText("Titik (3, 24)");
  await point(tool, "3");
  await run(tool);
  await open("linear", "open");
  await coefficient(tool, "Kemiringan A", "2");
  await coefficient(tool, "Titik potong y A", "1");
  await point(tool, "0");
  await run(tool);
  const wall = board.getByRole("complementary", {
    name: "Dinding model",
    exact: true,
  });
  await expect(wall).toContainText("Model unik (1)");
  await run(tool);
  await expect(wall).toContainText("sudah ada di dinding");
  await point(tool, "1");
  await run(tool);
  await expect(wall).toContainText("Model unik (2)");
  await open("linear", "together");
  await linear(tool);
  await board
    .getByRole("button", { name: "Giliran Pilot B", exact: true })
    .click();
  await expect(tool.getByLabel("Kemiringan A", { exact: true })).toHaveValue(
    "0",
  );
  await linear(tool);
  await expect(board.getByTestId("two-model-results")).toContainText(
    "Cara A: (3, 7) · Cara B: (3, 7)",
  );
  await open("linear", "explore");
  await coefficient(tool, "Kemiringan A", "-2");
  await expect(tool.getByTestId("graph-model")).toContainText("−2x");
  await open("linear", "build");
  await expect(tool.getByLabel("Kemiringan A", { exact: true })).toHaveValue(
    "0",
  );
  expect(errors).toEqual([]);
  await context.close();
});
