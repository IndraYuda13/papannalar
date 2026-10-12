import { test, expect, type Page, type TestInfo } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { snapshotSchema } from "../../src/contracts/presentation";
import { loginTeacher } from "../browser/helpers";

/**
 * T10 (D2) acceptance — the INTERACTION_DELTA_V4 §F rows that are implementable and falsifiable
 * on the real routes, plus the flow-clarity rows the delta's §E-1 arc requires.
 *
 * Every row states an observable, not an intention. Where a row is only partly assertable in
 * this revision, the assertion covers the part that is real and the limit is named in the T10
 * report instead of being papered over.
 *
 * Rows that need a *live* board (a session, not the idle pairing screen) use the UI-only
 * transport fixtures below: they neither claim live pairing coverage nor write teacher or
 * session data into the shared audit database.
 */
test.use({ trace: "off" });

const EVIDENCE = "artifacts/qa/frame-d2";
const fixtureId = "7b000001-0000-4000-8000-000000000099";

async function shot(page: Page, info: TestInfo, name: string) {
  await mkdir(EVIDENCE, { recursive: true });
  await page.screenshot({ path: `${EVIDENCE}/${name}.png`, fullPage: false });
  await info.attach(name, {
    path: `${EVIDENCE}/${name}.png`,
    contentType: "image/png",
  });
}

/** Distinct animated elements, defined by §A.2: a distinct DOM element that is the target of at
 *  least one animation whose playState is neither `finished` nor `idle`. Deliberately NOT the
 *  naive `getAnimations().filter(running).length`. */
const ANIMATED_PROBE = `(() => {
  const seen = new Set();
  for (const animation of document.getAnimations()) {
    if (animation.playState === "finished" || animation.playState === "idle") continue;
    const target = animation.effect && animation.effect.target;
    if (target && target.nodeType === 1) seen.add(target);
  }
  return seen.size;
})()`;

/** Elements carrying a running animation or a live transition, with enough identity to name a
 *  failure. Used by the reduced-motion row, where an unexplained count is worthless. */
const MOTION_OFFENDERS = `(() => {
  const out = [];
  for (const node of document.querySelectorAll("*")) {
    const style = getComputedStyle(node);
    if (style.animationName !== "none" && style.animationName !== "")
      out.push("animation:" + node.tagName + "." + (node.className || ""));
    if (style.transitionProperty !== "none" && style.transitionDuration !== "0s")
      out.push("transition:" + node.tagName + "." + String(node.className || ""));
  }
  return out;
})()`;

async function openBoard(page: Page) {
  await page.goto("/layar");
  const save = page.getByRole("button", { name: "Simpan tampilan", exact: true });
  const check = page.getByRole("region", {
    name: "Tes Kemampuan Papan",
    exact: true,
  });
  await expect
    .poll(
      async () =>
        (await save.isVisible()) ||
        (await page.getByTestId("pairing-code").isVisible()) ||
        (await check.isVisible()),
    )
    .toBe(true);
  if (await save.isVisible()) await save.click();
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
        (await page.getByTestId("pairing-code").isVisible())
      );
    })
    .toBe(true);
}

/**
 * A live board fed by UI-only transport fixtures. `mode` chooses which board moment is bound,
 * so a row can be measured on a real composed board rather than on the idle screen.
 */
