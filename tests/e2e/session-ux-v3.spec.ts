import { expect, test, type Page, type Locator } from "@playwright/test";
import QRCode from "qrcode";
import { openBoard } from "../browser/helpers";
import {
  collectionSchema,
  runSchema,
  runDetailSchema,
} from "../../src/contracts/library";
import type { PublicTool } from "../../src/contracts/tools";
const origin = "http://127.0.0.1:3100";
async function call(page: Page, data: object) {
  const response = await page.request.post("/api/v1/library", {
    headers: { Origin: origin },
    data,
  });
  expect(response.ok(), await response.text()).toBe(true);
  return response.json();
}
async function sample(page: Page) {
  await page.goto("/masuk");
  await expect(page.getByText("Tampilan nyaman", { exact: true })).toHaveCount(
    0,
  );
  await page
    .getByRole("button", { name: "Coba dengan data contoh", exact: true })
    .click();
  await expect(page).toHaveURL(/\/guru$/);
  expect(
    (
      await page.request.post("/api/v1/sample/control", {
        headers: { Origin: origin },
        data: { takeover: true },
      })
    ).ok(),
  ).toBe(true);
  await expect(page.getByText("Tampilan nyaman", { exact: true })).toHaveCount(
    0,
  );
}
const tools: PublicTool[] = [
  {
    kind: "number-line",
    origin: { numerator: -1, denominator: 1 },
    delta: { numerator: 4, denominator: 1 },
    orientation: "horizontal",
  },
  {
    kind: "fractions",
    operation: "add",
    left: { numerator: 1, denominator: 2 },
    right: { numerator: 1, denominator: 3 },
  },
  { kind: "ratio", baseX: 2, baseY: 3, targetX: 6 },
  { kind: "algebra", groups: 2, xPerGroup: 1, constantPerGroup: 3 },
  {
    kind: "balance",
    left: { x: 2, constant: 3 },
    right: { x: 0, constant: 11 },
  },
  {
    kind: "graphs",
    mode: "linear",
    domain: { minX: -5, maxX: 5, minY: -12, maxY: 12 },
    lines: [{ m: 2, b: 1 }],
    goal: { type: "value", x: 3 },
  },
];
async function createRun(
  page: Page,
  batch: PublicTool[],
  writing = false,
  cards = false,
) {
  const { classes } = await (
    await page.request.get("/api/v1/classes?mode=demo")
  ).json();
  const collection = collectionSchema.parse(
    await call(page, {
      action: "save",
      id: crypto.randomUUID(),
      revision: 0,
      ready: true,
      document: {
        title: "QA sintetis · preview HP",
        kind: cards ? "cards" : "interactive",
        items: cards
          ? [
              {
                id: crypto.randomUUID(),
                kind: "card",
                prompt: "Berapa 1/2 + 1/2?",
                options: ["1", "2", "1/4", "0"],
                key: "A",
                explanation: "Dua setengah menjadi satu utuh.",
              },
            ]
          : [
              ...batch.map((tool) => ({
                id: crypto.randomUUID(),
                kind: "interactive",
                prompt:
                  tool.kind === "number-line"
                    ? "Jelaskan gerak dari −1 ke 3."
                    : `Coba alat ${tool.kind}.`,
                tool,
              })),
              ...(writing
                ? [
                    {
                      id: crypto.randomUUID(),
                      kind: "writing",
                      prompt: "Tuliskan alasanmu.",
                    },
                  ]
                : []),
            ],
      },
    }),
  );
  return runSchema.parse(
    await call(page, {
      action: "start",
      id: crypto.randomUUID(),
      classId: classes.find((c: { label: string }) => c.label === "7B").id,
      collectionId: collection.id,
      version: collection.version,
      date: "2026-10-03",
      mode: "teach",
    }),
  );
}
async function cameraQr(page: Page, value: string) {
  const url = await QRCode.toDataURL(value, {
    width: 512,
    margin: 4,
    errorCorrectionLevel: "M",
  });
  await page.evaluate(async (url) => {
    const image = new Image();
    image.src = url;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 512;
    canvas.getContext("2d")!.drawImage(image, 0, 0);
    navigator.mediaDevices.getUserMedia = async () => {
      const stream = canvas.captureStream(10);
      const timer = setInterval(
        () => canvas.getContext("2d")!.drawImage(image, 0, 0),
        100,
      );
      for (const track of stream.getTracks()) {
        const stop = track.stop.bind(track);
        track.stop = () => {
          clearInterval(timer);
          stop();
        };
      }
      return stream;
    };
  }, url);
}
async function fits(page: Page, preview: Locator) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
  expect(
    await preview
      .locator(".library-item-body")
      .evaluate(
        (el) =>
          el.scrollWidth <= el.clientWidth + 1 &&
          el.scrollHeight <= el.clientHeight + 1,
      ),
  ).toBe(true);
  expect(
    await preview
      .locator("button")
      .evaluateAll((nodes) =>
        nodes
          .filter((el) => el.getBoundingClientRect().width > 0)
          .every((el) => el.getBoundingClientRect().height >= 47.5),
      ),
  ).toBe(true);
}
for (const width of [360, 390])
  test(`Session phone ${width}: six previews + writing fit and retain real math`, async ({
    page,
  }, info) => {
    test.setTimeout(120000);
    await page.setViewportSize({ width, height: 844 });
    await sample(page);
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    for (const [index, batch] of [
      tools.slice(0, 4),
      tools.slice(4),
    ].entries()) {
      const run = await createRun(page, batch, index === 1);
      await page.goto(`/guru/sesi/${run.id}`);
      await page
        .getByRole("button", { name: "Preview papan", exact: true })
        .click();
      const preview = page.locator("[data-library-preview]");
      for (const tool of batch) {
        await expect(
          preview.locator(`[data-tool="${tool.kind}"]`),
        ).toBeVisible();
        await expect(
          preview.getByRole("navigation", { name: "Bagian soal" }),
        ).toHaveCount(0);
        await fits(page, preview);
        if (tool.kind === "number-line") {
          const rail = preview.getByRole("img", {
            name: "Garis bilangan mendatar",
          });
          await rail.scrollIntoViewIfNeeded();
          await expect
            .poll(() =>
              rail.locator("text").evaluateAll((nodes) => {
                const boxes = nodes
                  .map((el) => el.getBoundingClientRect())
                  .sort((a, b) => a.x - b.x);
                return boxes.every(
                  (box, i) => !i || box.left >= boxes[i - 1].right + 1,
                );
              }),
            )
            .toBe(true);
          await preview.getByLabel("Besar lompatan").fill("4");
          await preview
            .getByRole("button", { name: "Lompat", exact: true })
            .click();
          await expect(preview.getByTestId("number-position")).toHaveText(
            "Posisi 3",
          );
          // A tool gesture changes its model, never advances the teacher's question.
          await expect(
            page.locator(".studio-session-progress"),
          ).toHaveAttribute("aria-label", "Soal 1 dari 4");
        }
        if (tool.kind === "fractions") {
          for (const row of await preview.locator(".fraction-row").all()) {
            const controls = await row.evaluate((el) => {
              const boxes = [
                el.querySelector(":scope > div:first-child button")!,
                el.querySelector(":scope > div:last-child label")!,
                el.querySelector(":scope > div:last-child button")!,
              ].map((control) => control.getBoundingClientRect());
              const bounds = el.getBoundingClientRect();
              return boxes.every(
                (box, index) =>
                  box.left >= bounds.left - 1 &&
                  box.right <= bounds.right + 1 &&
                  (!index || box.left >= boxes[index - 1].right + 2),
              );
            });
            expect(controls, "Fraction controls never overlap").toBe(true);
          }
          const lengths = await preview
            .locator('[data-testid^="fraction-whole-"]')
            .evaluateAll((nodes) =>
              nodes.map((el) => el.getBoundingClientRect().width),
            );
          expect(
            Math.max(...lengths) - Math.min(...lengths),
          ).toBeLessThanOrEqual(1);
          await preview
            .getByRole("button", { name: "Batang 1 bagian 1", exact: true })
            .click();
          await expect(
            preview.getByRole("button", {
              name: "Batang 1 bagian 1",
              exact: true,
            }),
          ).toHaveAttribute("aria-pressed", "true");
        }
        if (tool.kind === "ratio")
          expect(await preview.locator(".ratio-object").count()).toBe(5);
        if (tool.kind === "graphs") {
          await preview
            .getByLabel("Seret titik uji grafik")
            .press("ArrowRight");
          await expect(preview.getByTestId("graph-point")).toContainText("1/4");
        }
        await preview.screenshot({ path: info.outputPath(`${tool.kind}.png`) });
        const next = page.getByRole("button", {
          name: "Soal berikutnya",
          exact: true,
        });
        if (batch.indexOf(tool) < batch.length - 1 || index === 1) {
          await expect(next).toBeEnabled();
          await next.click();
          await expect(
            preview.locator(`[data-tool="${tool.kind}"]`),
          ).toHaveCount(0);
        }
      }
      if (index === 1) {
        await expect(
          preview.getByLabel("Bidang tulis sementara"),
        ).toBeVisible();
        await fits(page, preview);
      }
    }
    const cards = await createRun(page, [], false, true);
    await page.goto(`/guru/sesi/${cards.id}`);
    await page
      .getByRole("button", { name: "Preview papan", exact: true })
      .click();
    const cardPreview = page.locator("[data-library-preview]");
    await expect(cardPreview.locator(".library-options li")).toHaveCount(5);
    await expect(
      cardPreview.getByText("Kunci untuk guru", { exact: false }),
    ).toHaveCount(0);
    await fits(page, cardPreview);
    expect(errors).toEqual([]);
  });
