import { test, expect, type Page, type TestInfo } from "@playwright/test";
import {
  libraryBoardSchema,
  type LibraryBoardState,
} from "../../src/contracts/library";
import { snapshotSchema } from "../../src/contracts/presentation";
import { loginTeacher } from "../browser/helpers";
import type { PublicTool } from "../../src/contracts/tools";
import { INTERACTIVE_HELP } from "../../src/features/library/templates";

const fixtureId = "7b000001-0000-4000-8000-000000000099";
const legacyCapabilities = {
  schemaVersion: 1,
  touches: 1,
  pointerEvents: true,
  indexedDb: true,
  serviceWorker: true,
  width: 1920,
  heightPixels: 1080,
  browser: "chromium",
  major: 140,
  samples: 0,
  medianMs: null,
  p95Ms: null,
  height: "normal",
  durationSeconds: 10,
};
async function storedBoard(
  page: Page,
  preset = "balanced",
  allowMotion = false,
) {
  await page.addInitScript(
    ({ capabilities, preset, id }) => {
      localStorage.setItem(
        "pn-board-capabilities-v1",
        JSON.stringify(capabilities),
      );
      localStorage.setItem(
        "pn-board-appearance-v1",
        JSON.stringify({
          schemaVersion: 1,
          displayKey: id,
          displayName: "",
          settings: { preset, interactionZone: "auto" },
        }),
      );
    },
    {
      capabilities: {
        ...legacyCapabilities,
        samples: allowMotion ? 20 : 0,
        medianMs: allowMotion ? 5 : null,
        p95Ms: allowMotion ? 10 : null,
      },
      preset,
      id: fixtureId,
    },
  );
}
// UI-only transport fixtures. These tests neither claim live pairing coverage
// nor write teacher/session data while the integration workers use the DB.
async function boardFixture(page: Page, library?: () => LibraryBoardState) {
  const snapshot = snapshotSchema.parse({
    envelope: {
      protocolVersion: 1,
      presentationId: fixtureId,
      channelEpoch: fixtureId,
      revision: 1,
      commandId: fixtureId,
      packageVersion: "prelim-7b-v1",
      payload: {
        schemaVersion: 1,
        mode: "check",
        question: 1,
        taskEpoch: fixtureId,
        groups: [],
      },
    },
    ackRevision: 1,
    ackCommandId: fixtureId,
    ackAt: new Date().toISOString(),
  });
  await page.route("**/api/v1/board/identity", (route) =>
    route.fulfill({ json: { id: fixtureId, role: "board" } }),
  );
  await page.route("**/api/v1/board/content", (route) =>
    route.fulfill({
      json: {
        packet: null,
        cached: false,
        packetVersion: 0,
        proposal: null,
        proposalStale: false,
        resolution: null,
      },
    }),
  );
  await page.route("**/api/v1/board/pairing", async (route) => {
    const { action } = route.request().postDataJSON();
    const now = new Date().toISOString();
    const json =
      action === "resume"
        ? { snapshot: library ? snapshot : null }
        : action === "create"
          ? {
              id: fixtureId,
              code: "123456",
              expiresAt: new Date(Date.now() + 600000).toISOString(),
              pairingUrl: null,
            }
          : action === "status"
            ? { presentationId: null, expired: false }
            : action === "snapshot"
              ? snapshot
              : action === "channel"
                ? { kind: "snapshot" }
                : action === "heartbeat"
                  ? {
                      channelEpoch: fixtureId,
                      revision: 1,
                      ackRevision: 1,
                      ackCommandId: fixtureId,
                      ackAt: now,
                      controllerSeenAt: now,
                      serverNow: now,
                    }
                  : { accepted: true };
    await route.fulfill({ json });
  });
  await page.route("**/api/v1/board/library", (route) =>
    route.fulfill({
      json: library ? libraryBoardSchema.parse(library()) : null,
    }),
  );
}

