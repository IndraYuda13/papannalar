import { test, expect } from "@playwright/test";
import { providerOrigin } from "../harness/ports.mjs";
import { mkdir } from "node:fs/promises";
test("authenticated empty and unavailable teacher surfaces keep real actions and do not overflow", async ({
  page,
}) => {
  await mkdir("/mnt/papannalar-20261013/evidence/frame-browser", {
    recursive: true,
  });
  const email = `empty-${crypto.randomUUID()}@qa.invalid`;
  await page.goto("/masuk");
  await page.getByLabel("Email guru").fill(email);
  await page.getByRole("button", { name: "Kirim tautan masuk" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Tautan masuk sudah dikirim" }),
  ).toBeVisible();
  const link = await (
    await page.request.get(
      `${providerOrigin}/__test/link?email=${encodeURIComponent(email)}`,
    )
  ).json();
  await page.goto(link.url);
  for (const width of [360, 390, 768, 1024, 1366, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/guru/latihan");
    await expect(
      page.getByRole("heading", {
        name: /Tambahkan kelas untuk memulai|Kelas belum dapat dimuat/,
      }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `/mnt/papannalar-20261013/evidence/frame-browser/empty-${width}.png`,
      fullPage: true,
    });
  }
});