test("QR pixels connect once automatically; ACK collapses controls, disconnect restores them, close succeeds or stays retryable", async ({
  page,
  browser,
}) => {
  test.setTimeout(120000);
  await page.setViewportSize({ width: 390, height: 844 });
  await sample(page);
  const run = await createRun(page, tools.slice(0, 2));
  await page.goto(`/guru/sesi/${run.id}`);
  const context = await browser.newContext({
    baseURL: origin,
    viewport: { width: 1280, height: 720 },
  });
  const board = await context.newPage();
  try {
    await openBoard(board);
    const trigger = board.locator(".board-menu summary");
    const box = (await trigger.boundingBox())!;
    expect(box.height).toBeGreaterThanOrEqual(48);
    expect(box.height).toBeLessThanOrEqual(56);
    await trigger.click();
    await expect(
      board.getByRole("button", { name: "Tes Kemampuan Papan", exact: true }),
    ).toBeVisible();
    await trigger.click();
    const code = (await board.getByTestId("pairing-code").innerText()).replace(
      /\s/g,
      "",
    );
    // jsQR, acquisition, claim RPC, board ACK and SQL execute normally.
    await cameraQr(page, code);
    let claims = 0;
    page.on("request", (r) => {
      if (
        r.url().endsWith("/api/v1/pairing") &&
        r.postDataJSON()?.action === "claim"
      )
        claims++;
    });
    await page.getByRole("button", { name: "Pindai QR", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Layar tersambung", exact: true }),
    ).toBeVisible({ timeout: 20000 });
    await expect(board.getByTestId("library-board")).toBeVisible();
    expect(claims).toBe(1);
    await expect(page.getByLabel("Kode pasangan")).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Pindai QR", exact: true }),
    ).toHaveCount(0);
    await page
      .getByRole("button", { name: "Putuskan layar", exact: true })
      .click();
    await expect(page.getByLabel("Kode pasangan")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Pindai QR", exact: true }),
    ).toBeVisible();
    await expect(board.getByTestId("library-board")).toHaveCount(0);
    // Horizontal navigation is confined to the strip, with revision guards.
    const strip = page.locator(".session-swipe-strip");
    await strip.scrollIntoViewIfNeeded();
    const first = await strip.boundingBox();
    await page.mouse.move(first!.x + first!.width - 10, first!.y + 10);
    await page.mouse.down();
    await page.mouse.move(first!.x + 20, first!.y + 10);
    await page.mouse.up();
    await expect(page.locator(".studio-session-progress")).toHaveAttribute(
      "aria-label",
      "Soal 2 dari 2",
    );
    let attempts = 0;
    await page.route("**/api/v1/library", async (route) => {
      if (route.request().postDataJSON()?.action !== "close")
        return route.continue();
      attempts++;
      if (attempts === 1) return route.fulfill({ status: 503, body: "{}" });
      await new Promise((resolve) => setTimeout(resolve, 250));
      await route.continue();
    });
    page.on("dialog", (dialog) => void dialog.accept());
    const end = page.getByRole("button", { name: "Akhiri sesi", exact: true });
    await end.click();
    await expect(
      page.getByRole("status").filter({ hasText: "Sesi belum dapat diakhiri" }),
    ).toBeVisible();
    await expect(page).toHaveURL(`/guru/sesi/${run.id}`);
    await expect(end).toBeEnabled();
    await end.click();
    await expect(
      page.getByRole("button", { name: "Mengakhiri sesi…", exact: true }),
    ).toBeDisabled();
    await expect(page).toHaveURL(/\/guru$/);
    expect(attempts).toBe(2);
    expect(
      runDetailSchema.parse(await call(page, { action: "detail", id: run.id }))
        .run.status,
    ).toBe("closed");
    await page.unrouteAll({ behavior: "wait" });
  } finally {
    await context.close();
  }
});

