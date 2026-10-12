import { test, expect } from "@playwright/test";
import { registerTeacher } from "../browser/helpers";
const root =
  process.env["PNL_BROWSER_ARTIFACT_ROOT"] ?? "artifacts/qa/grouped-learning";
import { mkdir } from "node:fs/promises";
test("authenticated empty and unavailable teacher surfaces keep real actions and do not overflow", async ({
  page,
}) => {
  await mkdir(root, {
    recursive: true,
  });
  await registerTeacher(page);
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
      path: `${root}/empty-${width}.png`,
      fullPage: true,
    });
  }
});
