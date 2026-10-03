import { expect, test, type Page } from "@playwright/test";
import { mkdir, readFile } from "node:fs/promises";
import { openBoard, loginTeacher } from "../browser/helpers";
declare global {
  interface Window {
    __pnDraws?: number;
  }
}
const origin = "http://127.0.0.1:3100",
  evidence = "artifacts/qa/ui-ai-v2";
async function sample(page: Page) {
  await page.goto("/masuk");
  await page
    .getByRole("button", { name: "Coba dengan data contoh", exact: true })
    .click();
  await expect(page).toHaveURL(/\/guru$/);
  const response = await page.request.post("/api/v1/sample/control", {
    headers: { Origin: origin },
    data: { takeover: true },
  });
  expect(response.ok()).toBe(true);
}
async function overflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
}
test("U2 visible login automatically renders 3D without controls; hidden panels stay lazy and light mode releases the canvas", async ({
  page,
}) => {
  test.setTimeout(60000);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    const draw = WebGL2RenderingContext.prototype.drawElements;
    Object.defineProperty(window, "__pnDraws", { value: 0, writable: true });
    WebGL2RenderingContext.prototype.drawElements = function (...args) {
      window.__pnDraws = (window.__pnDraws ?? 0) + 1;
      return draw.apply(this, args);
    };
  });
  const models: string[] = [];
  page.on("request", (r) => {
    if (r.url().endsWith(".glb")) models.push(r.url());
  });
  await page.goto("/masuk");
  await expect(page.locator(".studio-login-intro")).toBeHidden();
  expect(models).toHaveLength(0);
  expect(await page.locator(".scene-canvas").count()).toBe(0);
  await page.setViewportSize({ width: 1366, height: 900 });
  await expect(page.locator(".scene-canvas")).toHaveAttribute(
    "data-ready",
    "true",
    { timeout: 30000 },
  );
  expect(models).toHaveLength(1);
  expect(models[0]).toContain("learning-board.glb");
  await expect(page.locator(".decorative-scene figcaption")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: /Jelajahi 3D|Lihat poster/ }),
  ).toHaveCount(0);
  await expect(
    page.getByText("Papan dan benda belajar", { exact: true }),
  ).toHaveCount(0);
  const frames = await page.evaluate(() => window.__pnDraws ?? 0);
  expect(frames).toBeGreaterThan(0);
  await page.waitForTimeout(350);
  expect(await page.evaluate(() => window.__pnDraws ?? 0)).toBe(frames);
  await mkdir(evidence, { recursive: true });
  await page.screenshot({ path: `${evidence}/scene-rendered.png` });
  await expect(page.getByText("Tampilan nyaman", { exact: true })).toHaveCount(
    0,
  );
  // Existing accessibility preferences remain honored without a redundant menu.
  await page.evaluate(() => {
    localStorage.setItem(
      "pn-visual-preferences-v1",
      JSON.stringify({ light: true }),
    );
    window.dispatchEvent(
      new StorageEvent("storage", { key: "pn-visual-preferences-v1" }),
    );
  });
  await expect(page.locator(".scene-canvas")).toHaveCount(0);
  await expect(
    page.getByRole("img", { name: "Ilustrasi PapanNalar", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Email guru").fill("fixture-ui@qa.invalid");
  await expect(page.getByLabel("Email guru")).toHaveValue(
    "fixture-ui@qa.invalid",
  );
});
test("U2 no WebGL and reduced motion preserve poster, login and teaching; scanner never fetches a model", async ({
  page,
}) => {
  test.setTimeout(60000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => {
    const get = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
      type: string,
      ...args: unknown[]
    ) {
      if (
        type === "webgl" ||
        type === "webgl2" ||
        type === "experimental-webgl"
      )
        return null;
      return Reflect.apply(get, this, [type, ...args]);
    } as typeof get;
  });
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto("/masuk");
  await expect(page.locator(".decorative-scene")).toHaveAttribute(
    "data-scene-state",
    "poster-fallback",
  );
  await expect(
    page.getByRole("img", { name: "Ilustrasi PapanNalar", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".scene-canvas")).toHaveCount(0);
  await expect(
    page.locator("[data-reduced-motion='true']").first(),
  ).toBeVisible();
  await sample(page);
  const response = await page.request.post("/api/v1/library", {
    headers: { Origin: origin },
    data: { action: "list" },
  });
  const state = await response.json(),
    run = state.runs.find((r: { mode: string }) => r.mode === "assessment");
  const models: string[] = [];
  page.on("request", (r) => {
    if (r.url().endsWith(".glb")) models.push(r.url());
  });
  await page.goto(`/guru/sesi/${run.id}`);
  await expect(
    page.getByRole("button", { name: "Gunakan kamera", exact: true }),
  ).toBeVisible();
  expect(models).toHaveLength(0);
  await expect(page.locator(".scene-canvas")).toHaveCount(0);
});
for (const policy of ["save-data", "saved-light"])
  test(`U2 ${policy} prevents 3D library/model download while login remains usable`, async ({
    page,
  }) => {
    const manifest = JSON.parse(
      await readFile("public/offline/manifest.json", "utf8"),
    );
    const models: string[] = [];
    page.on("request", (r) => {
      const path = new URL(r.url()).pathname;
      if (path.endsWith(".glb") || manifest.optionalVisualAssets.includes(path))
        models.push(path);
    });
    await page.addInitScript((policy) => {
      if (policy === "save-data")
        Object.defineProperty(navigator, "connection", {
          configurable: true,
          value: { saveData: true },
        });
      else
        localStorage.setItem(
          "pn-visual-preferences-v1",
          JSON.stringify({ light: true, reduced: false }),
        );
    }, policy);
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.goto("/masuk");
    await expect(
      page.getByRole("img", { name: "Ilustrasi PapanNalar", exact: true }),
    ).toBeVisible();
    await page.getByLabel("Email guru").fill("fixture-save-data@qa.invalid");
    expect(models).toHaveLength(0);
    await expect(page.locator(".scene-canvas")).toHaveCount(0);
  });
test("U2 all three bundled models render only on selection with one canvas", async ({
  page,
}) => {
  test.setTimeout(60000);
  await page.setViewportSize({ width: 1366, height: 900 });
  await sample(page);
  const scene = page.locator(".studio-tools");
  await mkdir(evidence, { recursive: true });
  for (const [title, asset] of [
    ["Belajar bersama", "learning-board"],
    ["Timbangan persamaan", "balance-scale"],
    ["Ubin aljabar", "algebra-kit"],
  ]) {
    await scene.getByRole("button", { name: title, exact: true }).click();
    await scene.scrollIntoViewIfNeeded();
    await expect(page.locator(".scene-canvas")).toHaveAttribute(
      "data-ready",
      "true",
    );
    await expect(page.locator(".scene-canvas")).toHaveCount(1);
    await expect(scene.locator(".tool-poster")).toHaveAttribute(
      "src",
      `/assets/pn-ui-v2/posters/${asset}.webp`,
    );
    await scene.screenshot({ path: `${evidence}/scene-${asset}.png` });
  }
});
test("U2 offline precache excludes the scene engine and GLBs; scanner and failed lazy download retain function", async ({
  page,
  context,
}) => {
  test.setTimeout(60000);
  const manifest: {
    assets: string[];
    optionalVisualAssets: string[];
    cacheName: string;
  } = JSON.parse(await readFile("public/offline/manifest.json", "utf8"));
  expect(manifest.optionalVisualAssets.length).toBeGreaterThan(0);
  const downloads: string[] = [];
  context.on("request", (request) => {
    const path = new URL(request.url()).pathname;
    if (path.endsWith(".glb") || manifest.optionalVisualAssets.includes(path))
      downloads.push(path);
  });
  // Keep automatic scenes outside the viewport while checking the scanner's
  // own requests; the login and home scene are tested separately.
  await page.setViewportSize({ width: 390, height: 844 });
  await sample(page);
  await page.evaluate(() =>
    navigator.serviceWorker.ready.then(() => undefined),
  );
  const cached = await page.evaluate(
    async (cacheName) =>
      (await (await caches.open(cacheName)).keys()).map(
        (r) => new URL(r.url).pathname,
      ),
    manifest.cacheName,
  );
  expect(cached.filter((path) => path.endsWith(".webp"))).toHaveLength(3);
  expect(
    cached.some(
      (path) =>
        path.endsWith(".glb") || manifest.optionalVisualAssets.includes(path),
    ),
  ).toBe(false);
  const state = await (
    await page.request.post("/api/v1/library", {
      headers: { Origin: origin },
      data: { action: "list" },
    })
  ).json();
  const run = state.runs.find((r: { mode: string }) => r.mode === "assessment");
  await page.goto(`/guru/sesi/${run.id}`);
  await expect(
    page.getByRole("button", { name: "Gunakan kamera", exact: true }),
  ).toBeVisible();
  expect(downloads).toEqual([]);
  // Block only the optional library. Offline mode itself correctly switches
  // the home to its existing local-session chooser, which has no scene.
  for (const asset of manifest.optionalVisualAssets)
    await context.route(`**${asset}`, (route) => route.abort());
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto("/masuk");
  await expect(page.locator(".decorative-scene")).toHaveAttribute(
    "data-scene-state",
    "poster-fallback",
  );
  await expect(
    page.getByRole("heading", { name: "Masuk tanpa kata sandi", exact: true }),
  ).toBeVisible();
  await expect(
    page
      .locator(".decorative-scene")
      .getByRole("img", { name: "Ilustrasi PapanNalar", exact: true }),
  ).toBeVisible();
});
for (const width of [360, 390, 1024, 1366])
  test(`U1 walkthrough all teacher views, local data, editor selection and text130% at ${width}`, async ({
    page,
  }) => {
    test.setTimeout(120000);
    await page.setViewportSize({ width, height: width < 500 ? 844 : 900 });
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await sample(page);
    const data = await (
      await page.request.post("/api/v1/library", {
        headers: { Origin: origin },
        data: { action: "list" },
      })
    ).json();
    const classes = await (
      await page.request.get("/api/v1/classes?mode=demo")
    ).json();
    const cls = classes.classes.find(
        (c: { label: string }) => c.label === "7B",
      ),
      set = data.collections.find(
        (c: { document: { items: unknown[] } }) => c.document.items.length > 1,
      ),
      run = data.runs.find((r: { mode: string }) => r.mode === "assessment");
    const routes = [
      "/guru",
      "/guru/kelas",
      `/guru/kelas/${cls.id}`,
      "/guru/soal",
      `/guru/soal/${set.id}`,
      "/guru/soal/baru",
      "/guru/mulai",
      "/guru/asesmen",
      `/guru/hasil/${run.id}`,
      `/guru/sesi/${run.id}`,
      "/guru/latihan",
      "/demo",
    ];
    for (const route of routes) {
      const res = await page.goto(route);
      expect(res?.status()).toBe(200);
      await expect(page.locator("main h1").first()).toBeVisible();
      await overflow(page);
    }
    await page.goto(`/guru/soal/${set.id}`);
    await page.getByRole("button", { name: /^Soal 2/ }).click();
    await expect(
      page.getByRole("article", { name: "Soal 2", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("article", { name: "Soal 1", exact: true }),
    ).toBeHidden();
    await page
      .getByRole("button", { name: "Preview soal 2", exact: true })
      .click();
    await expect(
      page.getByRole("region", { name: "Pratinjau soal", exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Tutup preview", exact: true })
      .click();
    await page.addStyleTag({ content: "html {font-size:130%}" });
    await overflow(page);
    // Page-level scroll checks miss a navigator card spilling into the gap.
    // Check every actual click target and its text against the inner panel.
    const navigationFits = await page
      .locator(".studio-editor-index button")
      .evaluateAll((buttons) =>
        buttons.every((button) => {
          const rect = button.getBoundingClientRect();
          const nav = button.closest("nav")!.getBoundingClientRect();
          const text = button.querySelector("small")!.getBoundingClientRect();
          return (
            rect.left >= nav.left - 0.5 &&
            rect.right <= nav.right + 0.5 &&
            text.left >= rect.left &&
            text.right <= rect.right &&
            rect.height >= 48
          );
        }),
      );
    expect(navigationFits).toBe(true);
    await page.goto("/guru/kelas");
    await page.getByLabel("Cari kelas").fill("TIDAK-ADA-FIXTURE");
    await expect(
      page.getByText("Kelas belum ditemukan", { exact: true }),
    ).toBeVisible();
    await mkdir(evidence, { recursive: true });
    await page.screenshot({
      path: `${evidence}/teacher-${width}.png`,
      fullPage: true,
    });
    expect(errors).toEqual([]);
  });
test("U2 QR is actually rendered with contrast and stays inside idle board viewport", async ({
  page,
}) => {
  // Loopback HTTP intentionally never advertises a cross-device QR URL.
  // Inject only the public synthetic HTTPS challenge URL; keep real identity,
  // capability wizard, renderer and layout. Native camera/hosted TLS remain NOT_RUN.
  await page.route("**/api/v1/board/pairing", async (route) => {
    const response = await route.fetch();
    const body = await response.json();
    if (route.request().postDataJSON()?.action === "create")
      body.pairingUrl = `https://fixture.qa.invalid/guru?pair=${body.code}`;
    await route.fulfill({ response, json: body });
  });
  await page.setViewportSize({ width: 1280, height: 720 });
  await openBoard(page);
  const qr = page.getByTestId("pairing-qr");
  await expect(qr).toBeVisible();
  await expect
    .poll(() =>
      qr.evaluate((el) => {
        const canvas = el as HTMLCanvasElement,
          context = canvas.getContext("2d");
        if (!context || canvas.width !== 256) return false;
        const data = context.getImageData(
          0,
          0,
          canvas.width,
          canvas.height,
        ).data;
        let dark = 0;
        for (let i = 0; i < data.length; i += 4)
          if (data[i] < 100 && data[i + 3] > 100) dark++;
        return dark > 1000;
      }),
    )
    .toBe(true);
  for (const item of [
    qr,
    page.getByTestId("pairing-code"),
    page.getByRole("button", { name: "Buat kode baru", exact: true }),
  ]) {
    const box = await item.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.y).toBeGreaterThanOrEqual(0);
    expect(box!.y + box!.height).toBeLessThanOrEqual(720);
  }
  await overflow(page);
  // Finish the board's in-flight public fixture requests before this page is
  // torn down; late route.fetch rejections must not leak into the next test.
  await page.unrouteAll({ behavior: "wait" });
});
test("U1 empty/error/retry routes keep navigation and keyboard access", async ({
  page,
}) => {
  await loginTeacher(page);
  await page.goto("/guru/kelas");
  await expect(
    page.getByRole("heading", { name: "Belum ada kelas", exact: true }),
  ).toBeVisible();
  await page.route("**/api/v1/classes/*", (r) =>
    r.fulfill({ status: 503, body: "{}" }),
  );
  await page.goto(`/guru/kelas/${crypto.randomUUID()}`);
  await expect(
    page.getByRole("alert").filter({ hasText: "Kelas belum dapat dibuka" }),
  ).toContainText("Kelas belum dapat dibuka");
  await expect(
    page.getByRole("button", { name: "Coba lagi", exact: true }),
  ).toBeVisible();
  await page.goto("/halaman-tidak-ada");
  await expect(
    page.getByRole("heading", { name: "Halaman tidak ditemukan", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: /Kembali ke ruang mengajar/ }),
  ).toBeFocused();
});
