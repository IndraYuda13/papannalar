import { expect, test, type Page, type Locator } from "@playwright/test";
import { libraryStateSchema } from "../../src/contracts/library";
import { openBoard } from "../browser/helpers";

const origin = "http://127.0.0.1:3100";
async function sample(page: Page) {
  await page.goto("/masuk");
  await page.getByRole("button", { name: "Coba dengan data contoh" }).click();
  await expect(page).toHaveURL(/\/guru$/);
  const claim = await page.request.post("/api/v1/sample/control", {
    headers: { Origin: origin },
    data: { takeover: true },
  });
  expect(claim.ok()).toBe(true);
}
async function noHorizontalOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth - innerWidth,
    ),
  ).toBeLessThanOrEqual(1);
}
async function showActivity(preview: Locator, page: Page) {
  await preview.scrollIntoViewIfNeeded();
  await page.evaluate(() => document.fonts.ready);
  await expect
    .poll(async () => {
      const next = preview.getByRole("button", { name: "Bagian berikutnya" });
      if ((await next.isVisible()) && (await next.isEnabled())) {
        await next.click();
        return false;
      }
      return preview.locator(".library-work-area").evaluate((el) => {
        const body = el.closest(".library-item-body")!;
        return (
          !el.hasAttribute("hidden") &&
          body.clientHeight > 0 &&
          body.scrollHeight <= body.clientHeight + 1 &&
          body.scrollWidth <= body.clientWidth + 1
        );
      });
    })
    .toBe(true);
}

