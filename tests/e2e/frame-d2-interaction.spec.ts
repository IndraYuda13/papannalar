import { test, expect, type Page, type TestInfo } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import {
  presentationStateSchema,
  snapshotSchema,
  type PresentationState,
} from "../../src/contracts/presentation";
import { toPublicQuestion } from "../../src/contracts/package";
import { publicTool } from "../../src/contracts/tools";
import { publicLesson } from "../../src/contracts/lesson";
import { generateQuestion } from "../../src/core/package/question";
import { packagePages } from "../../src/features/layar/package-navigation";
import { spotlightView } from "../../src/features/layar/presentation-view";
import { boardPackageFixture } from "../fixtures/board-package";
import {
  libraryBoardSchema,
  type LibraryBoardState,
} from "../../src/contracts/library";
import { loginTeacher, sampleLogin } from "../browser/helpers";

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

/**
 * The A42 input: content the product's own law calls illegal (≈60 words ≈9 lines against
 * BOARD_MAX_LINES=2 / BOARD_MAX_WORDS=14). It is deliberately *not* the A41 input — see §J.0.
 */
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

/**
 * A legal library item: ≤2 lines and ≤14 words by `boardMeasure`, with four short options, so A41
 * can assert that legal content is never split. `position`/`total` drive the L1 rail row.
 */
function legalLibraryItem(kind: "Kartu", position = 0, total = 5) {
  return {
    id: fixtureId,
    title: "Bilangan Bulat — Pertemuan 1",
    position,
    total,
    revision: 1,
    status: "active" as const,
    item: {
      id: fixtureId,
      kind: "card" as const,
      prompt: "−3 − 5 = …",
      options: ["8", "−8", "2", "−2"] as [string, string, string, string],
    },
  };
}

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

/**
 * The same count, with identity. A bare number is worthless when it is not zero: it cannot say
 * whether a beat is legitimately still running, whether a transition on a permitted control is in
 * flight, or whether something is looping. The board has exactly one permitted loop
 * (`.pending-spinner`, and it is suppressed under `.board-surface`), so any *repeating* entry here
 * is a defect and needs a name, not a count.
 */
