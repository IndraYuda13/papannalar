import { openBoard, chooseTeacherMode } from "../browser/helpers";
import { mkdir, writeFile } from "node:fs/promises";
import { test, expect } from "@playwright/test";
import {
  loginTeacher,
  injectFixture,
  waitForShellCache,
} from "../browser/helpers";

test("Seven patterns use actual paired board, distinct examples, repairs, unique models and independent turns", async ({
  page,
  browser,
}) => {
  test.setTimeout(120000);
  const errors: string[] = [];
  await loginTeacher(page);
  await chooseTeacherMode(page, "demo");
  await page.getByRole("button", { name: "Buat kelas", exact: true }).click();
  await page.getByLabel("Nama rombel", { exact: true }).fill("7P");
  await page.getByRole("button", { name: "Simpan kelas", exact: true }).click();
  await page.getByRole("button", { name: /Buka kelas 7P/ }).click();
  await page
    .getByRole("button", { name: "Mulai Sesi Tepat Level", exact: true })
    .click();
  const context = await browser.newContext({
    baseURL: "http://127.0.0.1:3100",
    viewport: { width: 1920, height: 1080 },
    hasTouch: true,
  });
  const board = await context.newPage();
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
  async function open(kind: string, label: string, pattern: string) {
    await page
      .getByLabel("Pilih Alat Nalar", { exact: true })
      .selectOption(kind);
    await page
      .getByLabel("Pola interaksi", { exact: true })
      .selectOption(pattern);
    await page
      .getByRole("button", { name: `Buka latihan ${label}`, exact: true })
      .click();
  }
  await open("number-line", "Garis Bilangan", "predict");
  await expect(
    board.getByLabel("Nilai tebakan", { exact: true }),
  ).toBeVisible();
  await expect(board.getByTestId("number-position")).toHaveCount(0);
  await board.getByLabel("Nilai tebakan", { exact: true }).fill("-8");
  await board
    .getByRole("button", { name: "Simpan tebakan dan coba model", exact: true })
    .click();
  await board.getByLabel("Besar lompatan", { exact: true }).fill("-5");
  await board.getByRole("button", { name: "Lompat", exact: true }).click();
  await board.getByRole("button", { name: "Jalankan", exact: true }).click();
  await expect(board.getByTestId("prediction-comparison")).toContainText(
    "Tebakan -8 · Hasil model -8",
  );
  await board.getByRole("button", { name: "Petunjuk 1", exact: true }).click();
  await expect(
    board.getByText("Dari mana mulai, dan ke arah mana bergerak?", {
      exact: true,
    }),
  ).toBeVisible();
  await board.getByRole("button", { name: "Petunjuk 2", exact: true }).click();
  await expect(board.locator("fieldset.border-dashed")).toHaveCount(1);
  await board.clock.install();
  await board.getByRole("button", { name: "Petunjuk 3", exact: true }).click();
  await expect(
    board.getByRole("region", { name: "Contoh kembar", exact: true }),
  ).toContainText("Mulai dari −1");
  await board.clock.runFor(31000);
  await expect(board.getByTestId("example-progress")).toContainText("30/30");
  await expect(
    board.getByText("Hasil contoh: -3", { exact: true }),
  ).toBeVisible();
  await board
    .getByRole("button", { name: "Putar ulang contoh", exact: true })
    .click();
  await expect(board.getByTestId("example-progress")).toContainText("0/30");
  await board.clock.runFor(31000);
  await board
    .getByRole("button", { name: "Coba soal sendiri", exact: true })
    .click();
  await board.clock.resume();
  await open("ratio", "Tabel Rasio", "find-error");
  await expect(
    board.getByLabel("Nilai B kolom 2", { exact: true }),
  ).toHaveValue("7");
  await board
    .getByRole("button", { name: "2 · Susun model seperti Nala", exact: true })
    .click();
  await board.getByRole("button", { name: "Jalankan", exact: true }).click();
  await expect(
    board.getByRole("region", { name: "Tabel Rasio", exact: true }),
  ).toContainText("Periksa pengali");
  await board.getByLabel("Nilai B kolom 2", { exact: true }).fill("9");
  await board.getByLabel("Nilai B kolom 2", { exact: true }).blur();
  await board.getByRole("button", { name: "Jalankan", exact: true }).click();
  await expect(
    board.getByRole("region", { name: "Tabel Rasio", exact: true }),
  ).toContainText("Model sudah sesuai");
  await open("fractions", "Batang Pecahan", "open");
  await expect(
    board.getByRole("region", { name: "Pola Alat Nalar", exact: true }),
  ).toContainText("Temukan dua pecahan positif");
  for (const [bar, cell] of [
    [1, 1],
    [2, 1],
    [3, 1],
    [3, 2],
  ])
    await board
      .getByLabel(`Batang ${bar} bagian ${cell}`, { exact: true })
      .click();
  await board.getByRole("button", { name: "Jalankan", exact: true }).click();
  await expect(
    board.getByRole("complementary", { name: "Dinding model", exact: true }),
  ).toContainText("Model unik (1)");
  await board.getByRole("button", { name: "Jalankan", exact: true }).click();
  await expect(
    board.getByRole("complementary", { name: "Dinding model", exact: true }),
  ).toContainText("sudah ada di dinding");
  // Two browser-emulated touch contacts: proves pointer plumbing, not physical hardware.
  await board
    .getByLabel("Geser batang 1", { exact: true })
    .scrollIntoViewIfNeeded();
  const handles = await Promise.all(
    [1, 2].map((n) =>
      board.getByLabel(`Geser batang ${n}`, { exact: true }).boundingBox(),
    ),
  );
  const cdp = await context.newCDPSession(board);
  const contacts = handles.map((b, i) => ({
    id: i + 1,
    x: b!.x + b!.width / 2,
    y: b!.y + b!.height / 2,
    radiusX: 5,
    radiusY: 5,
    force: 1,
  }));
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: contacts,
  });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: contacts.map((p) => ({ ...p, y: p.y + 20 })),
  });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await expect(
    board.getByTestId("fraction-row-0").locator("[style*='translateY']"),
  ).toHaveAttribute("style", /translateY\(20px\)/);
  await expect(
    board.getByTestId("fraction-row-1").locator("[style*='translateY']"),
  ).toHaveAttribute("style", /translateY\(20px\)/);
  await mkdir("artifacts/qa/M09", { recursive: true });
  await board
    .getByRole("region", { name: "Pola Alat Nalar", exact: true })
    .screenshot({ path: "artifacts/qa/M09/open-pattern.png" });
  await open("number-line", "Garis Bilangan", "together");
  await expect(
    board.getByRole("region", { name: "Pola Alat Nalar", exact: true }),
  ).toContainText("Dua sentuhan belum teruji");
  const a = board.getByRole("region", {
      name: "Garis Bilangan Lompat",
      exact: true,
    }),
    b = board.getByRole("region", { name: "Model lift", exact: true });
  await a.getByLabel("Besar lompatan", { exact: true }).fill("-5");
  await a.getByRole("button", { name: "Lompat", exact: true }).click();
  await a.getByRole("button", { name: "Jalankan", exact: true }).click();
  await board
    .getByRole("button", { name: "Giliran Pilot B", exact: true })
    .click();
  await expect(b.getByTestId("number-position")).toContainText("Posisi −3");
  for (const amount of ["-2", "-3"]) {
    await b.getByLabel("Besar lompatan", { exact: true }).fill(amount);
    await b.getByRole("button", { name: "Lompat", exact: true }).click();
  }
  await b.getByRole("button", { name: "Jalankan", exact: true }).click();
  await expect(board.getByTestId("two-model-results")).toContainText(
    "Cara A: -8 · Cara B: -8",
  );
  await open("ratio", "Tabel Rasio", "explore");
  await expect(
    board.getByText(
      "Ubah satu hal pada model. Apa yang berubah? Apa yang tetap?",
      { exact: true },
    ),
  ).toBeVisible();
  await board
    .getByRole("button", { name: "Tambah kolom × pengali", exact: true })
    .click();
  await expect(
    board.getByLabel("Nilai B kolom 2", { exact: true }),
  ).toHaveValue("9");
  await open("algebra", "Ubin Aljabar", "watch");
  await expect(board.getByTestId("example-progress")).toContainText(
    "/30 detik",
  );
  await injectFixture(board);
  await waitForShellCache(board);
  await context.setOffline(true);
  await board.clock.runFor(31000);
  await board
    .getByRole("button", { name: "Coba soal sendiri", exact: true })
    .click();
  await expect(
    board.getByRole("region", { name: "Ubin Aljabar", exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
  await writeFile(
    "artifacts/qa/M09/pattern-browser.json",
    JSON.stringify(
      {
        patterns: 7,
        pointerContacts: 2,
        pointerEvidence: "browser emulation, not hardware",
        exampleDurationSeconds: 30,
        clock: "Playwright virtual time",
        runtimeErrors: errors.length,
        offlineExample: true,
      },
      null,
      2,
    ),
  );
  await context.close();
});