test("Scanned link waits for an active session, then connects once without manual submit", async ({
  page,
  browser,
}) => {
  test.setTimeout(60000);
  await page.setViewportSize({ width: 390, height: 844 });
  await sample(page);
  const run = await createRun(page, tools.slice(0, 1));
  const context = await browser.newContext({
    baseURL: origin,
    viewport: { width: 1280, height: 720 },
  });
  const board = await context.newPage();
  try {
    await openBoard(board);
    const code = (await board.getByTestId("pairing-code").innerText()).replace(
      /\s/g,
      "",
    );
    let claims = 0;
    page.on("request", (r) => {
      if (
        r.url().endsWith("/api/v1/pairing") &&
        r.postDataJSON()?.action === "claim"
      )
        claims++;
    });
    await page.evaluate(
      (code) =>
        sessionStorage.setItem(
          "pn-pair-challenge-v1",
          JSON.stringify({ code, expiresAt: Date.now() + 60000 }),
        ),
      code,
    );
    expect(claims).toBe(0);
    await page.goto(`/guru/sesi/${run.id}`);
    await expect(
      page.getByRole("heading", { name: "Layar tersambung", exact: true }),
    ).toBeVisible({ timeout: 20000 });
    expect(claims).toBe(1);
    await expect(page.getByLabel("Kode pasangan")).toHaveCount(0);
    await page
      .getByRole("button", { name: "Putuskan layar", exact: true })
      .click();
    await expect(page.getByLabel("Kode pasangan")).toHaveValue("");
  } finally {
    await context.close();
  }
});
test("Foreign QR stays local and camera denial leaves manual pairing usable", async ({
  page,
}) => {
  test.setTimeout(60000);
  await page.setViewportSize({ width: 360, height: 800 });
  await sample(page);
  const run = await createRun(page, tools.slice(0, 1));
  await page.goto(`/guru/sesi/${run.id}`);
  let claims = 0,
    foreignRequests = 0;
  page.on("request", (r) => {
    if (
      r.url().endsWith("/api/v1/pairing") &&
      r.postDataJSON()?.action === "claim"
    )
      claims++;
    if (r.url().includes("outside.qa.invalid")) foreignRequests++;
  });
  await cameraQr(page, "https://outside.qa.invalid/guru?pair=123456");
  await page.getByRole("button", { name: "Pindai QR", exact: true }).click();
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "QR ini bukan kode layar aplikasi ini" }),
  ).toBeVisible();
  expect(claims).toBe(0);
  expect(foreignRequests).toBe(0);
  await page
    .getByRole("button", { name: "Tutup kamera · masukkan kode", exact: true })
    .click();
  await page.evaluate(() => {
    navigator.mediaDevices.getUserMedia = async () => {
      throw new DOMException("Synthetic camera denial", "NotAllowedError");
    };
  });
  await page.getByRole("button", { name: "Pindai QR", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Kamera belum dapat dibuka" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Tutup kamera · masukkan kode", exact: true })
    .click();
  await page.getByLabel("Kode pasangan").fill("123456");
  await expect(
    page.getByRole("button", { name: "Hubungkan papan", exact: true }),
  ).toBeEnabled();
  expect(claims).toBe(0);
});
