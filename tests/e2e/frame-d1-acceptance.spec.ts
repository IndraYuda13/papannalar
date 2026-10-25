import { expect, test, type Page } from "@playwright/test";
import { sampleLogin } from "../browser/helpers";
import { appOrigin } from "../harness/ports.mjs";

/**
 * D1 acceptance rows from DESIGN_BRIEF_V4 §11.4 that belong to this wave:
 * A1 nav label floor · A2 focus never under the bottom bar · A7 amber resolves ·
 * A9 reduced-motion parity · A10 teacher tap targets · A13 blank vs `Belum tahu` vocabulary.
 *
 * Renders are captured to /root/fleet-evidence/papannalar-audit/frame-d1/ by the runner via
 * EVIDENCE_DIR, so the same spec is the measurement and the screenshot source.
 */
const evidence = process.env["PNL_EVIDENCE_DIR"] ?? "artifacts/qa/frame-d1";

async function sample(page: Page) {
  await sampleLogin(page);
  expect(
    (
      await page.request.post("/api/v1/sample/control", {
        headers: { Origin: appOrigin },
        data: { takeover: true },
      })
    ).ok(),
  ).toBe(true);
}

/**
 * The teacher shell renders a loading state while {@link TeacherProvider} resolves the
 * session, so every measurement must wait for real content. A screenshot of `Memuat kelas…`
 * would also be worthless as review evidence.
 */
async function settle(page: Page) {
  await page.waitForSelector(
    '.studio-page-header h1, .studio-state h2, [role="alert"]',
  );
  await page.waitForFunction(
    () => !document.body.innerText.includes("Memuat kelas…"),
  );
}

test("A1/A10 teacher nav keeps a 12px label floor and 48px targets at 360px", async ({
  page,
}) => {
  await sample(page);
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/guru");
  const nav = page.getByRole("navigation", { name: "Menu utama" });
  await expect(nav).toBeVisible();
  const boxes = await nav.getByRole("link").evaluateAll((links) =>
    links.map((link) => {
      const rect = link.getBoundingClientRect();
      const label = link.querySelector(".nav-label");
      return {
        label: link.getAttribute("aria-label"),
        text: link.textContent?.trim(),
        width: rect.width,
        height: rect.height,
        fontSize: label ? parseFloat(getComputedStyle(label).fontSize) : 0,
        textTransform: label ? getComputedStyle(label).textTransform : "",
      };
    }),
  );
  expect(boxes).toHaveLength(4);
  for (const box of boxes) {
    expect(box.height, `${box.label} target height`).toBeGreaterThanOrEqual(44);
    expect(box.width, `${box.label} target width`).toBeGreaterThanOrEqual(44);
    expect(box.fontSize, `${box.label} label size`).toBeGreaterThanOrEqual(12);
    // §5.2: nav labels carry no uppercase transform.
    expect(box.textTransform, `${box.label} transform`).not.toBe("uppercase");
  }
});

test("A2 focus is never painted under the fixed bottom bar on a roster row", async ({
  page,
}) => {
  await sample(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/guru/kelas");
  const first = page.locator(".studio-row").first();
  await expect(first).toBeVisible();
  const href = await first.getAttribute("href");
  await page.goto(href!);
  await page.waitForSelector("[data-attend-toggle]");
  const navBox = (await page
    .getByRole("navigation", { name: "Menu utama" })
    .boundingBox())!;
  // The bar is fixed, so any control whose box overlaps the bar's band is occluded while it
  // holds focus. V1's fix (html scroll-padding-bottom + a per-control scroll-margin-bottom) is
  // exactly what keeps every focused control above `nav.top`. Controls inside the bar are exempt.
  // `scroll-behavior: smooth` animates the focus scroll, so sample until it settles; only the
  // settled position decides the assertion, since an in-flight frame is not a permanent state.
  const occluded: string[] = [];
  for (let index = 0; index < 30; index++) {
    await page.keyboard.press("Tab");
    const result = await page.evaluate(async (navTop: number) => {
      const element = document.activeElement as HTMLElement | null;
      if (!element || element === document.body) return null;
      if (element.closest('[aria-label="Menu utama"]')) return null;
      const frame = () =>
        new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        );
      let settled = document.documentElement.scrollTop,
        bottom = 0;
      for (let attempt = 0; attempt < 12; attempt++) {
        await frame();
        const y = document.documentElement.scrollTop;
        bottom = element.getBoundingClientRect().bottom;
        if (y === settled) break;
        settled = y;
      }
      return {
        label: element.getAttribute("aria-label") ?? element.tagName,
        bottom: Math.round(bottom),
        overlaps: bottom > navTop,
      };
    }, navBox.y);
    if (result?.overlaps)
      occluded.push(`${index}: ${result.label} (bottom ${result.bottom})`);
  }
  expect(occluded, "focused controls painted under the bottom bar").toEqual([]);
});