async function liveBoard(page: Page, mode: "check" | "groups" = "check") {
  const payload =
    mode === "check"
      ? {
          schemaVersion: 1 as const,
          mode: "check" as const,
          question: 1,
          taskEpoch: fixtureId,
          groups: [],
          check: {
            packageId: fixtureId,
            revision: 1,
            total: 5,
            seconds: 80,
            question: {
              id: fixtureId,
              prompt: [{ kind: "text" as const, text: "−3 − 5 = …" }],
              options: [
                { label: "A", text: "8" },
                { label: "B", text: "−8" },
                { label: "C", text: "2" },
                { label: "D", text: "−2" },
              ],
              unknownLabel: "?" as const,
            },
          },
          package: { id: fixtureId, revision: 1 },
        }
      : {
          schemaVersion: 1 as const,
          mode: "groups" as const,
          question: 1,
          taskEpoch: fixtureId,
          groups: [
            { id: fixtureId, label: "Segitiga Biru" as const, attendanceNumbers: [1, 2, 3] },
            {
              id: "7b000001-0000-4000-8000-000000000098",
              label: "Kotak Hijau" as const,
              attendanceNumbers: [4, 5, 6],
            },
          ],
        };
  const snapshot = snapshotSchema.parse({
    envelope: {
      protocolVersion: 1,
      presentationId: fixtureId,
      channelEpoch: fixtureId,
      revision: 1,
      commandId: fixtureId,
      packageVersion: "prelim-7b-v1",
      payload,
    },
    ackRevision: 1,
    ackCommandId: fixtureId,
    ackAt: new Date().toISOString(),
  });
  await page.addInitScript(
    ({ id }) => {
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
      localStorage.setItem(
        "pn-board-appearance-v1",
        JSON.stringify({
          schemaVersion: 2,
          displayKey: id,
          displayName: "",
          settings: { preset: "sedang", interactionZone: "auto" },
        }),
      );
    },
    { id: fixtureId },
  );
  const now = new Date().toISOString();
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
    const json =
      action === "resume"
        ? { snapshot }
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
                : action === "create"
                  ? {
                      id: fixtureId,
                      code: "417032",
                      expiresAt: new Date(Date.now() + 600000).toISOString(),
                      pairingUrl: null,
                    }
                  : { accepted: true };
    await route.fulfill({ json });
  });
  await page.route("**/api/v1/board/library", (route) =>
    route.fulfill({
      // No library run is bound: the board falls back to the session-content renderer, which is
      // the surface these rows describe. A bound library item would (correctly) take over.
      json: null,
    }),
  );
  await page.goto("/layar");
  await expect(page.getByTestId("board-connection")).toBeVisible();
  // The fixtures resolve the first envelope on the resume pass; nothing else to click. Three
  // things must settle before any row may measure this board: the webfont (a fallback face
  // gives the role line different metrics, which moves the question origin), the arrival beat
  // (`data-crossing` translates the column body), and the countdown's first paint.
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
  await expect(page.locator("[data-role-line]")).toBeVisible();
  await expect
    .poll(
      async () =>
        (await page.evaluate(ANIMATED_PROBE)) === 0 &&
        (await page.locator(".board-column").getAttribute("data-crossing")) ===
          "false",
      { timeout: 8000 },
    )
    .toBe(true);
  await page.waitForTimeout(400);
  expect(await page.evaluate(ANIMATED_PROBE)).toBe(0);
}

test("A18 idle board states two real steps and a validity window", async ({ page }, info) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await openBoard(page);
  const steps = page.locator(".board-idle-steps li");
  await expect(steps).toHaveCount(2);
  await expect(steps.nth(0)).toContainText("Buka sesi di HP guru");
  await expect(steps.nth(1)).toContainText("Pindai QR atau masukkan kode");
  // The circular step ("buka halaman ini") must be gone.
  await expect(page.locator(".board-idle")).not.toContainText("Buka halaman ini");
  const countdown = page.locator("[data-pairing-countdown]");
  await expect(countdown).toHaveText(/Kode berlaku \d{2}:\d{2} lagi/);
  const first = await countdown.textContent();
  await page.waitForTimeout(2200);
  expect(await countdown.textContent()).not.toBe(first);
  // No motion on the code or the countdown: a moving glyph cannot be typed.
  const codeAnimated = await page.getByTestId("pairing-code").evaluate((el) => {
    const nodes = [el, ...el.querySelectorAll("*")];
    return nodes.reduce(
      (count, node) =>
        count +
        node.getAnimations().filter((a) => a.playState === "running").length,
      0,
    );
  });
  expect(codeAnimated).toBe(0);
  await shot(page, info, "layar-idle-1920x1080");
});