const longPrompt =
  "Sebuah lift bergerak dari lantai bawah menuju lantai atas. Jelaskan perpindahannya dengan membandingkan titik awal dan titik akhir, kemudian pilih alasan yang sesuai. "
    .repeat(3)
    .slice(0, 400);
const longOptions = ["A", "B", "C", "D"].map((label) =>
  `${label}: Perpindahan lift dapat diperiksa pada garis bilangan. ${"Perhatikan arah gerak dan hitung jarak dari titik awal secara berurutan. ".repeat(6)}`.slice(
    0,
    400,
  ),
) as [string, string, string, string];
function libraryItem(item: LibraryBoardState["item"]): LibraryBoardState {
  return libraryBoardSchema.parse({
    id: fixtureId,
    title: "Soal contoh tampilan",
    position: 0,
    total: 1,
    revision: 1,
    status: "active",
    item,
  });
}
async function readablePage(page: Page) {
  const geometry = await page
    .locator(".library-item-body")
    .evaluate((element) => {
      const body = element.getBoundingClientRect();
      const copy = element
        .querySelector(".library-reading-copy:not([hidden])")
        ?.getBoundingClientRect();
      return {
        height: element.clientHeight,
        scroll: element.scrollHeight,
        width: element.clientWidth,
        scrollWidth: element.scrollWidth,
        copyBottom: copy?.bottom ?? body.top,
        bottom: body.bottom,
      };
    });
  expect(geometry.scroll).toBeLessThanOrEqual(geometry.height + 1);
  expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.width + 1);
  expect(geometry.copyBottom).toBeLessThanOrEqual(geometry.bottom + 1);
}

for (const viewport of [
  { width: 1280, height: 720 },
  { width: 1366, height: 768 },
  { width: 1920, height: 1080 },
]) {
  test(`V1 400-character prompt and four options remain complete and bounded at ${viewport.width}x${viewport.height}`, async ({
    page,
  }, info) => {
    await page.setViewportSize(viewport);
    await storedBoard(page);
    await boardFixture(page, () =>
      libraryItem({
        id: fixtureId,
        kind: "card",
        prompt: longPrompt,
        options: longOptions,
      }),
    );
    await page.goto("/layar");
    await expect(page.getByTestId("library-board")).toBeVisible();
    await expect(page.locator(".board-menu")).not.toHaveAttribute("open");
    for (const preset of ["Ringkas", "Seimbang", "Besar"]) {
      await page
        .getByRole("button", { name: "Ubah tampilan", exact: true })
        .click();
      await page
        .getByRole("button", { name: new RegExp(`^${preset}`) })
        .click();
      await page
        .getByRole("button", { name: "Simpan tampilan", exact: true })
        .click();
      const next = page.getByRole("button", { name: "Bagian berikutnya" });
      const back = page.getByRole("button", { name: "Bagian sebelumnya" });
      while (await back.isEnabled()) await back.click();
      await expect(next).toBeEnabled();
      const texts: Record<string, string> = {};
      for (let index = 0; index < 100; index++) {
        const label = (await page
          .locator(".library-page-label")
          .textContent())!;
        const text = (await page
          .locator(".library-reading-copy:not([hidden]) .library-reading-text")
          .textContent())!;
        texts[label] = (texts[label] ?? "") + text;
        await bounded(page);
        await readablePage(page);
        if (index === 0 || (label === "Pilihan A" && texts[label] === text))
          await screenshot(
            page,
            info,
            `${preset}-${index === 0 ? "prompt" : "option-A"}`,
          );
        if (await next.isDisabled()) break;
        await next.click();
      }
      expect(texts["Pertanyaan"]).toBe(longPrompt);
      for (const [index, label] of ["A", "B", "C", "D"].entries())
        expect(texts[`Pilihan ${label}`]).toBe(longOptions[index]);
      expect(texts["Pilihan ?"]).toBe("? · Belum tahu");
    }
  });
}

