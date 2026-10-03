import { openBoard } from "../browser/helpers";
import { expect, test } from "@playwright/test";
import { readFile, mkdir } from "node:fs/promises";
import {
  injectFixture,
  waitForShellCache,
  loginTeacher,
} from "../browser/helpers";

test.beforeEach(async ({ page }) => {
  await loginTeacher(page);
});
import type { ShellManifest } from "../../src/offline/cache-policy";

test("manifest build hanya shell publik, JS belajar, CSS/font dan poster lokal", async ({
  page,
}) => {
  const manifest: ShellManifest = JSON.parse(
    await readFile("public/offline/manifest.json", "utf8"),
  );
  expect(manifest.assets.some((asset) => asset.endsWith(".woff2"))).toBe(true);
  expect(manifest.assets.some((asset) => asset.endsWith(".css"))).toBe(true);
  await page.goto("/guru/latihan");
  await injectFixture(page);
  await waitForShellCache(page);
  const paths = await page.evaluate(async (cacheName) => {
    const cache = await caches.open(cacheName);
    return (await cache.keys())
      .map((request) => new URL(request.url).pathname)
      .sort();
  }, manifest.cacheName);
  expect(paths).toEqual(
    [...manifest.assets, ...Object.values(manifest.shells)].sort(),
  );
  expect(
    paths.every(
      (path) =>
        path.startsWith("/_next/static/") ||
        [
          "/offline/guru.html",
          "/offline/guru-latihan.html",
          "/offline/layar.html",
          "/icon.svg",
          "/omr-worker.js",
          "/fonts/atkinson-card.woff",
          "/assets/pn-ui-v2/posters/learning-board.webp",
          "/assets/pn-ui-v2/posters/balance-scale.webp",
          "/assets/pn-ui-v2/posters/algebra-kit.webp",
        ].includes(path),
    ),
  ).toBe(true);
});

test("tab baru offline membuka kedua shell; font, IndexedDB dan fullscreen tetap bekerja", async ({
  page,
  context,
}) => {
  await page.goto("/guru/latihan");
  await injectFixture(page);
  await waitForShellCache(page);
  const ids = await page.evaluate(async () => {
    const scope = { ownerId: crypto.randomUUID(), mode: "demo" as const };
    const studentId = crypto.randomUUID();
    const names = window.__privacyFixture.createNameRepository(scope);
    await names.save(studentId, "LOCAL_ONLY_OFFLINE_CANARY");
    names.close();
    return { scope, studentId };
  });
  await page.close();
  await context.setOffline(true);
  const fresh = await context.newPage();
  const errors: string[] = [];
  const failedPaths: string[] = [];
  fresh.on("requestfailed", (request) =>
    failedPaths.push(new URL(request.url()).pathname),
  );
  fresh.on("pageerror", () => errors.push("pageerror"));
  fresh.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await fresh.setViewportSize({ width: 390, height: 844 });
  await fresh.goto("/guru/latihan");
  await expect(
    fresh.getByRole("heading", { name: "Latihan & bantuan AI", exact: true }),
  ).toBeVisible();
  await injectFixture(fresh);
  expect(
    await fresh.evaluate(async ({ scope, studentId }) => {
      const names = window.__privacyFixture.createNameRepository(scope);
      const durable =
        (await names.read(studentId))?.displayName ===
        "LOCAL_ONLY_OFFLINE_CANARY";
      names.close();
      return durable;
    }, ids),
  ).toBe(true);
  await fresh.evaluate(() => document.fonts.ready);
  expect(
    await fresh.evaluate(() =>
      document.fonts.check('400 16px "Plus Jakarta Sans"'),
    ),
  ).toBe(true);
  await mkdir("artifacts/qa/M01/m01b", { recursive: true });
  await fresh.screenshot({
    path: "artifacts/qa/M01/m01b/guru-offline.png",
    fullPage: true,
  });
  await openBoard(fresh);
  await fresh.setViewportSize({ width: 1920, height: 1080 });
  await expect(
    fresh.getByRole("heading", { name: "Layar Kelas menunggu." }),
  ).toBeVisible();
  await fresh.reload();
  await fresh.evaluate(() => document.fonts.ready);
  expect(
    await fresh.evaluate(() =>
      document.fonts.check('700 64px "Atkinson Hyperlegible"'),
    ),
  ).toBe(true);
  await fresh.getByRole("button", { name: "Layar penuh", exact: true }).click();
  await expect(
    fresh.getByRole("button", { name: "Keluar layar penuh" }),
  ).toHaveAttribute("aria-pressed", "true");
  await fresh.getByRole("button", { name: "Keluar layar penuh" }).click();
  await fresh.screenshot({
    path: "artifacts/qa/M01/m01b/layar-offline.png",
    fullPage: true,
  });
  expect(
    (await fresh.locator("body").innerText()).includes(
      "LOCAL_ONLY_OFFLINE_CANARY",
    ),
  ).toBe(false);
  if (errors.length)
    await test.info().attach("offline-request-failures", {
      body: Buffer.from(JSON.stringify(failedPaths)),
      contentType: "application/json",
    });
  expect(errors).toEqual([]);
});

test("audit cache mendeteksi aset hilang; tidak mengklaim siap hanya karena online", async ({
  page,
}) => {
  const manifest: ShellManifest = JSON.parse(
    await readFile("public/offline/manifest.json", "utf8"),
  );
  await page.goto("/guru/latihan");
  await injectFixture(page);
  await waitForShellCache(page);
  const result = await page.evaluate(async ({ cacheName, assets }) => {
    const cache = await caches.open(cacheName);
    await cache.delete(assets[0]);
    return {
      online: navigator.onLine,
      ready: await window.__privacyFixture.auditShellCache(),
    };
  }, manifest);
  expect(result).toEqual({ online: true, ready: false });
});