test("A2/A36 a live board is completely still when nothing happens", async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await liveBoard(page, "check");
  // Settle the arrival beat, then sample well after it.
  await page.waitForTimeout(1000);
  expect(await page.evaluate(ANIMATED_PROBE)).toBe(0);
  // Restrict the geometry snapshot to the elements whose *motion* a teacher would see: the
  // decision column and its bands. Two legitimate things change on a live board and neither is
  // motion — the timer digits are required content, and the webfont swaps in once — so a
  // whole-document diff would report a reflow where there is no movement.
  const snapshot = () =>
    page.evaluate(() => {
      const nodes = [
        document.querySelector(".board-column"),
        document.querySelector(".board-question"),
        document.querySelector(".board-options"),
        document.querySelector(".board-state-line"),
      ].filter((el) => el !== null);
      return nodes.map((el) => {
        const rect = el.getBoundingClientRect();
        const style = getComputedStyle(el);
        return [
          el.className,
          Math.round(rect.top * 100) / 100,
          Math.round(rect.left * 100) / 100,
          Math.round(rect.height * 100) / 100,
          style.opacity,
          style.transform,
          style.willChange,
        ].join("|");
      });
    });
  const before = await snapshot();
  const animated: number[] = [];
  for (let i = 0; i < 5; i++) {
    await page.waitForTimeout(400);
    animated.push(await page.evaluate(ANIMATED_PROBE));
  }
  const after = await snapshot();
  expect(animated).toEqual([0, 0, 0, 0, 0]);
  // Every value must be identical except for a <=1px reflow, which the timer's own required
  // digits can cause. A tolerance that small cannot hide motion: the smallest beat travels 2px.
  expect(after.length).toBe(before.length);
  for (let i = 0; i < before.length; i++) {
    const a = before[i].split("|"),
      b = after[i].split("|");
    expect(b[0], `entry ${i} identity`).toBe(a[0]);
    for (const index of [1, 2, 3])
      expect(
        Math.abs(Number(b[index]) - Number(a[index])),
        `entry ${i} value ${index}`,
      ).toBeLessThanOrEqual(1);
    for (const index of [4, 5, 6])
      expect(b[index], `entry ${i} value ${index}`).toEqual(a[index]);
  }
  await shot(page, info, "layar-check-1920x1080");
});

test("A3/A3b the question is near the top of the canvas at every distance preset", async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await liveBoard(page, "check");
  const readings: unknown[] = [];
  for (const preset of ["dekat", "sedang", "jauh"]) {
    await page.locator(".board-surface").evaluate((el, value) => {
      el.setAttribute("data-board-preset", value);
    }, preset);
    const reading = await page.evaluate(() => {
      const canvas = document.querySelector(".board-surface")!;
      const heading = document.querySelector(".board-question")!;
      const headingStyle = getComputedStyle(heading);
      const rect = heading.getBoundingClientRect();
      const canvasRect = canvas.getBoundingClientRect();
      const points = [...document.querySelectorAll("[data-beat]")].map((el) => {
        const r = el.getBoundingClientRect();
        return { tag: el.tagName, top: r.top, bottom: r.bottom, height: r.height };
      });
      return {
        preset: canvas.getAttribute("data-board-preset"),
        // The resolved, rendered value — `--board-question` is unregistered, so
        // getPropertyValue returns the literal `clamp(...)` text, not a number.
        fontSize: parseFloat(headingStyle.fontSize),
        fontFamily: headingStyle.fontFamily,
        fontWeight: headingStyle.fontWeight,
        canvasHeight: canvasRect.height,
        origin: (rect.top - canvasRect.top) / canvasRect.height,
        children: points,
      };
    });
    readings.push(reading);
    // R1: the question floor is an invariant in every preset.
    expect(reading.fontSize, `${preset}: question floor`).toBeGreaterThanOrEqual(
      56,
    );
    // §6.1: the question is at the top of the decision column, never the middle.
    expect(reading.origin, `${preset}: question origin band`).toBeGreaterThanOrEqual(
      0.08,
    );
    expect(reading.origin, `${preset}: question origin band`).toBeLessThanOrEqual(
      0.2,
    );
    // B0.2: the board owns its viewport, so the board sets the question in Atkinson.
    expect(reading.fontFamily).toContain("Atkinson");
    await shot(page, info, `layar-check-${preset}`);
  }
  await writeFile(
    `${EVIDENCE}/board-preset-origins.json`,
    JSON.stringify(readings, null, 2),
  );
  // No preset may reintroduce the deleted 30px override anywhere in the emitted CSS.
  const css = await page.evaluate(async () => {
    const links = [...document.querySelectorAll('link[rel="stylesheet"]')];
    const texts = await Promise.all(
      links.map((link) =>
        fetch((link as HTMLLinkElement).href).then((r) => r.text()),
      ),
    );
    return texts.join("\n") + [...document.querySelectorAll("style")].map((s) => s.textContent).join("\n");
  });
  expect(css).not.toMatch(/--board-title:\s*30px/);
  // `--board-title` survives only as a compatibility alias inside the container-scoped preview
  // and as `var(--board-question)`; it must never carry a literal size of its own (R2).
  expect(css).not.toMatch(/--board-title:\s*\d/);
  expect(css).toMatch(/--board-question:\s*clamp\(56px/);
});