const tools: PublicTool[] = [
  {
    kind: "number-line",
    origin: { numerator: -2, denominator: 1 },
    delta: { numerator: 7, denominator: 1 },
    orientation: "vertical",
  },
  {
    kind: "fractions",
    operation: "represent",
    left: { numerator: 3, denominator: 4 },
    right: { numerator: 0, denominator: 2 },
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
async function activityPage(page: Page) {
  const next = page.getByRole("button", { name: "Bagian berikutnya" });
  await expect(next).toBeEnabled();
  while (await next.isEnabled()) await next.click();
  await expect(page.locator(".library-page-label")).toHaveText("Aktivitas");
}
test("V1 all six production tools fit the board after reading a long prompt", async ({
  page,
}, info) => {
  test.setTimeout(60000);
  let active = libraryItem({
    id: fixtureId,
    kind: "interactive",
    prompt: longPrompt,
    tool: tools[0],
  });
  await storedBoard(page, "large");
  await boardFixture(page, () => active);
  await page.goto("/layar");
  for (const viewport of [
    { width: 1280, height: 720 },
    { width: 1366, height: 768 },
    { width: 1920, height: 1080 },
  ]) {
    await page.setViewportSize(viewport);
    for (const tool of tools) {
      const itemId = crypto.randomUUID();
      active = {
        ...libraryItem({
          id: itemId,
          kind: "interactive",
          prompt: longPrompt,
          tool,
        }),
        revision: active.revision + 1,
      };
      await page.evaluate(() => window.dispatchEvent(new Event("online")));
      await expect(
        page.getByRole("button", { name: "Bagian berikutnya" }),
      ).toBeEnabled();
      await activityPage(page);
      await expect(page.locator(`[data-tool="${tool.kind}"]`)).toBeVisible();
      await bounded(page);
      await readablePage(page);
      await page
        .locator(".board-tool")
        .getByRole("button", { name: "Jalankan", exact: true })
        .click();
      await expect(page.locator(".board-tool > [role=status]")).toContainText(
        /\S/,
      );
      await expect(
        page.getByText("Tersimpan di papan", { exact: true }),
      ).toBeVisible();
      await bounded(page);
      await readablePage(page);
      await screenshot(
        page,
        info,
        `${tool.kind}-${viewport.width}x${viewport.height}`,
      );
    }
  }
});
test("V1 model and temporary ink survive reading pages and appearance edits", async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  let active = libraryItem({
    id: fixtureId,
    kind: "interactive",
    prompt: longPrompt,
    tool: tools[0],
  });
  await storedBoard(page);
  await boardFixture(page, () => active);
  await page.goto("/layar");
  await activityPage(page);
  await page.getByTestId("number-marker").focus();
  await page.keyboard.press("ArrowUp");
  await expect(page.getByTestId("number-position")).toContainText("−1");
  await page.getByRole("button", { name: "Bagian sebelumnya" }).click();
  await activityPage(page);
  await expect(page.getByTestId("number-position")).toContainText("−1");
  await page
    .getByRole("button", { name: "Ubah tampilan", exact: true })
    .click();
  await page.getByRole("button", { name: /^Besar/ }).click();
  await page
    .getByRole("button", { name: "Simpan tampilan", exact: true })
    .click();
  await expect(page.getByTestId("number-position")).toContainText("−1");
  active = {
    ...libraryItem({
      id: crypto.randomUUID(),
      kind: "writing",
      prompt: longPrompt,
    }),
    revision: active.revision + 1,
  };
  await page.evaluate(() => window.dispatchEvent(new Event("online")));
  await expect(
    page.getByRole("button", { name: "Bagian berikutnya" }),
  ).toBeEnabled();
  await activityPage(page);
  const pad = page.getByLabel("Bidang tulis sementara");
  const rect = (await pad.boundingBox())!;
  await page.mouse.move(rect.x + 30, rect.y + 30);
  await page.mouse.down();
  await page.mouse.move(rect.x + 150, rect.y + 70, { steps: 8 });
  await page.mouse.up();
  const pixels = () =>
    pad.evaluate((canvas: HTMLCanvasElement) =>
      canvas
        .getContext("2d")!
        .getImageData(0, 0, canvas.width, canvas.height)
        .data.reduce((sum, n) => sum + n, 0),
    );
  const before = await pixels();
  expect(before).toBeGreaterThan(0);
  await page.getByRole("button", { name: "Bagian sebelumnya" }).click();
  await activityPage(page);
  expect(await pixels()).toBe(before);
  await page
    .getByRole("button", { name: "Ubah tampilan", exact: true })
    .click();
  await page.getByRole("button", { name: "Batal", exact: true }).click();
  expect(await pixels()).toBe(before);
  await bounded(page);
  await readablePage(page);
  await screenshot(page, info, "writing-preserved");
  await page
    .getByRole("button", { name: "Hapus tulisan", exact: true })
    .click();
  expect(await pixels()).toBe(0);
});

for (const viewport of [
  { width: 390, height: 844 },
  { width: 1280, height: 720 },
]) {
  test(`V1 teacher preview uses Atkinson and readable pages at ${viewport.width}x${viewport.height}`, async ({
    page,
  }, info) => {
    await page.setViewportSize(viewport);
    await page.route("**/api/v1/teacher", (route) =>
      route.fulfill({ json: { id: fixtureId, role: "teacher" } }),
    );
    await page.route("**/api/v1/classes?*", (route) =>
      route.fulfill({ json: { classes: [] } }),
    );
    await page.route("**/api/v1/library", (route) =>
      route.fulfill({ json: { collections: [], runs: [], sample: false } }),
    );
    await loginTeacher(page);
    await page.goto("/guru/soal/baru");
    await page
      .getByLabel("Nama kumpulan", { exact: true })
      .fill("Pratinjau contoh");
    await page
      .getByRole("button", { name: "Tambah soal", exact: true })
      .click();
    await page.getByLabel("Pertanyaan", { exact: true }).fill(longPrompt);
    for (const [index, label] of ["A", "B", "C", "D"].entries())
      await page
        .getByLabel(`Pilihan ${label}`, { exact: true })
        .fill(longOptions[index]);
    await page
      .getByRole("button", { name: "Preview soal 1", exact: true })
      .click();
    const preview = page.locator("[data-library-preview]");
    await preview.evaluate((element) =>
      element.scrollIntoView({ block: "center" }),
    );
    await expect(
      preview.getByRole("button", { name: "Bagian berikutnya" }),
    ).toBeEnabled();
    expect(
      await preview.evaluate((element) => getComputedStyle(element).fontFamily),
    ).toContain("Atkinson Hyperlegible");
    expect(
      await page
        .getByLabel("Nama kumpulan", { exact: true })
        .evaluate((element) => getComputedStyle(element).fontFamily),
    ).toContain("Plus Jakarta Sans");
    await readablePage(page);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(viewport.width + 1);
    await screenshot(page, info, "teacher-preview-prompt");
    await preview.getByRole("button", { name: "Bagian berikutnya" }).click();
    await readablePage(page);
    await screenshot(page, info, "teacher-preview-next");
  });
}

const runtimeErrors = new WeakMap<Page, string[]>();
function watchRuntime(page: Page) {
  const errors: string[] = [];
  runtimeErrors.set(page, errors);
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
}
test.beforeEach(async ({ page }) => {
  watchRuntime(page);
  await boardFixture(page);
});
test.afterEach(async ({ page }, info) => {
  const errors = runtimeErrors.get(page) ?? [];
  await info.attach("runtime-errors", {
    body: JSON.stringify(errors),
    contentType: "application/json",
  });
  if (!page.isClosed()) await screenshot(page, info, "final-viewport");
  expect(errors).toEqual([]);
});
async function screenshot(page: Page, info: TestInfo, name: string) {
  const path = info.outputPath(`${name}.png`);
  await page.screenshot({ path });
  await info.attach(name, { path, contentType: "image/png" });
}

async function bounded(page: Page) {
  const geometry = await page.evaluate(() => {
    const root = document.querySelector(".board-surface")!;
    const outside = [
      ...root.querySelectorAll("button,input,select,summary"),
    ].flatMap((element) => {
      const rect = element.getBoundingClientRect();
      if (
        !rect.width ||
        !rect.height ||
        getComputedStyle(element).visibility === "hidden"
      )
        return [];
      return rect.top < -1 ||
        rect.bottom > innerHeight + 1 ||
        rect.left < -1 ||
        rect.right > innerWidth + 1
        ? [
            element.getAttribute("aria-label") ||
              element.textContent?.trim() ||
              element.tagName,
          ]
        : [];
    });
    return {
      outside,
      height: innerHeight,
      scroll: document.documentElement.scrollHeight,
      width: innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
    };
  });
  expect(geometry.outside).toEqual([]);
  expect(geometry.scroll).toBeLessThanOrEqual(geometry.height + 1);
  expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.width + 1);
  return geometry;
}