for (const viewport of [
  { width: 360, height: 800 },
  { width: 390, height: 844 },
  { width: 1366, height: 768 },
]) {
  test(`Polish T01/T05/T06: examples fill forms and use real previews at ${viewport.width}x${viewport.height}`, async ({
    page,
  }, info) => {
    test.setTimeout(60000);
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.setViewportSize(viewport);
    await sample(page);
    await expect(
      page.getByRole("navigation", { name: "Menu utama" }).locator("svg"),
    ).toHaveCount(5);
    await expect(
      page
        .getByRole("navigation", { name: "Menu utama" })
        .getByRole("link", { name: "Latihan & AI", exact: true }),
    ).toBeVisible();
    await noHorizontalOverflow(page);
    await page.screenshot({
      path: info.outputPath("guru.png"),
      fullPage: false,
    });
    await page.goto("/guru/soal/baru");
    await page
      .getByLabel("Nama kumpulan", { exact: true })
      .fill("Contoh alat untuk guru");
    await page
      .getByRole("combobox", { name: "Jenis kumpulan", exact: true })
      .selectOption("interactive");
    await page
      .getByRole("button", { name: "Tambah soal", exact: true })
      .click();
    const question = page.getByRole("article", { name: "Soal 1", exact: true });
    const cases = [
      {
        kind: "number-line",
        example: "5 langkah ke kanan",
        field: "Perpindahan",
        value: "5",
        text: "Mulai dari −3. Geser 5 langkah ke kanan. Tekan Jalankan.",
      },
      {
        kind: "fractions",
        example: "Warnai setengah",
        field: "Penyebut 1",
        value: "2",
        text: "Bagi batang menjadi 2 bagian sama panjang. Ketuk satu bagian untuk mewarnai 1/2. Tekan Jalankan.",
      },
      {
        kind: "balance",
        example: "x + 4 = 9",
        field: "Konstanta sisi kanan",
        value: "9",
        text: "Temukan nilai x pada x + 4 = 9. Jaga kedua sisi timbangan seimbang. Tekan Jalankan.",
      },
    ];
    for (const c of cases) {
      await question
        .getByRole("combobox", { name: "Aktivitas", exact: true })
        .selectOption(c.kind);
      await question.getByText("Lihat contoh", { exact: true }).click();
      await question
        .getByRole("button", { name: c.example, exact: true })
        .click();
      await expect(
        question.getByRole("textbox", { name: "Pertanyaan", exact: true }),
      ).toHaveValue(c.text);
      await expect(question.getByLabel(c.field, { exact: true })).toHaveValue(
        c.value,
      );
      await expect(question.locator(".activity-icon svg")).toHaveCount(1);
      await question
        .getByRole("button", { name: "Preview soal 1", exact: true })
        .click();
      const preview = page.getByRole("region", {
        name: "Pratinjau soal",
        exact: true,
      });
      await showActivity(preview, page);
      await expect(preview.locator(`[data-tool="${c.kind}"]`)).toBeVisible();
      if (c.kind === "number-line") {
        await preview.getByLabel("Besar lompatan").fill("5");
        await preview
          .getByRole("button", { name: "Lompat", exact: true })
          .click();
        await expect(preview.getByTestId("number-position")).toHaveText(
          "Posisi 2",
        );
        await question.getByLabel("Perpindahan", { exact: true }).fill("0");
        await expect(preview.getByRole("status")).toContainText(
          "Periksa isian",
        );
        await question.getByLabel("Perpindahan", { exact: true }).fill("4");
        await question
          .getByRole("textbox", { name: "Pertanyaan", exact: true })
          .fill("Mulai dari −3. Geser 4 langkah ke kanan. Tekan Jalankan.");
        await showActivity(preview, page);
        await expect(preview.getByTestId("number-position")).toHaveText(
          "Posisi −3",
        );
        await preview.getByLabel("Besar lompatan").fill("4");
        await preview
          .getByRole("button", { name: "Lompat", exact: true })
          .click();
        await preview
          .getByRole("button", { name: "Jalankan", exact: true })
          .click();
        await expect(
          preview.locator(".board-tool > [role=status]"),
        ).toContainText("Model sudah sesuai");
      }
      if (c.kind === "fractions") {
        await preview
          .getByRole("button", { name: "Batang 1 bagian 1", exact: true })
          .click();
        await expect(preview.getByTestId("fraction-values")).toHaveText("1/2");
        const part = (await preview
          .getByRole("button", { name: "Batang 1 bagian 2", exact: true })
          .boundingBox())!;
        const area = (await preview.boundingBox())!;
        expect(part.x + part.width).toBeLessThanOrEqual(area.x + area.width);
      }
      if (c.kind === "balance") {
        await preview.getByLabel("Nilai operasi timbangan").fill("4");
        await preview
          .getByRole("button", { name: "Kurangi kedua ruas", exact: true })
          .click();
        await preview
          .getByRole("button", { name: "Jalankan", exact: true })
          .click();
        await expect(
          preview.locator(".board-tool > [role=status]"),
        ).toContainText("Model sudah sesuai");
        await preview.getByTestId("balance-drop").scrollIntoViewIfNeeded();
      }
      await noHorizontalOverflow(page);
      await preview.scrollIntoViewIfNeeded();
      await page.screenshot({
        path: info.outputPath(`${c.kind}-preview.png`),
        fullPage: false,
      });
      await page
        .getByRole("button", { name: "Tutup preview", exact: true })
        .click();
    }
    await question
      .getByRole("combobox", { name: "Aktivitas", exact: true })
      .selectOption("writing");
    await question.getByText("Lihat contoh", { exact: true }).click();
    await question
      .getByRole("button", { name: "Gambar setengah", exact: true })
      .click();
    await question
      .getByRole("button", { name: "Preview soal 1", exact: true })
      .click();
    await showActivity(
      page.getByRole("region", { name: "Pratinjau soal", exact: true }),
      page,
    );
    await expect(page.getByLabel("Bidang tulis sementara")).toBeVisible();
    await page
      .getByRole("button", { name: "Tutup preview", exact: true })
      .click();
    await expect(page.getByLabel("Nama kumpulan", { exact: true })).toHaveValue(
      "Contoh alat untuk guru",
    );
    await noHorizontalOverflow(page);
    expect(errors).toEqual([]);
  });

  test(`Polish T03/T04: pairing CTA is bounded and phone control has one entry at ${viewport.width}x${viewport.height}`, async ({
    page,
    browser,
  }, info) => {
    test.setTimeout(60000);
    await page.setViewportSize(viewport);
    await sample(page);
    const state = libraryStateSchema.parse(
      await (
        await page.request.post("/api/v1/library", {
          headers: { Origin: origin },
          data: { action: "list" },
        })
      ).json(),
    );
    const set = state.collections.find(
      (c) =>
        c.source === "system" &&
        c.document.title === "Petualangan Bilangan Bulat",
    )!;
    await page.goto(`/guru/mulai?collection=${set.id}`);
    await page
      .getByRole("combobox", { name: "Kelas", exact: true })
      .selectOption({ label: "7B" });
    await page
      .getByRole("button", { name: /^(Mulai sesi|Lanjutkan sesi)$/ })
      .click();
    await expect(page).toHaveURL(/\/guru\/sesi\//);
    const button = page.getByRole("button", {
      name: "Hubungkan papan",
      exact: true,
    });
    const box = (await button.boundingBox())!;
    expect(box.height).toBeGreaterThanOrEqual(48);
    expect(box.height).toBeLessThanOrEqual(56);
    expect(box.width).toBeLessThanOrEqual(220);
    await noHorizontalOverflow(page);
    const ctx = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      baseURL: origin,
    });
    const board = await ctx.newPage();
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    board.on("pageerror", (e) => errors.push(e.message));
    try {
      await openBoard(board);
      const code = (
        await board.getByTestId("pairing-code").innerText()
      ).replace(/\s/g, "");
      await page.getByLabel("Kode pasangan", { exact: true }).fill(code);
      await button.click();
      await expect(board.getByTestId("library-board")).toBeVisible();
      const entry = page
        .locator("summary")
        .filter({ hasText: /^Kendali dari HP$/ });
      await expect(entry).toHaveCount(1);
      await entry.click();
      const control = entry.locator("..");
      await expect(
        control.getByRole("heading", {
          name: "Gerakkan alat di papan",
          exact: true,
        }),
      ).toBeVisible();
      await expect(control.locator("details")).toHaveCount(0);
      await control
        .getByRole("button", { name: "Aktifkan kendali alat", exact: true })
        .click();
      await expect(control.getByRole("status")).toContainText("Kendali aktif");
      await control.scrollIntoViewIfNeeded();
      await page.screenshot({
        path: info.outputPath("phone-controls.png"),
        fullPage: false,
      });
      await noHorizontalOverflow(page);
      expect(errors).toEqual([]);
      await page
        .getByRole("button", { name: "Putuskan layar", exact: true })
        .click();
      await expect(board.getByTestId("library-board")).toHaveCount(0);
    } finally {
      await ctx.close();
    }
  });
}