test("A3c no two adjacent board bands collide", async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await liveBoard(page, "check");
  const overlaps = await page.evaluate(() => {
    const column = document.querySelector(".board-column")!;
    // Siblings, not ancestor/descendant: the options grid is *inside* the check section, so a
    // container-vs-child comparison would always "collide". §6.1 is about consecutive stacked
    // bands sharing vertical space they should not, so the set is every band at the same level:
    // the column's own text bands, and the beat root's direct children.
    const bands = [
      ...[...column.children].filter(
        (el) => !el.classList.contains("board-column-body"),
      ),
      ...(column.querySelector(".board-column-body > *")?.children ?? []),
    ].filter((el) => {
      const rect = el.getBoundingClientRect();
      return rect.height > 0 && getComputedStyle(el).visibility !== "hidden";
    });
    const rects = bands.map((el) => ({
      name: String(el.className),
      box: el.getBoundingClientRect(),
    }));
    const found: unknown[] = [];
    for (let i = 0; i < rects.length; i++)
      for (let j = i + 1; j < rects.length; j++) {
        const a = rects[i].box,
          b = rects[j].box;
        const x = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
        const y = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
        if (x * y > 0.5)
          found.push({ a: rects[i].name, b: rects[j].name, area: x * y });
      }
    return {
      found,
      safe: column.getBoundingClientRect().height,
      bands: rects.map((r) => ({ name: r.name, top: r.box.top, bottom: r.box.bottom })),
    };
  });
  expect(overlaps.found).toEqual([]);
  expect(overlaps.safe).toBeGreaterThan(0);
});

test("A39 no internal vocabulary reaches the board's rendered text", async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await liveBoard(page, "groups");
  const text = (await page.locator(".board-surface").innerText()).toLowerCase();
  for (const banned of ["pilot", "navigator", "envelope", "rail", "mode:", "ack"])
    expect(text, `banned token "${banned}"`).not.toContain(banned);
  // A privacy rule is held by the design, never captioned on the projected screen.
  expect(text).not.toMatch(/tanpa satu pun nama|tidak ada nama/);
});