for (const viewport of [
  { width: 1280, height: 720 },
  { width: 1366, height: 768 },
  { width: 1920, height: 1080 },
]) {
  test(`V1/V2 presets use production previews and bounded controls at ${viewport.width}x${viewport.height}`, async ({
    page,
  }, info) => {
    await page.setViewportSize(viewport);
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/layar");
    const setup = page.getByRole("region", { name: "Atur tampilan layar" });
    await expect(setup).toBeVisible();
    const sizes: number[] = [];
    for (const preset of ["Ringkas", "Seimbang", "Besar"]) {
      await setup
        .getByRole("button", { name: new RegExp(`^${preset}`) })
        .click();
      for (const example of ["Lift", "Pecahan", "Pilihan ganda"]) {
        await setup.getByRole("button", { name: example, exact: true }).click();
        const preview = setup.getByLabel("Pratinjau ukuran sebenarnya");
        await expect(preview.getByTestId("library-item")).toBeVisible();
        if (example === "Lift") {
          const marker = preview.getByTestId("number-marker");
          const visual = preview.getByTestId("number-marker-visual");
          await expect(marker).toBeVisible();
          await expect
            .poll(async () => (await visual.boundingBox())?.width ?? 0)
            .toBeGreaterThanOrEqual(31);
          const hit = (await marker.boundingBox())!;
          const dot = (await visual.boundingBox())!;
          expect(hit.width).toBeGreaterThanOrEqual(47.9);
          expect(hit.height).toBeGreaterThanOrEqual(47.9);
          expect(dot.width).toBeLessThanOrEqual(48.1);
          sizes.push(dot.width);
          await marker.focus();
          await page.keyboard.press("ArrowUp");
          await expect(preview.getByTestId("number-position")).toContainText(
            "−1",
          );
        } else if (example === "Pecahan") {
          await expect(
            preview.getByRole("region", { name: "Batang Pecahan" }),
          ).toBeVisible();
          await preview
            .getByLabel("Bagi batang 1", { exact: true })
            .selectOption("4");
          await preview
            .getByRole("button", { name: "Batang 1 bagian 1", exact: true })
            .click();
          await expect(preview.getByTestId("fraction-values")).toContainText(
            "1/4",
          );
        } else {
          await expect(
            preview.getByRole("heading", { name: "−3 − 5 = …" }),
          ).toBeVisible();
          await expect(preview.getByRole("listitem")).toHaveCount(5);
        }
        await bounded(page);
        await screenshot(page, info, `${preset}-${example.replace(" ", "-")}`);
      }
    }
    expect(sizes[0]).toBeLessThan(sizes[1]);
    expect(sizes[1]).toBeLessThan(sizes[2]);
    expect(errors).toEqual([]);
  });
}

