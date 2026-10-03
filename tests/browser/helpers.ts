import { readFile } from "node:fs/promises";
import { expect, type Page } from "@playwright/test";

export async function injectFixture(page: Page) {
  await page.addScriptTag({
    content: await readFile(".browser-tests/fixture.js", "utf8"),
  });
}
// Baseline functional scenarios accept the new first-use appearance screen.
// The dedicated display/capability specs exercise the full wizard separately.
export async function openBoard(
  page: Page,
  options?: Parameters<Page["goto"]>[1],
) {
  await page.goto("/layar", options);
  const save = page.getByRole("button", {
    name: "Simpan tampilan",
    exact: true,
  });
  const check = page.getByRole("region", {
    name: "Tes Kemampuan Papan",
    exact: true,
  });
  await expect
    .poll(
      async () =>
        (await save.isVisible()) ||
        (await page.getByTestId("pairing-code").isVisible()) ||
        (await page.getByTestId("board-connection").isVisible()) ||
        (await check.isVisible()),
    )
    .toBe(true);
  if (await save.isVisible()) await save.click();
  // A connection badge can render before the first-use capability effect.
  // Wait for the actual check when this browser has no saved profile.
  const hasProfile = await page.evaluate(() =>
    Boolean(localStorage.getItem("pn-board-capabilities-v1")),
  );
  if (!hasProfile) await expect(check).toBeVisible();
  await expect
    .poll(async () => {
      if (await check.isVisible())
        await check
          .getByRole("button", {
            name: "Tutup tes · lanjut dengan cadangan",
            exact: true,
          })
          .click();
      return (
        !(await check.isVisible()) &&
        ((await page.getByTestId("pairing-code").isVisible()) ||
          (await page.getByTestId("board-connection").isVisible()))
      );
    })
    .toBe(true);
}

export async function loginTeacher(
  page: Page,
  options: { guided?: boolean } = {},
) {
  const email = `teacher-${crypto.randomUUID()}@qa.invalid`;
  await page.goto("/masuk");
  await page.getByLabel("Email guru").fill(email);
  await page.getByRole("button", { name: "Kirim tautan masuk" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Tautan masuk sudah dikirim" }),
  ).toContainText("Tautan masuk sudah dikirim");
  // Test mailbox only: no real email. The test double checks the PKCE challenge.
  const response = await page.request.get(
    `http://127.0.0.1:54325/__test/link?email=${encodeURIComponent(email)}`,
  );
  const link: { url: string } = await response.json();
  await page.goto(link.url);
  await expect(page).toHaveURL(/\/guru$/);
  await page
    .getByRole("navigation", { name: "Menu utama" })
    .getByRole("link", { name: "Latihan & AI", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Buat kelas", exact: true }),
  ).toBeVisible();
  if (!options.guided) await openTeacherSections(page);
}

// Functional regression scenarios explicitly open the tasks they exercise.
// Dedicated teacher-flow tests keep the beginner's collapsed first-use view.
export async function openTeacherSections(page: Page) {
  for (const id of [
    "teacher-prepare",
    "teacher-teach",
    "teacher-rehearsal",
    "teacher-ai",
    "teacher-oral",
    "teacher-class",
    "teacher-device",
    "teacher-print",
  ]) {
    const section = page.locator(`details#${id}`);
    if (!((await section.getAttribute("open")) !== null))
      await section.locator(":scope > summary").click();
    await expect(section).toHaveAttribute("open", "");
  }
}
export async function chooseTeacherMode(page: Page, mode: "demo" | "pilot") {
  await page.getByLabel("Gunakan kelas").selectOption(mode);
  await expect(page.getByLabel("Gunakan kelas")).toBeEnabled();
  await expect(page.getByLabel("Gunakan kelas")).toHaveValue(mode);
  await openTeacherSections(page);
}

export async function waitForShellCache(page: Page) {
  await page.evaluate(() =>
    navigator.serviceWorker.ready.then(() => undefined),
  );
  await expect
    .poll(() => page.evaluate(() => window.__privacyFixture.auditShellCache()))
    .toBe(true);
}