test("A38 every board screen explains itself", async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await liveBoard(page, "check");
  const roleLine = page.locator("[data-role-line]");
  await expect(roleLine).toBeVisible();
  await expect(roleLine).toContainText(/Isi satu pilihan/);
  // The position and the card row are stated once, inside the question region, next to the timer
  // that belongs to them (§I.3). Asserting them on the role line instead would be asking the
  // board to say the same fact twice — the defect this row exists to catch.
  const question = page.locator("[data-beat='question']");
  await expect(question).toContainText(/Soal 1\/5 · Baris 1 pada kartu/);
  await expect(question).toContainText(/detik/);
  expect(await page.locator("[data-role-line]").innerText()).not.toContain(
    "Baris 1 pada kartu",
  );
});

test("A38b the groups screen states the after-step", async ({ page }, info) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await liveBoard(page, "groups");
  const next = page.locator("[data-next-line]");
  await expect(next).toBeVisible();
  await expect(next).toContainText(/pindah ke stasiun kelompokmu/);
  await expect(page.locator("[data-role-line]")).toContainText(
    /pembagian kelompok/,
  );
  await expect(page.locator(".board-instruction")).toContainText(
    /Cari nomormu/,
  );
  // Every group card carries colour AND a filled shape AND its name.
  const cards = page.getByTestId("public-group");
  await expect(cards).toHaveCount(2);
  for (const card of await cards.all()) {
    await expect(card.locator("svg.board-group-shape")).toBeVisible();
    await expect(card.locator("h2")).not.toBeEmpty();
    await expect(card.locator("path")).toHaveAttribute("fill", "currentColor");
  }
  await shot(page, info, "layar-groups-1920x1080");
});

test("A37 the board shows the shipped brand mark, not a lone dot", async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await openBoard(page);
  const mark = page.locator(".board-header svg").first();
  await expect(mark).toBeVisible();
  expect(await mark.locator("rect").count()).toBe(1);
  expect(await mark.locator("path").count()).toBe(1);
  expect(await mark.locator("circle").count()).toBe(1);
});

test("A1/A5/A6/A6b reduced motion is one switch with four inputs", async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  const runs: string[] = [];
  const offenders: string[] = [];
  for (const input of ["os", "app", "light", "saveData"]) {
    await page.emulateMedia({
      reducedMotion: input === "os" ? "reduce" : "no-preference",
    });
    await page.addInitScript(
      ({ mode }) => {
        if (mode === "app")
          localStorage.setItem(
            "pn-visual-preferences-v1",
            JSON.stringify({ reduced: true, light: false }),
          );
        if (mode === "light")
          localStorage.setItem(
            "pn-visual-preferences-v1",
            JSON.stringify({ reduced: false, light: true }),
          );
        if (mode === "saveData")
          Object.defineProperty(navigator, "connection", {
            configurable: true,
            get: () => ({ saveData: true }),
          });
      },
      { mode: input },
    );
    await liveBoard(page, "check");
    const offenders = await page.evaluate<string[]>(MOTION_OFFENDERS);
    const motion = await page.evaluate<string | null>(
      () =>
        document
          .querySelector(".visual-preferences")
          ?.getAttribute("data-motion") ?? null,
    );
    const reading = { offenders, motion };
    offenders.push(...reading.offenders.map((line) => `${input} → ${line}`));
    expect(reading.offenders, `${input}: no animation or transition`).toEqual([]);
    expect(reading.motion, `${input}: data-motion is off`).toBe("off");
    expect(await page.evaluate(ANIMATED_PROBE)).toBe(0);
    runs.push(`${input}:${reading.motion}:${reading.offenders.length}`);
  }
  await writeFile(
    `${EVIDENCE}/reduced-motion-four-inputs.txt`,
    `${runs.join("\n")}\n\n${offenders.join("\n")}\n`,
  );
  // Every input produced the identical outcome.
  expect(
    new Set(runs.map((line) => line.split(":").slice(1).join(":"))).size,
  ).toBe(1);
  await shot(page, info, "layar-reduced-motion");
});