test("V2 profile survives resize, reload and failed metadata upload; local fields stay off the wire", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  const sent: unknown[] = [];
  await page.route("**/api/v1/board/profile", async (route) => {
    sent.push(route.request().postDataJSON());
    await route.fulfill({ status: 503, body: "unavailable" });
  });
  await page.goto("/layar");
  await page.getByLabel("Nama layar", { exact: true }).fill("Papan 7B");
  await page.getByRole("button", { name: /^Ringkas/ }).click();
  await page
    .getByRole("button", { name: "Simpan tampilan", exact: true })
    .click();
  const panel = page.getByRole("region", {
    name: "Tes Kemampuan Papan",
    exact: true,
  });
  await panel
    .getByRole("button", { name: "Gunakan tanpa sentuhan", exact: true })
    .click();
  await panel
    .getByRole("button", { name: "Lewati · belum diukur", exact: true })
    .click();
  await panel.getByRole("button", { name: "Terjangkau", exact: true }).click();
  await panel
    .getByRole("button", { name: "Simpan profil papan", exact: true })
    .click();
  await expect.poll(() => sent.length).toBe(1);
  expect(sent[0]).toMatchObject({
    schemaVersion: 1,
    touches: 0,
    samples: 0,
    medianMs: null,
    p95Ms: null,
  });
  for (const name of [
    "displayKey",
    "displayName",
    "settings",
    "token",
    "groups",
  ])
    expect(sent[0]).not.toHaveProperty(name);
  const before = await page.evaluate(() =>
    localStorage.getItem("pn-board-appearance-v1"),
  );
  await page.reload();
  await expect(page.getByTestId("pairing-code")).toBeVisible();
  await expect(panel).toHaveCount(0);
  await expect(
    page.getByRole("region", { name: "Atur tampilan layar" }),
  ).toHaveCount(0);
  await page.setViewportSize({ width: 1920, height: 1080 });
  await expect(page.locator(".board-surface")).toHaveAttribute(
    "data-board-preset",
    "compact",
  );
  expect(
    await page.evaluate(() => localStorage.getItem("pn-board-appearance-v1")),
  ).toBe(before);
  await page
    .getByRole("button", { name: "Ubah tampilan", exact: true })
    .click();
  await expect(page.getByLabel("Nama layar", { exact: true })).toHaveValue(
    "Papan 7B",
  );
  await expect(page.getByRole("button", { name: /^Ringkas/ })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});

