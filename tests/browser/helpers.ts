import { readFile } from "node:fs/promises";
import { expect, type Page } from "@playwright/test";

export async function injectFixture(page: Page) {
  await page.addScriptTag({
    content: await readFile(".browser-tests/fixture.js", "utf8"),
  });
}

export async function loginTeacher(page: Page) {
  const email = `teacher-${crypto.randomUUID()}@qa.invalid`;
  await page.goto("/masuk");
  await page.getByLabel("Email guru").fill(email);
  await page.getByRole("button", { name: "Kirim tautan masuk" }).click();
  await expect(page.getByRole("status")).toContainText(
    "Tautan masuk sudah dikirim",
  );
  // Test mailbox only: no real email. The test double checks the PKCE challenge.
  const response = await page.request.get(
    `http://127.0.0.1:54325/__test/link?email=${encodeURIComponent(email)}`,
  );
  const link: { url: string } = await response.json();
  await page.goto(link.url);
  await expect(page).toHaveURL(/\/guru$/);
  await expect(
    page.getByRole("button", { name: "Buat kelas", exact: true }),
  ).toBeVisible();
}

export async function waitForShellCache(page: Page) {
  await page.evaluate(() =>
    navigator.serviceWorker.ready.then(() => undefined),
  );
  await expect
    .poll(() => page.evaluate(() => window.__privacyFixture.auditShellCache()))
    .toBe(true);
}