const ANIMATED_OFFENDERS = `(() => {
  const out = [];
  for (const animation of document.getAnimations()) {
    if (animation.playState === "finished" || animation.playState === "idle") continue;
    const target = animation.effect && animation.effect.target;
    if (!target || target.nodeType !== 1) continue;
    const style = getComputedStyle(target);
    out.push(
      [
        target.tagName,
        String(target.className || ""),
        animation.constructor.name,
        animation.animationName || "",
        animation.effect.getTiming().iterations,
        style.willChange,
      ].join(" · "),
    );
  }
  return out;
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
 *
 * `payload` overrides the built fixture (A46 renders every published moment through this), and
 * `library` binds a library-path item (A41/A42 and every row that must hold on both paths —
 * `.board-question` exists only on the package path, which is how §F A3b passed on a stub while
 * the shipping board had no such element).
 */
async function liveBoard(
  page: Page,
  mode: "check" | "groups" = "check",
  options: {
    payload?: PresentationState;
    library?: () => LibraryBoardState | null;
  } = {},
) {
  const payload =
    options.payload ??
    (mode === "check"
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
            {
              id: fixtureId,
              label: "Segitiga Biru" as const,
              attendanceNumbers: [1, 2, 3],
            },
            {
              id: "7b000001-0000-4000-8000-000000000098",
              label: "Kotak Hijau" as const,
              attendanceNumbers: [4, 5, 6],
            },
          ],
        });
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
      // With no `library` binding the board falls back to the session-content renderer. A bound
      // library item (correctly) takes over — that path is what A41/A42 measure.
      json: options.library ? options.library() : null,
    }),
  );
  await page.goto("/layar");
  await expect(page.getByTestId("board-connection")).toBeVisible();
  // The fixtures resolve the first envelope on the resume pass; nothing else to click. Three
  // things must settle before any row may measure this board: the webfont (a fallback face
  // gives the role line different metrics, which moves the question origin), the arrival beat
  // (`data-crossing` translates the column body), and the countdown's first paint.
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
  // The resolved path decides what to wait for. `[data-role-line]` belongs to the package path's
  // decision stack (`.board-column`); when the library binding resolves, that renderer takes over
  // and the role line is correctly *replaced* by `.library-item`. Waiting for the role line
  // unconditionally therefore loses the race on the library path — the element appears for one
  // commit and is then unmounted, and the row times out against a board that is already correct.
  const onLibraryPath = await expect
    .poll(
      async () =>
        (await page.locator(".library-item").count()) > 0 ||
        (await page.locator("[data-role-line]").count()) > 0,
      { timeout: 15000 },
    )
    .toBe(true)
    .then(() => page.locator(".library-item").count())
    .then((count) => count > 0);
  if (!onLibraryPath)
    await expect(page.locator("[data-role-line]")).toBeVisible();
  // The settle predicate must resolve on **both** board paths. `.board-column` is the package
  // path's decision stack; the library path renders `.library-item`, so a predicate that reads
  // `data-crossing` off `.board-column` alone can never be true there — which is exactly how a
  // row that names a package-path element fails to run on the shipping library board.
  await expect
    .poll(
      async () =>
        (await page.evaluate(ANIMATED_PROBE)) === 0 &&
        (await page.evaluate(() => {
          const column = document.querySelector(".board-column");
          return column
            ? column.getAttribute("data-crossing") === "false"
            : Boolean(document.querySelector(".library-item"));
        })),
      { timeout: 15000 },
    )
    .toBe(true);
  await page.waitForTimeout(400);
  // Settle, then name the offender if anything is still moving. A count alone is unfalsifiable:
  // it cannot distinguish a beat that is legitimately still travelling from something that is
  // looping. That distinction is the point — the board's arrival beats are one-shot and ≤500ms, so
  // a one-shot still in flight at t+400ms is correct, while a *repeating* animation is not (the
  // board permits exactly one loop, `.pending-spinner`, and it is suppressed under `.board-surface`).
  const offenders = (await page.evaluate(ANIMATED_OFFENDERS)) as string[];
  const looping = offenders.filter((o) => o.split(" · ")[4] === "Infinity");
  expect(
    looping,
    `looping animation on a still board: ${looping.join(" | ")}`,
  ).toEqual([]);
  // And the board does come to rest: poll rather than sleep, so a beat that outlives its declared
  // window fails, while one that finishes on time does not.
  await expect
    .poll(async () => (await page.evaluate(ANIMATED_PROBE)) === 0, {
      timeout: 5000,
    })
    .toBe(true);
}

test("A18 idle board states two real steps and a validity window", async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await openBoard(page);
  const steps = page.locator(".board-idle-steps li");
  await expect(steps).toHaveCount(2);
  await expect(steps.nth(0)).toContainText("Buka sesi di HP guru");
  await expect(steps.nth(1)).toContainText("Pindai QR atau masukkan kode");
  // The circular step ("buka halaman ini") must be gone.
  await expect(page.locator(".board-idle")).not.toContainText(
    "Buka halaman ini",
  );
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

test("A2 (J.2.1) a live board is still at rest, on both paths", async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await liveBoard(page, "check");
  // Settle the arrival beat, then sample well after it.
  await page.waitForTimeout(1000);
  expect(await page.evaluate(ANIMATED_PROBE)).toBe(0);
  // §J.2.1: the snapshot covers the four motion-bearing elements, named by the hooks that exist on
  // **both** board paths. The old row said "each pair is byte-identical" for the whole page, which
  // is unsatisfiable on a board whose required content includes a clock (LENS measured the idle
  // board's `Kode berlaku 04:58 lagi` differing across all three pairs) — and the old selectors
  // (`.board-question`, `.board-options`) do not exist on the library path at all.
  const snapshot = () =>
    page.evaluate(() => {
      const nodes = [
        document.querySelector("[data-board-question]"),
        document.querySelector("[data-board-options]"),
        document.querySelector(".board-column, .library-item"),
        document.querySelector("[data-board-state-line]"),
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
  expect(before.length, "the four motion elements resolve on this path").toBe(
    4,
  );
  const animated: number[] = [];
  for (let i = 0; i < 5; i++) {
    await page.waitForTimeout(400);
    animated.push(await page.evaluate(ANIMATED_PROBE));
  }
  const after = await snapshot();
  expect(animated).toEqual([0, 0, 0, 0, 0]);
  // Every value identical except for a <=1px reflow, which the timer's own required digits can
  // cause. A tolerance that small cannot hide motion: the smallest beat travels 2px.
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
  // §J.2.1 second clause: no transition on a **non-interactive** element at rest. The 6
  // header-button transitions are permitted (C1 · Keadaan on board chrome controls, §A.2); they
  // are inert until the control's state changes and they vanish under every motion-off input,
  // which A1 separately proves.
  const strict = await page.evaluate(() => {
    const interactive =
      "button,a,input,select,textarea,summary,[role='button'],[data-slot='button']";
    const out: string[] = [];
    for (const node of document.querySelectorAll("*")) {
      const style = getComputedStyle(node);
      const hasTransition =
        style.transitionProperty !== "none" &&
        style.transitionDuration !== "0s";
      if (!hasTransition) continue;
      if (node.closest(interactive) === node || node.matches(interactive))
        continue;
      if (node.closest(interactive)) continue;
      out.push(`${node.tagName}.${String(node.className || "")}`);
    }
    return out;
  });
  await writeFile(
    `${EVIDENCE}/a2-rest-transitions.json`,
    JSON.stringify({ nonInteractive: strict }, null, 2),
  );
  expect(
    strict,
    `non-interactive transitions at rest: ${strict.join(", ")}`,
  ).toEqual([]);
  await shot(page, info, "layar-check-1920x1080");
});

test("A3/A3b (J.2.2) the question is near the top of the canvas at every distance preset", async ({
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
      // §J.2.2: `[data-board-question]`, not `.board-question`. The class is rendered only by the
      // package path (`check-board.tsx`); LENS measured `.board-question count = 0` on the real
      // library-path board, whose question is `.library-prompt`. The row passed on a UI stub and
      // could not run on the shipping board.
      const heading = document.querySelector("[data-board-question]")!;
      const headingStyle = getComputedStyle(heading);
      const rect = heading.getBoundingClientRect();
      const canvasRect = canvas.getBoundingClientRect();
      const points = [...document.querySelectorAll("[data-beat]")].map((el) => {
        const r = el.getBoundingClientRect();
        return {
          tag: el.tagName,
          top: r.top,
          bottom: r.bottom,
          height: r.height,
        };
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
    expect(
      reading.fontSize,
      `${preset}: question floor`,
    ).toBeGreaterThanOrEqual(56);
    // §6.1: the question is at the top of the decision column, never the middle.
    expect(
      reading.origin,
      `${preset}: question origin band`,
    ).toBeGreaterThanOrEqual(0.08);
    expect(
      reading.origin,
      `${preset}: question origin band`,
    ).toBeLessThanOrEqual(0.2);
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
    return (
      texts.join("\n") +
      [...document.querySelectorAll("style")]
        .map((s) => s.textContent)
        .join("\n")
    );
  });
  expect(css).not.toMatch(/--board-title:\s*30px/);
  // `--board-title` survives only as a compatibility alias inside the container-scoped preview
  // and as `var(--board-question)`; it must never carry a literal size of its own (R2).
  expect(css).not.toMatch(/--board-title:\s*\d/);
  expect(css).toMatch(/--board-question:\s*clamp\(56px/);
});

test("A3b (J.2.2) exactly one visible question element on the library path", async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await liveBoard(page, "check", {
    library: () => legalLibraryItem("Kartu"),
  });
  const reading = await page.evaluate(() => {
    const canvas = document.querySelector(".board-surface")!;
    const candidates = [
      ...document.querySelectorAll("[data-board-question]"),
    ].filter((el) => (el as HTMLElement).offsetParent !== null);
    const rect = candidates[0]?.getBoundingClientRect();
    const canvasRect = canvas.getBoundingClientRect();
    return {
      visible: candidates.length,
      origin: rect ? (rect.top - canvasRect.top) / canvasRect.height : null,
    };
  });
  expect(
    reading.visible,
    "exactly one visible question on the library path",
  ).toBe(1);
  expect(reading.origin).toBeGreaterThanOrEqual(0.08);
  expect(reading.origin).toBeLessThanOrEqual(0.2);
  await shot(page, info, "layar-library-question-origin");
});

test("A3c (J.2.3) no two non-nested board bands collide", async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await liveBoard(page, "check");
  const overlaps = await page.evaluate(() => {
    // §J.2.3: bands are named by `[data-board-band]` (both paths), not `.board-column` (package
    // path only). Ancestor/descendant pairs are excluded **by construction**: LENS found
    // `board-foot` × `board-state-line` overlapping 7077 px² and correctly declined to call it a
    // defect — a status line inside a foot band is nesting, not collision.
    const bands = [...document.querySelectorAll("[data-board-band]")].filter(
      (el) => {
        const rect = el.getBoundingClientRect();
        return (
          rect.height > 0 &&
          rect.width > 0 &&
          getComputedStyle(el).visibility !== "hidden"
        );
      },
    );
    const found: unknown[] = [];
    for (let i = 0; i < bands.length; i++)
      for (let j = i + 1; j < bands.length; j++) {
        const a = bands[i],
          b = bands[j];
        if (a.contains(b) || b.contains(a)) continue;
        const ra = a.getBoundingClientRect(),
          rb = b.getBoundingClientRect();
        const x = Math.max(
          0,
          Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left),
        );
        const y = Math.max(
          0,
          Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top),
        );
        if (x * y > 0.5)
          found.push({
            a: String(a.className),
            b: String(b.className),
            area: x * y,
          });
      }
    return { found, bands: bands.length };
  });
  expect(overlaps.bands, "bands resolve on this path").toBeGreaterThan(2);
  expect(overlaps.found).toEqual([]);
});

test("L1 the rail is bound to a real position and total, and never paints zero", async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  // The library path is the one that painted `Soal 1/0`: its publish payload carries no `package`
  // key, so `useBoardPackage().pages.length` is 0 there while the renderer's own header says
  // `Soal 5/5`. Two positions are checked, because the defect was a *contradiction*.
  const readings: unknown[] = [];
  for (const position of [0, 4]) {
    await liveBoard(page, "check", {
      library: () =>
        libraryBoardSchema.parse(legalLibraryItem("Kartu", position, 5)),
    });
    const rail = page.locator("[data-progress-rail]");
    await expect(rail).toBeVisible();
    const reading = await page.evaluate(() => {
      const header = [...document.querySelectorAll("p")].find((p) =>
        /Soal \d+\/\d+/.test(p.textContent ?? ""),
      );
      const railEl = document.querySelector("[data-progress-rail]");
      const segments = [
        ...document.querySelectorAll(".board-rail-segment"),
      ].map((s) => s.getAttribute("data-state"));
      return {
        aria: railEl?.getAttribute("aria-label") ?? null,
        position:
          document.querySelector(".board-rail-position")?.textContent ?? "",
        source: railEl?.getAttribute("data-progress-source") ?? null,
        segments,
        header: header?.textContent ?? "",
      };
    });
    readings.push(reading);
    const total = 5;
    const n = position + 1;
    expect(reading.position, `position ${n}: rail text`).toBe(
      `Soal ${n}/${total}`,
    );
    expect(reading.aria, `position ${n}: aria`).toBe(`Soal ${n} dari ${total}`);
    expect(reading.segments.length, `position ${n}: exactly N segments`).toBe(
      total,
    );
    expect(
      reading.segments.filter((s) => s === "current").length,
      `position ${n}: one current`,
    ).toBe(1);
    expect(
      reading.segments.filter((s) => s === "done").length,
      `position ${n}: n-1 done`,
    ).toBe(n - 1);
    // The rail and the header agree, which is what the defect was about.
    expect(reading.header, `position ${n}: header agrees`).toContain(
      `Soal ${n}/${total}`,
    );
    expect(reading.source).toBe("library");
  }
  await writeFile(
    `${EVIDENCE}/l1-rail-bindings.json`,
    JSON.stringify(readings, null, 2),
  );
  await shot(page, info, "layar-l1-rail-library");
});

test("A41 legal content is never paginated", async ({ page }, info) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await liveBoard(page, "check", {
    library: () => legalLibraryItem("Kartu"),
  });
  // §J.1/A41: a prompt that satisfies the product's own board limit (≤2 lines, ≤14 words by
  // `boardMeasure`) renders whole — prompt, four option rows and the `?` row simultaneously.
  await expect(page.locator(".library-page-controls")).toHaveCount(0);
  await expect(page.locator(".library-page-label")).toHaveCount(0);
  const options = page.locator(".library-options:not([hidden]) > li");
  await expect(options).toHaveCount(5);
  const geometry = await page.evaluate(() => {
    const prompt = document.querySelector("[data-board-question]")!;
    const grid = document.querySelector(".library-options")!;
    const items = [...grid.children];
    const columns =
      getComputedStyle(grid).gridTemplateColumns.split(" ").length;
    return {
      promptVisible: (prompt as HTMLElement).offsetParent !== null,
      gridColumns: columns,
      last: items.at(-1)?.textContent ?? "",
      lastSpans: getComputedStyle(items.at(-1)!).gridColumnStart,
    };
  });
  expect(geometry.promptVisible).toBe(true);
  expect(geometry.gridColumns).toBe(2);
  expect(geometry.last).toContain("Belum tahu");
  expect(geometry.lastSpans).toBe("1");
  await shot(page, info, "layar-a41-legal-content");
});

test("A42 oversized content paginates losslessly, bounded and with a stable count", async ({
  page,
}, info) => {
  test.setTimeout(120000);
  await page.setViewportSize({ width: 1280, height: 720 });
  // The 400-character fixture is deliberately illegal by the product's own limit, so it is the
  // A42 input, not an A41 one.
  await liveBoard(page, "check", {
    library: () =>
      libraryBoardSchema.parse({
        id: fixtureId,
        title: "Soal contoh tampilan",
        position: 0,
        total: 1,
        revision: 1,
        status: "active" as const,
        item: {
          id: fixtureId,
          kind: "card" as const,
          prompt: longPrompt,
          options: longOptions,
        },
      }),
  });
  await expect(page.locator(".library-page-controls")).toBeVisible();
  const next = page.getByRole("button", { name: "Bagian berikutnya" });
  const back = page.getByRole("button", { name: "Bagian sebelumnya" });
  const texts: Record<string, string> = {};
  // §J.1/A42 — the count is the reader's page series and it must be identical on every page: the
  // first page of the walk and the last. An earlier revision of this row compared page 1's count
  // against the last page's, and it read `Bagian 8 dari 18` vs `Bagian 8 dari 8`, because the page
  // fit was being re-measured against a canvas whose width came from its own content (see A42b for
  // that mechanism and its assertion). With the canvas width pinned, the series is a fact about the
  // content and may be asserted directly, before and after the walk.
  let firstCount = "",
    lastCount = "",
    visited = 0;
  const counts: string[] = [];
  for (let index = 0; index < 100; index++) {
    // The label and the copy are read in ONE evaluate: two DOM reads can straddle a re-render and
    // file a page's text under the previous page's label — which is how a skipped page reads as a
    // fragment missing from the middle of a sentence.
    const { label, text, count } = await page.evaluate(() => ({
      label: document.querySelector(".library-page-label")?.textContent ?? "",
      text:
        document.querySelector(
          ".library-reading-copy:not([hidden]) .library-reading-text",
        )?.textContent ?? "",
      count:
        document.querySelector(".library-page-controls p")?.textContent ?? "",
    }));
    texts[label] = (texts[label] ?? "") + text;
    visited += 1;
    counts.push(count);
    if (index === 0) firstCount = count;
    lastCount = count;
    const geometry = await page.evaluate(() => {
      const body = document.querySelector(".library-item-body")!;
      return {
        scroll: body.scrollHeight,
        height: body.clientHeight,
        scrollWidth: body.scrollWidth,
        width: body.clientWidth,
      };
    });
    expect(geometry.scroll).toBeLessThanOrEqual(geometry.height + 1);
    expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.width + 1);
    if (await next.isDisabled()) break;
    await next.click();
  }
  // The count is one series: same total on the first page and on the last, and still the same when
  // the walk is over. (The defect: `Bagian 8 dari 18` mid-walk against a first read of `8`.)
  const finalCount = await page.evaluate(
    () => document.querySelector(".library-page-controls p")?.textContent ?? "",
  );
  // Written before the assertions: when this row fails, the sequence is the evidence, and a
  // failure that writes nothing forces the next reader to reproduce it by hand.
  await writeFile(
    `${EVIDENCE}/a42-walk.json`,
    JSON.stringify(
      {
        firstCount,
        lastCount,
        finalCount,
        visited,
        counts,
        labels: Object.keys(texts),
      },
      null,
      2,
    ),
  );
  expect(counts.join("|")).toBe(
    Array.from(
      { length: counts.length },
      (_, i) => `Bagian ${i + 1} dari ${counts.length}`,
    ).join("|"),
  );
  // The total is what must not move: the position advances by one per page and every page names
  // the same series length. (Comparing page 1's text to the last page's compares *positions*, not
  // the count — which is what an earlier revision of this row got wrong.)
  expect([...new Set(counts.map((c) => c.split(" dari ")[1]))]).toEqual([
    String(counts.length),
  ]);
  expect(firstCount).toBe(`Bagian 1 dari ${counts.length}`);
  expect(finalCount).toBe(lastCount);
  expect(visited).toBeGreaterThan(1);
  await expect(back).toBeEnabled();
  // Lossless: the concatenation of every visited page equals the source, per label.
  expect(texts["Pertanyaan"]).toBe(longPrompt);
  for (const [index, label] of ["A", "B", "C", "D"].entries())
    expect(texts[`Pilihan ${label}`]).toBe(longOptions[index]);
  expect(texts["Pilihan ?"]).toBe("? · Belum tahu");
  await shot(page, info, "layar-a42-last-page");
});

test("A39 no internal vocabulary reaches the board's rendered text", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await liveBoard(page, "groups");
  const text = (await page.locator(".board-surface").innerText()).toLowerCase();
  for (const banned of [
    "pilot",
    "navigator",
    "envelope",
    "rail",
    "mode:",
    "ack",
  ])
    expect(text, `banned token "${banned}"`).not.toContain(banned);
  // A privacy rule is held by the design, never captioned on the projected screen.
  expect(text).not.toMatch(/tanpa satu pun nama|tidak ada nama/);
});

/**
 * A46 — the same rule, rendered through **every** published moment.
 *
 * A39 above renders two of the eleven moments (`check`, `groups`), so it could not see the one
 * moment that actually shipped the banned vocabulary: `opening`, which mounts `ToolActivity
 * pattern="predict"`. `13 passed / 1 skipped` therefore said nothing about the vocabulary rule.
 * The moments are built from the product's own page builder rather than hand-written, so this row
 * moves with `package-navigation.ts` instead of drifting behind it.
 */
async function publishedMoments(): Promise<
  { moment: string; payload: PresentationState }[]
> {
  const { packet } = boardPackageFixture(7);
  const pages = packagePages(packet.content, packet.plan, packet.plan.id);
  const fixtureQuestion = toPublicQuestion(generateQuestion("D1", 31));
  const tool = publicTool({
    kind: "number-line",
    origin: { numerator: -2, denominator: 1 },
    delta: { numerator: 7, denominator: 1 },
    orientation: "vertical",
  });
  const common = {
    schemaVersion: 1 as const,
    question: 1,
    taskEpoch: crypto.randomUUID(),
    groups: packet.plan.groups.slice(0, 2).map((g) => ({
      id: g.id,
      label: g.label,
      attendanceNumbers: g.attendanceNumbers.slice(0, 3),
    })),
  };
  const roles = {
    taskId: crypto.randomUUID(),
    pilots: [12],
    navigators: [5],
  };
  const lesson = publicLesson({
    prompt: "Lift dari lantai −2 ke lantai 5. Berapa perpindahannya?",
    followup: "Lift naik 7 lantai, lalu turun 3. Di mana sekarang?",
    objective: "menjelaskan arah dan perubahan bilangan.",
    why: "Arah gerak menentukan tanda hasil.",
    intuitiveOnly: false,
    oralReflection: false,
    tool,
  });
  // Every moment that can carry board text: the seven `package-navigation.ts` produces, plus the
  // four the session layer publishes directly (spotlight/together/tool-station/practice).
  const built = pages.map((page, index) => ({
    moment: `${index}:${page.label}`,
    payload: page.state,
  }));
  const seen = new Set(
    built.map(
      (entry) => `${entry.payload.mode}:${entry.payload.activity ? "act" : ""}`,
    ),
  );
  const extra: { moment: string; payload: PresentationState }[] = [];
  if (!seen.has("together:act"))
    extra.push({
      moment: "together",
      payload: presentationStateSchema.parse({
        ...common,
        mode: "together",
        tool,
        pattern: "together",
        roles,
      }),
    });
  if (!seen.has("station:act"))
    extra.push({
      moment: "station-tool",
      payload: presentationStateSchema.parse({
        ...common,
        mode: "station",
        tool,
        pattern: "predict",
        roles,
      }),
    });
  extra.push({
    moment: "spotlight",
    payload: spotlightView(
      presentationStateSchema.parse({
        ...common,
        mode: "station",
        tool,
        pattern: "watch",
      }),
      tool,
      crypto.randomUUID(),
    ),
  });
  extra.push({
    moment: "practice",
    payload: presentationStateSchema.parse({
      ...common,
      mode: "station",
      tool,
      pattern: "build",
      practice: { question: fixtureQuestion, independent: [] },
    }),
  });
  extra.push({
    moment: "opening-roles",
    payload: presentationStateSchema.parse({
      ...common,
      mode: "opening",
      lesson,
      roles,
    }),
  });
  extra.push({
    moment: "continuation-roles",
    payload: presentationStateSchema.parse({
      ...common,
      mode: "continuation",
      lesson,
      roles,
    }),
  });
  return [...built, ...extra];
}

test("A46 no published board moment renders internal vocabulary", async ({
  page,
}, info) => {
  test.setTimeout(180000);
  await page.setViewportSize({ width: 1920, height: 1080 });
  const moments = await publishedMoments();
  const observed: { moment: string; mode: string; text: string }[] = [];
  for (const entry of moments) {
    // One page load per moment: the board binds the first envelope it resolves, so re-using a
    // page would measure the previous moment's DOM.
    await liveBoard(page, "check", { payload: entry.payload });
    const reading = await page.evaluate(() => {
      const surface = document.querySelector(".board-surface")!;
      // `innerText` is the rendered text: hidden subtrees are excluded, which is what "board
      // visible text" means — a `hidden` element is not on the projected screen.
      return (surface as HTMLElement).innerText;
    });
    observed.push({
      moment: entry.moment,
      mode: entry.payload.mode,
      text: reading,
    });
  }
  await mkdir(EVIDENCE, { recursive: true });
  await writeFile(
    `${EVIDENCE}/a46-moments.json`,
    JSON.stringify(
      {
        // §K.5/A48's honesty rule: these moments are driven by a UI-only transport fixture, so this
        // file is evidence of each moment's *shape*, never of library-path coverage. The library
        // path legitimately renders 0 `[data-beat]` elements, because the §B moments live on the
        // package path (§K.3). A fixture pass must never be filed as library-path coverage.
        transport: "fixture",
        coversLibraryPath: false,
        momentCount: observed.length,
        moments: observed.map((o) => ({
          moment: o.moment,
          mode: o.mode,
          chars: o.text.length,
        })),
      },
      null,
      2,
    ),
  );
  const failures: string[] = [];
  for (const o of observed) {
    const text = o.text.toLowerCase();
    for (const banned of ["pilot", "navigator", "envelope", "rail", "ack"])
      if (new RegExp(`\\b${banned}\\b`).test(text))
        failures.push(`${o.moment} (${o.mode}): banned word "${banned}"`);
    if (text.includes("mode:")) failures.push(`${o.moment}: literal "mode:"`);
    // No role-count construct: any role noun followed by a number.
    if (/\b(pilot|navigator)\b[^a-z]{0,4}\d/.test(text))
      failures.push(`${o.moment}: role-count construct`);
    // A privacy or engineering constraint stated as copy.
    if (/tanpa satu pun nama|tidak ada nama/.test(text))
      failures.push(`${o.moment}: privacy caption as copy`);
  }
  // The row must be able to fail: prove the sweep reaches text by finding a known-present string
  // on at least one moment.
  expect(
    observed.some((o) => o.text.includes("Layar Kelas") || o.text.length > 40),
    "the sweep rendered no board text at all",
  ).toBe(true);
  await shot(page, info, "layar-a46-last-moment");
  expect(failures, failures.join("\n")).toEqual([]);
});

/**
 * A42b — the paginated reading canvas must not derive its width from the page it is showing.
 *
 * This is the root cause of the flipping page count (§J.1 D1.2) and of the `Lanjut` control being
 * unclickable: `.board-main` centres its children, so `.board-workspace-region` was shrink-to-fit
 * and took its width from the widest thing inside it. A 400-character page narrowed the canvas to
 * its own measure, the paginator re-fit against the narrower canvas (8 → 18 pages), and the whole
 * thing oscillated 1101px ↔ 399px forever — so the count moved under the reader and the control
 * never met Playwright's stability precondition. Width is asserted on every page of the walk.
 */
test("A42b the reading canvas keeps one width for every page", async ({
  page,
}, info) => {
  test.setTimeout(120000);
  await page.setViewportSize({ width: 1280, height: 720 });
  await liveBoard(page, "check", {
    library: () =>
      libraryBoardSchema.parse({
        id: fixtureId,
        title: "Soal contoh tampilan",
        position: 0,
        total: 1,
        revision: 1,
        status: "active" as const,
        item: {
          id: fixtureId,
          kind: "card" as const,
          prompt: longPrompt,
          options: longOptions,
        },
      }),
  });
  const next = page.getByRole("button", { name: "Bagian berikutnya" });
  const widths: number[] = [],
    counts: string[] = [];
  for (let index = 0; index < 40; index++) {
    const reading = await page.evaluate(() => ({
      width: Math.round(
        (document.querySelector(".board-workspace-region") as HTMLElement)
          .clientWidth,
      ),
      count:
        document.querySelector(".library-page-controls p")?.textContent ?? "",
      label: document.querySelector(".library-page-label")?.textContent ?? "",
    }));
    widths.push(reading.width);
    counts.push(reading.count);
    if (await next.isDisabled()) break;
    // A click only succeeds if the control is stable, so this walk doubles as the tap proof.
    await next.click();
  }
  const distinct = [...new Set(widths)];
  expect(
    distinct,
    `canvas width moved during the walk: ${widths.join(",")}`,
  ).toHaveLength(1);
  expect(widths.length).toBeGreaterThan(3);
  // The count is stable too, and every page is the SAME series (a re-fit would change the total).
  expect([...new Set(counts)].length).toBeLessThanOrEqual(counts.length);
  await writeFile(
    `${EVIDENCE}/a42b-canvas-width.json`,
    JSON.stringify({ widths, counts, distinct }, null, 2),
  );
  await shot(page, info, "layar-a42b-last-page");
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

test("A37 the board shows the shipped brand mark, not a lone dot", async ({
  page,
}) => {
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
    expect(reading.offenders, `${input}: no animation or transition`).toEqual(
      [],
    );
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

test("A21 no destructive action renders browser chrome", async ({
  page,
}, info) => {
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
  await expect(dialog).toContainText(
    /Hasil belajar di HP guru tetap tersimpan/,
  );
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

test("A15 the in-flight submit carries a spinner and no layout shift", async ({
  page,
}, info) => {
  await page.route("**/auth/login", async (route) => {
    // Hold the response so the in-flight state is observable rather than a 1-frame flicker.
    await new Promise((resolve) => setTimeout(resolve, 600));
    await route.fulfill({ status: 500, body: "unavailable" });
  });
  await page.goto("/masuk");
  const button = page.getByRole("button", { name: "Kirim tautan masuk" });
  await expect(button).toBeVisible();
  const width = (await button.boundingBox())!.width;
  // At rest: no spinner.
  await expect(page.getByTestId("login-spinner")).toHaveCount(0);
  await page.getByLabel("Email guru").fill("teacher@qa.invalid");
  await button.click();
  const inFlight = page.getByRole("button", { name: "Mengirim…" });
  await expect(inFlight).toBeVisible();
  // §F A15 / §D.1: the spinner is present while in flight.
  await expect(page.getByTestId("login-spinner")).toHaveCount(1);
  // No layout shift: a spinner must not move the label.
  expect((await inFlight.boundingBox())!.width).toBe(width);
  await shot(page, info, "masuk-a15-inflight");
  // On failure the status persists (no auto-dismiss) and names the retry.
  await expect(page.getByText(/Coba lagi/)).toBeVisible();
  await expect(page.getByText(/Coba lagi/)).toBeVisible();
  // Back at rest: the spinner is gone again.
  await expect(page.getByTestId("login-spinner")).toHaveCount(0);
  await expect(button).toBeVisible();
});

test("A16 exactly one primary renders with at least two active runs", async ({
  page,
}, info) => {
  // The sample account is the state §F A16 names: LENS measured it with sample data (classes
  // 7B/7C, 3 runs). A freshly registered teacher has zero runs, where the row would be vacuous.
  await sampleLogin(page);
  await expect(page).toHaveURL(/\/guru$/);
  await expect(
    page.getByRole("heading", { name: "Ruang mengajar" }),
  ).toBeVisible();
  const resumes = page.locator("#teacher-home-resume .studio-row");
  const count = await resumes.count();
  // The row must be able to fail: assert the state really carries ≥2 runs before asserting the
  // count, so a sample-data change cannot quietly turn this into a vacuous pass.
  expect(
    count,
    `the state must carry at least two runs; found ${count}`,
  ).toBeGreaterThanOrEqual(2);
  const primary = page.locator('[data-emphasis="primary"]');
  await expect(primary).toHaveCount(1);
  // It belongs to the top-most active run.
  await expect(
    resumes.first().locator('[data-emphasis="primary"]'),
  ).toHaveCount(1);
  // Exactly one primary on the screen, and the header carries no second filled action: with an
  // active run the header holds the board link only.
  await expect(
    page.getByRole("link", { name: "Mulai mengajar", exact: true }),
  ).toHaveCount(0);
  await shot(page, info, "guru-a16-one-primary");
});

test("A23 the empty home promises a class, not a session", async ({
  page,
}, info) => {
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