test("V2 touch result waits for release and fresh one/two/four contacts; mouse never passes", async ({
  browser,
}) => {
  const context = await browser.newContext({
    baseURL: "http://127.0.0.1:3100",
    viewport: { width: 1280, height: 720 },
    hasTouch: true,
  });
  const page = await context.newPage();
  const errors = watchRuntime(page);
  await boardFixture(page);
  await page.goto("/layar");
  await page
    .getByRole("button", { name: "Simpan tampilan", exact: true })
    .click();
  const panel = page.getByRole("region", {
    name: "Tes Kemampuan Papan",
    exact: true,
  });
  await panel
    .getByRole("button", { name: "Target sentuh 1", exact: true })
    .click();
  await expect(panel.getByRole("status")).toContainText(
    "Menunggu sentuhan jari",
  );
  const cdp = await context.newCDPSession(page);
  for (const [stage, n] of [1, 2, 4].entries()) {
    const points = [];
    for (let i = 0; i < n; i++) {
      const rect = (await panel
        .getByRole("button", { name: `Target sentuh ${i + 1}`, exact: true })
        .boundingBox())!;
      points.push({
        id: i + 1,
        x: rect.x + rect.width / 2,
        y: rect.y + rect.height / 2,
      });
    }
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: points,
    });
    await expect(panel.getByRole("status")).toContainText(
      "✓ Sentuhan bersamaan terbaca",
    );
    // Intentional duration: a held contact must not auto-pass after the result timer.
    await page.waitForTimeout(800);
    await expect(panel.getByLabel("Progres tes")).toHaveText(
      `Tahap ${stage + 1} dari 6`,
    );
    await bounded(page);
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    await expect(panel.getByLabel("Progres tes")).toHaveText(
      `Tahap ${stage + 2} dari 6`,
    );
    if (stage < 2)
      await expect(panel.getByRole("status")).toContainText(
        "Menunggu sentuhan jari",
      );
  }
  expect(errors).toEqual([]);
  await context.close();
});