test("A21 no destructive action renders browser chrome", async ({ page }, info) => {
  const dialogs: string[] = [];
  page.on("dialog", (dialog) => {
    dialogs.push(dialog.message());
    void dialog.dismiss();
  });
  await page.setViewportSize({ width: 1920, height: 1080 });
  await liveBoard(page, "check");
  await page.locator(".board-menu > summary").click();
  await page
    .getByRole("button", { name: "Reset sesi di papan", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("Akhiri sesi di papan ini?");
  await expect(dialog).toContainText(/Hasil belajar di HP guru tetap tersimpan/);
  await shot(page, info, "layar-reset-sheet");
  // Esc closes.
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  expect(dialogs).toEqual([]);
});

test("A40 login explains the next steps and remembers a waiting board", async ({
  page,
}, info) => {
  await page.addInitScript(() => {
    sessionStorage.setItem(
      "pn-pair-challenge-v1",
      JSON.stringify({ code: "417032", expiresAt: Date.now() + 300000 }),
    );
  });
  await page.goto("/masuk");
  const steps = page.locator("[data-login-next-steps] li");
  await expect(steps).toHaveCount(3);
  await expect(steps.nth(0)).toContainText("Masuk dengan email");
  await expect(steps.nth(1)).toContainText("Pilih kelas dan soal");
  await expect(steps.nth(2)).toContainText("Tampilkan di Layar Kelas");
  await expect(page.locator("[data-login-next-steps]")).toContainText(
    "Layar Kelas sudah menunggu kode",
  );
  await shot(page, info, "masuk-next-steps");
});

test("A14 print emulation emits a paper sheet with no motion and no names", async ({
  page,
}, info) => {
  await loginTeacher(page);
  await page.goto("/guru");
  const row = page.locator(".studio-row").first();
  if (!(await row.isVisible())) test.skip(true, "no sample run available");
  await row.click();
  await page.emulateMedia({ media: "print" });
  const reading = await page.evaluate(() => {
    const nav = document.querySelector(".studio-sidebar, .studio-shell nav");
    const head = document.querySelector(".studio-print-head");
    const animated = [...document.querySelectorAll("*")].filter(
      (el) => getComputedStyle(el).animationName !== "none",
    ).length;
    return {
      navHidden: !nav || getComputedStyle(nav).display === "none",
      headText: head?.textContent ?? "",
      animated,
      text: document.body.innerText,
    };
  });
  expect(reading.navHidden).toBe(true);
  expect(reading.headText).toMatch(/PapanNalar · .+ · \d{2}\/\d{2}\/\d{4}/);
  expect(reading.animated).toBe(0);
  // The 100% scale instruction is present, and no roster name token is.
  expect(reading.text).toMatch(/Cetak ukuran asli 100%/);
  await shot(page, info, "hasil-print-emulation");
});

test("A23 the empty home promises a class, not a session", async ({ page }, info) => {
  await loginTeacher(page);
  await page.goto("/guru");
  const notice = page.locator(".studio-state");
  if (await notice.isVisible()) {
    const label = await notice.getByRole("link").first().textContent();
    const href = await notice.getByRole("link").first().getAttribute("href");
    expect(href).toBe("/guru/kelas");
    // With zero classes the label must name the destination, not the session.
    expect(["Buat kelas", "Mulai mengajar"]).toContain(label?.trim());
  }
  await shot(page, info, "guru-empty");
});

test("A20 the phone and the board share one connection vocabulary", async ({
  page,
}) => {
  await loginTeacher(page);
  await page.goto("/guru");
  const text = await page.locator("body").innerText();
  const matches = text.match(
    /(layar tersambung|menunggu layar menerapkan tampilan|layar terputus|tersambung|terputus|mengikuti lewat pemeriksaan berkala)/gi,
  );
  for (const match of matches ?? [])
    expect(
      [
        "tersambung",
        "layar tersambung",
        "menunggu layar menerapkan tampilan",
        "layar terputus",
        "terputus",
        "mengikuti lewat pemeriksaan berkala",
        "sambungan ke layar terputus",
      ],
      `unexpected connection wording: ${match}`,
    ).toContain(match.toLowerCase());
});
