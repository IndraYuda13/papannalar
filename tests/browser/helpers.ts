import { readFile } from "node:fs/promises";
import { expect, type Locator, type Page } from "@playwright/test";

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
  // Setup is optional: a new board reaches pairing with conservative defaults.
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

// The sample login now requires SAMPLE_ACCESS_CODE (fail-closed; an empty code
// is refused). The e2e webServer sets a fixed code; fill it when the code field
// is present, otherwise just submit (no-code deployments).
export async function sampleLoginOn(page: Page) {
  await page.goto("/masuk");
  const code = page.getByLabel("Kode akses rekaman");
  if (await code.isVisible()) await code.fill("local-e2e-sample-access-code");
  await page
    .getByRole("button", { name: "Coba dengan data contoh", exact: true })
    .click();
  await expect(page).toHaveURL(/\/guru$/);
}

export async function sampleLogin(page: Page) {
  await sampleLoginOn(page);
}

/** Real registration fixture. Credentials are synthetic and never written to artifacts. */
export async function registerTeacher(page: Page) {
  const email = `teacher-${crypto.randomUUID()}@qa.invalid`;
  const password = `fixture-${crypto.randomUUID()}`;
  await page.goto("/daftar");
  await page.getByLabel("Email guru", { exact: true }).fill(email);
  await page.getByLabel("Kata sandi", { exact: true }).fill(password);
  await page
    .getByLabel("Konfirmasi kata sandi", { exact: true })
    .fill(password);
  await page.getByRole("button", { name: "Daftar", exact: true }).click();
  await expect(page).toHaveURL(/\/guru$/);
  return { email, password };
}

export async function loginTeacher(
  page: Page,
  options: { guided?: boolean } = {},
) {
  await registerTeacher(page);
  // v4 (V3): adaptive practice is a workflow reached from home, not a nav destination — the
  // duplicate nav silhouette is gone, so the helper follows the real user path instead.
  await page.goto("/guru/latihan?mode=demo");
  await expect(page).toHaveURL(/\/guru\/latihan/);
  await expect(
    page.getByRole("button", { name: "Buat kelas", exact: true }),
  ).toBeVisible();
  if (!options.guided) await openTeacherSections(page);
}

// Functional regression scenarios explicitly open the tasks they exercise.
// Dedicated teacher-flow tests keep the beginner's collapsed first-use view.
export async function openTeacherSections(page: Page) {
  const ids =
    new URL(page.url()).pathname === "/guru/simulasi"
      ? ["teacher-prepare", "teacher-extras", "teacher-class", "teacher-device"]
      : [
          "teacher-prepare",
          "teacher-teach",
          "teacher-ai",
          "teacher-extras",
          "teacher-oral",
          "teacher-class",
          "teacher-device",
          "teacher-print",
        ];
  for (const id of ids) {
    const section = page.locator(`details#${id}`);
    if (!((await section.getAttribute("open")) !== null))
      await section.locator(":scope > summary").click();
    await expect(section).toHaveAttribute("open", "");
  }
}
export async function openTeacherExample(page: Page) {
  if (new URL(page.url()).pathname === "/guru/simulasi") {
    await openTeacherSections(page);
    return;
  }
  const source = new URL(page.url());
  const query = new URLSearchParams({ mode: "demo" });
  const classId = source.searchParams.get("class");
  if (classId) query.set("class", classId);
  await page.goto(`/guru/simulasi?${query}`);
  await expect(
    page.getByRole("heading", {
      name: "Coba contoh sesi lengkap",
      exact: true,
    }),
  ).toBeVisible();
  if (classId)
    await expect(
      page.locator('.teacher-class-picker [aria-pressed="true"]'),
    ).toHaveCount(1);
  await openTeacherSections(page);
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

/**
 * Confirm a consequential action through the product's own `Sheet` (INTERACTION_DELTA_V4 §E-7).
 *
 * `window.confirm` is gone by design: every destructive action now opens the product dialog with
 * its title and one consequence sentence, so a test that answers a browser dialog answers
 * nothing. `label` is the confirm button's own label — read it from the card that owns the
 * action, not from the trigger button, which may share its wording.
 */
export async function confirmSheet(page: Page, label: string | RegExp) {
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: label }).click();
  await expect(dialog).toHaveCount(0);
}

/**
 * Wait until the board is actually connected, by state rather than by wording.
 *
 * The phone's status text is confirmation-gated: the teacher polls at 750 ms, the board ACKs on a
 * 2 s interval, and the label only appears after both have happened — 1–4 s idle, longer under
 * load. Asserting `toContainText("Layar tersambung")` therefore fails on timing, not on behaviour,
 * and reads as a product defect. `[data-connected]` is the same fact without the round-trip lag.
 * The visible wording is still asserted, because the two vocabularies must agree (§A20).
 */
export async function waitForBoardConnection(
  page: Page | Locator,
  timeout = 20000,
) {
  await expect(page.getByTestId("board-connection")).toHaveAttribute(
    "data-connected",
    "true",
    { timeout },
  );
  await expect(page.getByTestId("pairing-status")).toContainText(
    "Layar tersambung",
    { timeout },
  );
}