test("V2 legacy capabilities migrate to balanced appearance without another wizard", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.addInitScript(() => {
    if (!localStorage.getItem("pn-board-capabilities-v1"))
      localStorage.setItem(
        "pn-board-capabilities-v1",
        JSON.stringify({
          schemaVersion: 1,
          touches: 1,
          pointerEvents: true,
          indexedDb: true,
          serviceWorker: true,
          width: 1920,
          heightPixels: 1080,
          browser: "chromium",
          major: 140,
          samples: 0,
          medianMs: null,
          p95Ms: null,
          height: "normal",
          durationSeconds: 10,
        }),
      );
  });
  await page.goto("/layar");
  await expect(page.getByTestId("pairing-code")).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Atur tampilan layar" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("region", { name: "Tes Kemampuan Papan", exact: true }),
  ).toHaveCount(0);
  const saved = await page.evaluate(() => ({
    capability: JSON.parse(localStorage.getItem("pn-board-capabilities-v1")!),
    appearance: JSON.parse(localStorage.getItem("pn-board-appearance-v1")!),
  }));
  expect(saved.capability).toMatchObject({
    schemaVersion: 1,
    touches: 1,
    width: 1920,
  });
  expect(saved.capability).not.toHaveProperty("displayKey");
  expect(saved.appearance).toMatchObject({
    schemaVersion: 1,
    settings: { preset: "balanced", interactionZone: "auto" },
  });
  await page
    .getByRole("button", { name: "Ubah tampilan", exact: true })
    .click();
  await expect(page.getByRole("button", { name: /^Seimbang/ })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});