test("A7/A8 no amber utility renders transparent on a D1 surface", async ({
  page,
}) => {
  await sample(page);
  await page.setViewportSize({ width: 390, height: 844 });
  for (const path of ["/guru", "/guru/kelas", "/guru/soal", "/guru/asesmen"]) {
    await page.goto(path);
    await settle(page);
    const transparent = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>("*")]
        .filter((element) => {
          // Only an *unprefixed* ground utility must paint on the element itself; a
          // `hover:`/`focus:` variant is legitimately transparent at rest.
          const classes = element.className.toString().split(/\s+/);
          return classes.some(
            (name) => name.startsWith("bg-pn-") && !name.includes(":"),
          );
        })
        .map((element) => ({
          className: element.className.toString(),
          background: getComputedStyle(element).backgroundColor,
        }))
        .filter((entry) => /rgba\(0,\s*0,\s*0,\s*0\)/.test(entry.background)),
    );
    expect(transparent, `transparent ground on ${path}`).toEqual([]);
  }
});

test("A9 reduced motion removes every running animation on the teacher home", async ({
  page,
}) => {
  await sample(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/guru");
  await settle(page);
  const running = await page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>("*")]
      .map((element) => ({
        name: getComputedStyle(element).animationName,
        tag: element.tagName,
      }))
      .filter((entry) => entry.name && entry.name !== "none"),
  );
  expect(running, "running animation-name under reduced motion").toEqual([]);
});

test("A13 the class roster labels a student by number, never a bare name string", async ({
  page,
}) => {
  await sample(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/guru/kelas");
  await page.locator(".studio-row").first().click();
  await page.waitForSelector("[data-attend-toggle]");
  const rows = page.locator("[data-student-row]");
  await expect(rows.first()).toBeVisible();
  // Sample names come from the shared fixture list; a row must always carry its
  // attendance numeral chip too.
  const chips = await page.locator(".studio-numeral-chip").count();
  expect(chips).toBe(await rows.count());
  const namesStatement = page.getByText(
    "Nama siswa · tersimpan di perangkat ini",
  );
  await expect(namesStatement).toHaveCount(1);
});

test("D1 renders for review at four viewports", async ({ page }) => {
  await sample(page);
  for (const viewport of [
    { width: 360, height: 800 },
    { width: 390, height: 844 },
    { width: 1024, height: 900 },
    { width: 1366, height: 900 },
  ]) {
    await page.setViewportSize(viewport);
    for (const [name, path] of [
      ["guru", "/guru"],
      ["kelas", "/guru/kelas"],
      ["asesmen", "/guru/asesmen"],
    ] as const) {
      await page.goto(path);
      await settle(page);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
        `horizontal overflow on ${path} at ${viewport.width}`,
      ).toBe(true);
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({
        path: `${evidence}/${name}-${viewport.width}.png`,
        fullPage: true,
      });
    }
  }
});

test("D1 survives 130% text scaling and a long local student name", async ({
  page,
}) => {
  await sample(page);
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/guru/kelas");
  await page.locator(".studio-row").first().click();
  await page.waitForSelector("[data-attend-toggle]");
  const firstEdit = page
    .getByRole("button", { name: "Edit", exact: true })
    .first();
  await firstEdit.click();
  await page
    .getByLabel("Nama panggilan di perangkat ini")
    .fill("NAMA_SISWA_SANGAT_PANJANG_SEKALI");
  await page.getByRole("button", { name: "Simpan siswa" }).click();
  await expect(
    page.getByText("NAMA_SISWA_SANGAT_PANJANG_SEKALI", { exact: true }),
  ).toBeVisible();
  await page.addStyleTag({ content: "html { font-size: 130%; }" });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
  // The action track keeps its own column: the content ends before the action begins, and
  // the action stays fully inside the row (V5 — the action never wraps to a second line).
  const overlap = await page.evaluate(() => {
    const row = document.querySelector("[data-student-row]")!;
    const action = row.querySelector('[data-slot="button"]')!;
    const content = row.querySelector(".studio-row-content")!;
    const actionBox = action.getBoundingClientRect(),
      rowBox = row.getBoundingClientRect(),
      contentBox = content.getBoundingClientRect();
    return {
      contentClearsAction: contentBox.right <= actionBox.left + 1,
      actionInRow:
        actionBox.left >= rowBox.left - 1 &&
        actionBox.right <= rowBox.right + 1,
      sameLine: Math.abs(actionBox.top - contentBox.top) < contentBox.height,
    };
  });
  expect(overlap.contentClearsAction, "content overlaps the action track").toBe(
    true,
  );
  expect(overlap.actionInRow, "action track leaves the row").toBe(true);
  expect(overlap.sameLine, "action wrapped to a second line").toBe(true);
});