test("V2 rejected storage retains settings during the tab without a repeated wizard", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.addInitScript(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (name, value) {
      if (
        name === "pn-board-appearance-v1" ||
        name === "pn-board-capabilities-v1"
      )
        throw new DOMException("Storage denied", "SecurityError");
      return original.call(this, name, value);
    };
  });
  await page.goto("/layar");
  await page.getByRole("button", { name: /^Besar/ }).click();
  await page
    .getByRole("button", { name: "Simpan tampilan", exact: true })
    .click();
  await expect(page.locator(".board-profile-notice")).toContainText(
    "berlaku di tab ini",
  );
  await page
    .getByRole("button", { name: "Ubah tampilan", exact: true })
    .click();
  await expect(page.getByRole("button", { name: /^Besar/ })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(
    page.getByRole("button", { name: "Batal", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Batal", exact: true }).click();
  await expect(page.locator(".board-surface")).toHaveAttribute(
    "data-board-preset",
    "large",
  );
  expect(
    await page.evaluate(() => localStorage.getItem("pn-board-appearance-v1")),
  ).toBeNull();
});

test("Polish T02: normal connection stays small, details remain accessible and save notice expires", async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await storedBoard(page);
  const item = INTERACTIVE_HELP["number-line"].templates[0].item;
  await boardFixture(page, () => libraryItem({ id: fixtureId, ...item }));
  await page.goto("/layar");
  const badge = page.getByTestId("board-connection");
  await expect(badge).toHaveText("Tersambung");
  const geometry = await badge.evaluate((el) => ({
    height: el.getBoundingClientRect().height,
    size: parseFloat(getComputedStyle(el).fontSize),
  }));
  expect(geometry.height).toBeLessThanOrEqual(28);
  expect(geometry.size).toBeLessThanOrEqual(18);
  const menu = page.locator(".board-menu");
  await menu.locator("summary").click();
  await expect(
    menu.getByRole("region", { name: "Status papan", exact: true }),
  ).toContainText("HP guru tersambung");
  await menu.locator("summary").click();
  await page
    .locator(".board-tool")
    .getByRole("button", { name: "Jalankan", exact: true })
    .click();
  const notice = page.getByText("Tersimpan di papan", { exact: true });
  await expect(notice).toBeVisible();
  await expect(notice).not.toBeVisible({ timeout: 5000 });
  await expect(page.locator(".board-tool > [role=status]")).toContainText(
    "Coba periksa",
  );
  await bounded(page);
  await page.screenshot({ path: info.outputPath("quiet-connected-board.png") });
});

test("Polish T02: a storage warning remains visible while the model still works", async ({
  page,
}) => {
  await storedBoard(page);
  await page.addInitScript(() => {
    Object.defineProperty(window, "indexedDB", {
      get() {
        throw new DOMException("Storage denied", "SecurityError");
      },
    });
  });
  const item = INTERACTIVE_HELP["number-line"].templates[0].item;
  await boardFixture(page, () => libraryItem({ id: fixtureId, ...item }));
  await page.goto("/layar");
  await expect(
    page.getByText("Simpan belum tersedia. Pertahankan tab ini.", {
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Lompat", exact: true }).click();
  await expect(page.getByTestId("number-position")).toHaveText("Posisi −2");
  await page.getByRole("button", { name: "Jalankan", exact: true }).click();
  const warning = page.getByText("Belum tersimpan. Pertahankan tab ini.", {
    exact: true,
  });
  await expect(warning).toBeVisible();
  await page.waitForTimeout(3400);
  await expect(warning).toBeVisible();
});

for (const motion of ["no-preference", "reduce"] as const) {
  test(`Polish T07: pointer/keyboard motion is accurate with ${motion}`, async ({
    page,
  }, info) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.emulateMedia({ reducedMotion: motion });
    // UI fixture timing enables animations; it is not a hardware measurement.
    await storedBoard(page, "balanced", true);
    const item = INTERACTIVE_HELP["number-line"].templates[0].item;
    await boardFixture(page, () => libraryItem({ id: fixtureId, ...item }));
    await page.goto("/layar");
    const marker = page.getByTestId("number-marker");
    await marker.focus();
    await marker.press("ArrowRight");
    await expect(page.getByTestId("number-position")).toHaveText("Posisi −2");
    const visual = page.getByTestId("number-marker-visual");
    const moving = page.locator(".number-line-visual");
    expect(
      await moving.evaluate((el) => getComputedStyle(el).transitionDuration),
    ).toBe(motion === "reduce" ? "0s" : "0.16s");
    // Sample the real animated geometry: the decorative face must follow the
    // visible marker throughout keyboard motion, including reduced motion.
    const offsets = await page.evaluate(async () => {
      const samples: number[] = [];
      for (let i = 0; i < 10; i++) {
        await new Promise<void>((resolve) =>
          requestAnimationFrame(() => resolve()),
        );
        const dot = document
          .querySelector('[data-testid="number-marker-visual"]')!
          .getBoundingClientRect();
        const face = document
          .querySelector(".number-line-face")!
          .getBoundingClientRect();
        samples.push(Math.abs(dot.x + dot.width / 2 - face.x - face.width / 2));
      }
      return samples;
    });
    expect(Math.max(...offsets)).toBeLessThan(1.5);
    const start = (await marker.boundingBox())!;
    const to = await marker.evaluate((el) => {
      const transform = (el.parentNode as SVGGElement).getScreenCTM()!;
      const point = new DOMPoint(660, 150).matrixTransform(transform);
      return { x: point.x, y: point.y };
    });
    await page.mouse.move(
      start.x + start.width / 2,
      start.y + start.height / 2,
    );
    await page.mouse.down();
    await page.mouse.move(to.x, to.y, { steps: 6 });
    await expect(visual).toHaveAttribute("data-dragging", "true");
    expect(
      await moving.evaluate((el) => getComputedStyle(el).transitionDuration),
    ).toBe("0s");
    await page.mouse.up();
    await expect(page.getByTestId("number-position")).toHaveText("Posisi 0");
    await expect(visual).toHaveAttribute("data-dragging", "false");
    if (motion === "reduce") {
      expect(
        await page
          .locator(".number-line-trail")
          .last()
          .evaluate((el) => getComputedStyle(el).animationName),
      ).toBe("none");
    }
    await bounded(page);
    await page.screenshot({
      path: info.outputPath(`number-line-${motion}.png`),
    });
    expect(errors).toEqual([]);
  });
}
