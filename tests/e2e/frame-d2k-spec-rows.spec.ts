import {
  test,
  expect,
  type Page,
  type TestInfo,
  type Browser,
} from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import {
  presentationStateSchema,
  publicPresentation,
  snapshotSchema,
  type PresentationState,
} from "../../src/contracts/presentation";
import { type LibraryBoardState } from "../../src/contracts/library";
import { openBoard, sampleLogin } from "../browser/helpers";
import { appOrigin } from "../harness/ports.mjs";

/** What the in-page recorder publishes on `window`. */
type Recorder = {
  samples: {
    t: number;
    distinct: number;
    rows: {
      tag: string;
      cls: string;
      name: string;
      pseudo: string;
      state: string;
      duration: number | string;
      iterations: number | string;
      /** `getTiming().delay` — §K.1 derives the 700 ms bound as ≤140 ms start + ≤500 ms. */
      delay: number | string;
      /** `getComputedTiming().endTime` = delay + activeDuration, i.e. ms from the trigger. */
      endTime: number;
      willChange: string;
      transform: string;
      opacity: string;
      owned: string;
    }[];
  }[];
  marks: Record<string, number>;
  firstSeen: Record<string, { tag: string; cls: string; text: string }>;
  /**
   * Every animation instance the recorder saw *reach `finished`*. Two independent timings, because
   * §K.5's 700 ms clause needs one that is exact and one that is observed:
   *
   *  - `atMs` — the wall-clock (`t0`-relative) moment it finished. Reported as corroboration but
   *    **not asserted against the trigger mark**: the mark is a DOM-observation proxy (a 40 ms scan
   *    plus the React commit), and it was measured landing 296 ms and 2424 ms after `t0` on two runs
   *    of the same fixture. That brackets the proxy's error well above the clause's own 60 ms margin
   *    (§K.1: ≤140 ms start + ≤500 ms = ≤640 ms, bound 700 ms), so bounding `atMs - mark` would turn
   *    page-load jitter into a red row.
   *  - `observedRunningMs` — from the first sample that *saw this instance running* to its `finished`.
   *    No proxy: the animation was already live when the clock started, so this is real elapsed
   *    running time and an animation that runs past the bound cannot hide behind a trigger mark.
   */
  finished: {
    name: string;
    cls: string;
    pseudo: string;
    atMs: number;
    observedRunningMs: number;
  }[];
};

declare global {
  interface Window {
    __d2k?: Recorder;
    __d2kStop?: () => void;
  }
}

/**
 * INTERACTION_DELTA_V4 **§K** acceptance rows — the T12-D (card `t_d81c5538`) amendment.
 *
 * This file is deliberately separate from `frame-d2-interaction.spec.ts`. §K's owner-of-record
 * arbitration (`t_5002d73b`) says two lanes must never edit the same rows; the sibling lane
 * (`t_b2065e25`) holds `A2`, `A3b`, `A3c` in that file, and §K.1's replacement `A36` plus the new
 * `A47`/`A48` are authored here so the two lanes cannot collide. Nothing in the original file is
 * deleted or weakened by this card.
 *
 * **The honesty rule (§K.3, §K.5) is the point of this file, not a footnote.** Every evidence JSON
 * written here records `transport: "fixture" | "real-data"` for the row that wrote it. A UI-only
 * transport fixture is legitimate evidence of a beat's **shape** — count, peak, duration,
 * composite-only, settle state — because a beat is CSS keyed on hooks the fixture mounts. It is
 * **not** evidence that real data reaches the moment. `A3b`, `A3c` and `A48` therefore run on a
 * **real bound library run**; only `A36`-replacement and `A47` are fixture-driven.
 *
 * Scoped sentence that belongs verbatim in the release evidence (§K.3):
 *
 *   "the board's immersive beats are a package-path property; a library run is a reading run and is
 *   deliberately calm. Immersive motion is therefore not verified for the library path, which is a
 *   scoped decision and not a coverage claim."
 *
 * **Revision note (LENS review round 1, changes requested).** Four defects in the first revision of
 * `A47` are repaired here, and the repair is the interesting part rather than a detail:
 *
 *  1. the trigger-existence guard was `expect(rec.marks[key]).not.toBeNull()`, which **cannot fail** —
 *     the recorder only writes `marks[key]` on a hit, so an absent trigger is `undefined`, and
 *     `expect(undefined).not.toBeNull()` passes. It is now `Number.isFinite(marks[key])`;
 *  2. `B3`, `B8`, `B9a` and `B9b` were listed in the selector map but driven by no moment, so the row
 *     claimed a trigger set it exercised only partly. Each now has a moment, driven through the
 *     product's own mechanism (a revoked session for `B8`, the product's 60 s clock for `B9`);
 *  3. §K.5's "at most 1 beat in flight" was computed and printed but asserted nowhere — it is now an
 *     expectation in `A47f` beside the peak clause it belongs to;
 *  4. §K.5's "reaches `finished` within 700 ms" was absent from the file entirely. It is now asserted
 *     twice per fired animation: the timeline's own `endTime` and the observed `finished` promise.
 *
 * None of the four was fixed by relaxing a claim. Each one makes the row able to fail where it
 * previously could not, which is the only direction a coverage repair may move.
 */
test.use({ trace: "off" });

const EVIDENCE = "artifacts/qa/frame-d2k";
const fixtureId = "7b000001-0000-4000-8000-000000000099";

/**
 * §K.5's completion bound: a fired beat must reach `finished` within **700 ms**. §K.1 derives it as
 * ≤140 ms start + ≤500 ms duration = ≤640 ms, so it is the clause that bounds the *start delay* —
 * `duration ≤ 500` alone does not. It is a named constant so the assertion and its evidence cite the
 * same number.
 */
const COMPLETION_BUDGET_MS = 700;

const SCOPED_SENTENCE =
  "the board's immersive beats are a package-path property; a library run is a reading run and is " +
  "deliberately calm. Immersive motion is therefore not verified for the library path, which is a " +
  "scoped decision and not a coverage claim.";

async function shot(page: Page, info: TestInfo, name: string) {
  await mkdir(EVIDENCE, { recursive: true });
  await page.screenshot({ path: `${EVIDENCE}/${name}.png`, fullPage: false });
  await info.attach(name, {
    path: `${EVIDENCE}/${name}.png`,
    contentType: "image/png",
  });
}

async function writeEvidence(name: string, body: unknown) {
  await mkdir(EVIDENCE, { recursive: true });
  await writeFile(`${EVIDENCE}/${name}`, JSON.stringify(body, null, 2));
}

/**
 * §A.2's definition, verbatim: a *distinct DOM element* that is the target of at least one
 * animation whose playState is neither `finished` nor `idle`. Deliberately NOT the naive
 * `getAnimations().filter(running).length`, which counts animations rather than elements.
 */
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
 * An in-page recorder armed at **document start**.
 *
 * A47 asks for the *sampled peak* of distinct animated elements on the beat named by **its own
 * trigger**, and every beat is ≤500 ms. Sampling after the board binds cannot see one: binding runs
 * resume → snapshot → ack → channel and took ≈4 s when measured on this box, while the beats are
 * over in under half a second. The recorder therefore starts before the first paint, samples every
 * 50 ms, and timestamps the moment each trigger attribute appears, so the peak can be computed
 * *inside* `[trigger, trigger + 900 ms]` instead of guessed after the window has closed.
 */
function recorder(selectors: Record<string, string>) {
  return `(() => {
  const SELECTORS = ${JSON.stringify(selectors)};
  let t0 = performance.now();
  const samples = [];
  const marks = {};
  const firstSeen = {};
  const finished = [];
  const watched = new WeakSet();
  /** Animation instance to the \`performance.now()\` of the first sample that saw it \`running\`. */
  const firstRunningAt = new Map();
  function owner(el) {
    const hits = [];
    for (const [key, sel] of Object.entries(SELECTORS)) {
      try { if (el.matches(sel) || el.closest(sel)) hits.push(key); } catch {}
    }
    return hits.join(",");
  }
  function sample() {
    const rows = [];
    const seen = new Set();
    for (const a of document.getAnimations()) {
      if (a.playState === "finished" || a.playState === "idle") continue;
      const target = a.effect && a.effect.target;
      if (!target || target.nodeType !== 1) continue;
      seen.add(target);
      const timing = a.effect.getTiming();
      const computed = a.effect.getComputedTiming();
      const style = getComputedStyle(target);
      rows.push({
        tag: target.tagName,
        cls: String(target.className || "").slice(0, 70),
        name: a.animationName || a.constructor.name,
        pseudo: (a.effect.pseudoElement || "").slice(0, 30),
        state: a.playState,
        duration: timing.duration,
        iterations: timing.iterations,
        delay: timing.delay,
        endTime: computed.endTime,
        willChange: style.willChange,
        transform: style.transform,
        opacity: style.opacity,
        owned: owner(target),
      });
      // §K.5's "reaches \`finished\` within 700 ms", measured rather than inferred. Two timings are
      // kept per instance because they answer two different questions and only one of them is safe to
      // bound: \`firstRunningAt\` is the first sample that observed this instance *running*, so
      // \`atMs - firstRunningAt\` is real elapsed running time; \`atMs - t0\` cannot be compared
      // against a trigger mark whose own error (40 ms scan + React commit) exceeds the clause's
      // margin.
      if (!watched.has(a)) {
        watched.add(a);
        firstRunningAt.set(a, performance.now());
        const label = {
          name: a.animationName || a.constructor.name,
          cls: String(target.className || "").slice(0, 70),
          pseudo: (a.effect.pseudoElement || "").slice(0, 30),
        };
        Promise.resolve(a.finished)
          .then(() => {
            const ended = performance.now();
            finished.push({
              ...label,
              atMs: Math.round(ended - t0),
              observedRunningMs: Math.round(ended - firstRunningAt.get(a)),
            });
            firstRunningAt.delete(a);
          })
          .catch(() => {});
      }
    }
    samples.push({ t: Math.round(performance.now() - t0), distinct: seen.size, rows });
  }
  function scan() {
    for (const [key, sel] of Object.entries(SELECTORS)) {
      let hit = null;
      try { hit = document.querySelector(sel); } catch {}
      if (hit && marks[key] == null) {
        marks[key] = Math.round(performance.now() - t0);
        firstSeen[key] = {
          tag: hit.tagName,
          cls: String(hit.className || "").slice(0, 70),
          text: (hit.textContent || "").trim().slice(0, 60),
        };
      }
    }
  }
  const start = () => {
    t0 = performance.now();
    scan();
    new MutationObserver(scan).observe(document.documentElement, {
      subtree: true, attributes: true, childList: true,
    });
    const timer = setInterval(sample, 50);
    const scanTimer = setInterval(scan, 40);
    window.__d2kStop = () => { clearInterval(timer); clearInterval(scanTimer); };
  };
  if (document.documentElement) start();
  else addEventListener("DOMContentLoaded", start);
  window.__d2k = { samples, marks, firstSeen, finished, note: "recorder armed at document start" };
})()`;
}

const A47_SELECTORS = {
  B1: '[data-crossing="true"]',
  B2: '[data-beat="question"]',
  B3: '[data-testid="board-connection"][data-arrived="true"]',
  B4a: '[data-beat="groups"]',
  B4b: '[data-testid="public-group"]',
  B5: '[data-reveal="true"]',
  B6a: "[data-progress-rail]",
  B6b: '.board-rail-segment[data-state="current"]',
  B7: '[data-testid="number-marker"]',
  B8: "[data-board-close]",
  B9a: '[data-urgent="true"]',
  B9b: '[data-expired="true"]',
};

/**
 * The peak of distinct animated elements inside `[trigger, trigger + 900 ms]` (§K.1's window,
 * which supersedes the old "800 ms" that contradicted §A.6's `[trigger, +760 ms]`), plus the max
 * seen at any 5 s sample **outside** every beat window.
 */
function analyse(rec: Recorder, windowKeys: string[]) {
  const windowStart = Math.min(
    ...windowKeys.map((key) => rec.marks[key]).filter((v) => v != null),
  );
  const hasWindow = Number.isFinite(windowStart);
  const inside = hasWindow
    ? rec.samples.filter((s) => s.t >= windowStart && s.t <= windowStart + 900)
    : [];
  const outside = hasWindow
    ? rec.samples.filter((s) => s.t > windowStart + 900)
    : rec.samples;
  // §K.1 samples "every 5 s outside the window"; the recorder samples at 50 ms, so the 5 s series
  // is taken by index (every 100th sample ≈ 5 s) to make the assertion the row's, not the
  // recorder's, granularity.
  const fiveSecond = outside.filter((_, i) => i % 100 === 0);
  return {
    windowStart: hasWindow ? windowStart : null,
    insidePeak: inside.length ? Math.max(...inside.map((s) => s.distinct)) : 0,
    insideSamples: inside.length,
    outsidePeak: outside.length
      ? Math.max(...outside.map((s) => s.distinct))
      : 0,
    fiveSecondPeak: fiveSecond.length
      ? Math.max(...fiveSecond.map((s) => s.distinct))
      : 0,
    fiveSecondSamples: fiveSecond.length,
    allPeak: rec.samples.length
      ? Math.max(...rec.samples.map((s) => s.distinct))
      : 0,
  };
}

/** Distinct animations seen, with the timing facts A47 asserts on. */
function animations(rec: Recorder) {
  const out = new Map<
    string,
    {
      name: string;
      duration: number | string;
      iterations: number | string;
      delay: number | string;
      endTime: number;
      owned: Set<string>;
      pseudo: string;
      cls: string;
    }
  >();
  for (const s of rec.samples)
    for (const r of s.rows) {
      const key = `${r.name}|${r.pseudo}|${r.cls}`;
      const entry = out.get(key) ?? {
        name: r.name,
        duration: r.duration,
        iterations: r.iterations,
        delay: r.delay,
        endTime: r.endTime,
        owned: new Set<string>(),
        pseudo: r.pseudo,
        cls: r.cls,
      };
      if (r.owned) entry.owned.add(r.owned);
      entry.endTime = Math.max(entry.endTime, r.endTime);
      out.set(key, entry);
    }
  return [...out.values()].map((v) => ({ ...v, owned: [...v.owned] }));
}

function ms(value: number | string): number {
  if (typeof value === "number") return value;
  if (value.endsWith("ms")) return Number.parseFloat(value);
  if (value.endsWith("s")) return Number.parseFloat(value) * 1000;
  return Number.parseFloat(value);
}

/**
 * A live board fed by a **UI-only transport fixture** (§K.3 item 2). No teacher or session row is
 * written into the shared audit database; the fixture only answers the board's own transport.
 *
 * `payload.route` is left to the caller so a **real** bound run can drive the same surface when the
 * `library` option is omitted — that is what makes A3b/A3c/A48 real-data rows.
 */
async function fixtureBoard(
  page: Page,
  payload: PresentationState,
  library: LibraryBoardState | null = null,
  options: {
    p95Ms?: number | null;
    motionOff?: "os" | "app" | "light" | "saveData";
    realTransport?: boolean;
    /**
     * Read the payload on **every** request instead of capturing it once, so a row can drive a
     * question change (a new revision) inside one window without re-routing anything.
     */
    livePayload?: () => { payload: PresentationState; revision: number };
    /**
     * Drives `B8` (`[data-board-close]`). When this returns true every pairing call answers `404`,
     * which is the product's own terminator: `connection-transport.ts`'s `isTerminal` treats
     * `[401,403,404,409]` as a revoked session, sets `session: "closed"` and nulls the snapshot — so
     * `board-workspace.tsx`'s `closed` branch renders the closing card. Nothing is mocked beyond the
     * transport answer, which is what a closed session actually returns.
     */
    closing?: () => boolean;
  } = {},
) {
  const now = new Date().toISOString();
  const buildSnapshot = () => {
    const live = options.livePayload?.() ?? { payload, revision: 1 };
    return snapshotSchema.parse({
      envelope: {
        protocolVersion: 1,
        presentationId: fixtureId,
        channelEpoch: fixtureId,
        revision: live.revision,
        commandId: fixtureId,
        packageVersion: "prelim-7b-v1",
        payload: live.payload,
      },
      ackRevision: live.revision,
      ackCommandId: fixtureId,
      ackAt: now,
    });
  };
  await page.addInitScript(
    ({ id, p95 }) => {
      // MEASURED, not declared. `src/core/tools/capabilities.ts` derives
      // `reducedMotion: input.p95Ms === null || input.p95Ms >= 500`, and the board writes that
      // straight onto `data-reduced-motion`, whose CSS net is `animation: none !important` for
      // every descendant. A profile with `p95Ms: null` therefore turns EVERY beat off — measured
      // on this revision: with `p95Ms: null` the question computes `animationName: none` and only
      // `pn-rule-draw` fires on the rail/state rule; with `p95Ms: 120` the question gets
      // `pn-beat-rise`, each option row gets `pn-beat-arrive`, and the column body rises.
      //
      // A fixture that declares an unmeasured profile cannot exercise the beat path at all, so the
      // §K.1/§K.5 rows set a measured value. Evidence: `capability-motion-gate.json`.
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
          samples: 3,
          medianMs: 40,
          p95Ms: p95,
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
    { id: fixtureId, p95: options.p95Ms === undefined ? 120 : options.p95Ms },
  );
  if (options.motionOff) {
    // The four motion-off inputs of §A.3/A.5, exactly as the existing reduced-motion row drives
    // them: OS preference, the app switch, light display, and saveData.
    const which = options.motionOff;
    await page.emulateMedia({
      reducedMotion: which === "os" ? "reduce" : "no-preference",
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
      { mode: which },
    );
  }
  if (options.realTransport) return;
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
  await page.route("**/api/v1/board/library", (route) =>
    route.fulfill({ json: library }),
  );
  await page.route("**/api/v1/board/pairing", async (route) => {
    // B8's terminator (see the `closing` option above).
    if (options.closing?.())
      return route.fulfill({
        status: 404,
        json: { error: { code: "REVOKED" } },
      });
    const { action } = route.request().postDataJSON();
    const json =
      action === "resume"
        ? { snapshot: buildSnapshot() }
        : action === "snapshot"
          ? buildSnapshot()
          : action === "status"
            ? { presentationId: null, expired: false }
            : action === "channel"
              ? { kind: "snapshot" }
              : action === "heartbeat"
                ? (() => {
                    const live = options.livePayload?.() ?? {
                      payload,
                      revision: 1,
                    };
                    return {
                      channelEpoch: fixtureId,
                      revision: live.revision,
                      ackRevision: live.revision,
                      ackCommandId: fixtureId,
                      ackAt: now,
                      controllerSeenAt: now,
                      serverNow: now,
                    };
                  })()
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
}

/** The four hooks §K.1 keeps from `A2`, named by the selectors both board paths carry. */
const MOTION_HOOKS = [
  "[data-board-question]",
  "[data-board-options]",
  ".board-column, .library-item",
  "[data-board-state-line]",
];

/**
 * Wait until the *bound payload* is on screen, not merely until the board chrome exists.
 *
 * The idle screen ("Menyiapkan layar…") already carries `[data-testid="board-connection"]`, so any
 * wait on the chrome resolves before the session binds (resume → snapshot → ack → channel, ≈4 s
 * measured here) and every subsequent reading would describe the wrong screen. Waiting on the
 * moment's own content is what makes a reading describe the moment.
 */
async function waitBound(page: Page, selector: string, timeout = 45000) {
  await page.waitForSelector(selector, { state: "visible", timeout });
  // The beat is keyed to the mount; let it run and settle before any peak/still reading.
  await expect
    .poll(async () => page.evaluate(ANIMATED_PROBE), { timeout: 25000 })
    .toBe(0);
}

async function hookSnapshot(page: Page) {
  return page.evaluate((selectors) => {
    return selectors
      .map((selector) => {
        const el = document.querySelector(selector);
        if (!el) return null;
        const rect = el.getBoundingClientRect();
        const style = getComputedStyle(el);
        return {
          selector,
          identity: `${el.tagName}.${String(el.className || "")}`.slice(0, 90),
          top: Math.round(rect.top * 100) / 100,
          left: Math.round(rect.left * 100) / 100,
          width: Math.round(rect.width * 100) / 100,
          height: Math.round(rect.height * 100) / 100,
          opacity: style.opacity,
          transform: style.transform,
          willChange: style.willChange,
        };
      })
      .filter((v) => v !== null);
  }, MOTION_HOOKS);
}

/**
 * A **real bound library run** — the path §K.3 requires for `A3b`/`A3c`/`A48`, with **no transport
 * stub**.
 *
 * The mechanism is the product's own: a teacher session starts a library run
 * (`POST /api/v1/library {action:"start"}` → `run.id`), then claims the board's pairing code with
 * `sessionId: run.id` (`POST /api/v1/pairing {action:"claim"}`). That is exactly what
 * `usePresentationTransport({ sessionId: run.id })` does from the phone, and it is what makes
 * `public.library_board(p_presentation)` resolve a real row — so the board renders a real item, a
 * real position and a real total, and `LibraryBoard` replaces `BoardContent` (which is why
 * `[data-beat]` is legitimately 0 on this path).
 *
 * The device capability profile is declared rather than measured, because a *measured* headless
 * profile is how the board ends up motion-off and a calm assertion would then be vacuous. Declaring
 * a measured-looking profile means the calm claim is tested against a board that *can* animate.
 * That is the stronger test, and it is recorded in each evidence file.
 */
async function realLibraryBoard(page: Page, browser: Browser, items: number) {
  const headers = { Origin: appOrigin };
  const teacher = await browser.newContext({ baseURL: appOrigin });
  const phone = await teacher.newPage();
  await sampleLogin(phone);
  const takeover = await phone.request.post("/api/v1/sample/control", {
    headers,
    data: { takeover: true },
  });
  expect(takeover.ok(), `sample takeover: ${takeover.status()}`).toBe(true);

  const collectionId = crypto.randomUUID();
  const runId = crypto.randomUUID();
  const card = (index: number) => ({
    id: crypto.randomUUID(),
    kind: "card" as const,
    prompt: `−3 − ${index + 5} = …`,
    options: ["8", "−8", "2", "−2"] as [string, string, string, string],
    key: "B" as const,
    explanation: "Arah gerak menentukan tanda hasil.",
  });
  const save = await phone.request.post("/api/v1/library", {
    headers,
    data: {
      action: "save",
      id: collectionId,
      revision: 0,
      ready: true,
      document: {
        title: "T13 §K bound run",
        kind: "cards",
        items: Array.from({ length: items }, (_, i) => card(i)),
      },
    },
  });
  expect(save.ok(), `save collection: ${save.status()}`).toBe(true);
  // `GET /api/v1/classes` filters on `runtime_mode` (default `pilot`); the sample account's classes
  // are seeded `demo`, so the demo mode is named explicitly rather than assumed.
  const classes = await (
    await phone.request.get("/api/v1/classes?mode=demo", { headers })
  ).json();
  expect(classes.classes.length, "a real class is available").toBeGreaterThan(
    0,
  );
  const classId = classes.classes[0].id;
  const start = await phone.request.post("/api/v1/library", {
    headers,
    data: {
      action: "start",
      id: runId,
      classId,
      collectionId,
      version: 1,
      date: new Date().toISOString().slice(0, 10),
      mode: "teach",
    },
  });
  expect(start.ok(), `start run: ${start.status()}`).toBe(true);

  // The board surface, with a measured-looking device profile so motion is enabled.
  await fixtureBoard(
    page,
    publicPresentation({
      schemaVersion: 1,
      mode: "opening",
      question: 1,
      taskEpoch: crypto.randomUUID(),
      groups: [],
    }),
    null,
    { realTransport: true },
  );
  // Nothing else is stubbed on this path — including identity. `/api/v1/board/identity` performs
  // its own anonymous sign-in, so stubbing it would short-circuit the real session the rest of
  // this path depends on (measured: a stubbed identity leaves `/api/v1/board/pairing` at 401 and
  // the board never reaches a pairing code).
  await openBoard(page);
  const codeField = page.getByTestId("pairing-code");
  await codeField.waitFor({ state: "visible", timeout: 40000 });
  const code = (await codeField.textContent())!.replace(/\s/g, "");
  expect(
    code.length,
    `pairing code read from the board: ${JSON.stringify(code)}`,
  ).toBeGreaterThan(0);
  const claim = await phone.request.post("/api/v1/pairing", {
    headers,
    data: {
      action: "claim",
      code,
      sessionId: runId,
      classId,
      payload: publicPresentation({
        schemaVersion: 1,
        mode: "opening",
        question: 1,
        taskEpoch: crypto.randomUUID(),
        groups: [],
      }),
    },
  });
  expect(claim.ok(), `claim with the real run: ${claim.status()}`).toBe(true);
  return { teacher, phone, runId, classId, collectionId };
}

test.describe.configure({ mode: "default" });

test("A36 (K.1) a package-path board is still across a 3-minute window with two question changes", async ({
  page,
}, info) => {
  // §K.1's window is ≥3 minutes with two question changes. The full wall-clock window is what the
  // row names, so this test is deliberately slow and says so.
  test.setTimeout(360000);
  await page.setViewportSize({ width: 1920, height: 1080 });
  const check = (question: number) => ({
    packageId: fixtureId,
    revision: 1,
    total: 5,
    seconds: 80,
    question: {
      id: fixtureId,
      prompt: [{ kind: "text" as const, text: `−3 − ${question + 5} = …` }],
      options: [
        { label: "A", text: "8" },
        { label: "B", text: "−8" },
        { label: "C", text: "2" },
        { label: "D", text: "−2" },
      ],
      unknownLabel: "?" as const,
    },
  });
  // The two question changes §K.1 requires are driven as the product drives them: the same
  // presentation re-published at a new revision. `livePayload` is read on every transport request,
  // so a change inside the window needs no re-routing.
  let revision = 1;
  let current = presentationStateSchema.parse({
    schemaVersion: 1,
    mode: "check",
    question: 1,
    taskEpoch: fixtureId,
    groups: [],
    check: check(1),
    package: { id: fixtureId, revision: 1 },
  });
  await fixtureBoard(page, current, null, {
    livePayload: () => ({ payload: current, revision }),
  });
  await page.addInitScript(recorder(A47_SELECTORS));
  await page.goto("/layar");
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
  await waitBound(page, "[data-board-question]");
  // Take the post-beat baseline the row compares against.
  await page.waitForTimeout(400);
  const baseline = await hookSnapshot(page);
  const hookCensus = await page.evaluate(
    (selectors) =>
      selectors.map((selector) => ({
        selector,
        count: document.querySelectorAll(selector).length,
      })),
    MOTION_HOOKS,
  );
  // The four §K.1 hooks are the subject of this row: the row must resolve all four, or it would be
  // measuring a subset while claiming the set. The census is written to evidence so a partial
  // resolution can never be mistaken for a pass.
  expect(
    hookCensus.map((h) => h.count),
    `hook census: ${JSON.stringify(hookCensus)}`,
  ).toEqual([1, 1, 1, 1]);

  const samples: { t: number; animated: number; window: boolean }[] = [];
  const windows: { at: number; question: number; peak: number }[] = [];
  const beatWindowMs = 900;
  /**
   * §K.1 says "≥3 minutes", so the window is 180 s and the loop is bounded by the **clock**, not by
   * the change counter: exiting as soon as the second change has been observed would report a
   * window shorter than the one the row claims (measured: that earlier shape exited at 133 s).
   */
  const WINDOW_MS = 185000;
  const started = Date.now();
  let changes = 0;
  let lastWindow: number | null = null;

  while (Date.now() - started < WINDOW_MS) {
    const elapsed = Date.now() - started;
    // Two question changes inside the ≥3-minute window, at ~1/3 and ~2/3.
    const shouldChange =
      (changes === 0 && elapsed > 55000) || (changes === 1 && elapsed > 125000);
    if (shouldChange) {
      changes += 1;
      revision += 1;
      current = presentationStateSchema.parse({
        ...current,
        question: changes + 1,
        taskEpoch: crypto.randomUUID(),
        check: check(changes + 1),
      });
      await page.evaluate(() => window.dispatchEvent(new Event("online")));
      lastWindow = Date.now();
      // Peak *inside* [trigger, trigger + 900 ms], sampled as a peak.
      let peak = 0;
      while (Date.now() - lastWindow < beatWindowMs) {
        peak = Math.max(peak, await page.evaluate(ANIMATED_PROBE));
        await page.waitForTimeout(50);
      }
      windows.push({ at: elapsed, question: changes + 1, peak });
      await page.waitForTimeout(400);
    }
    const at = Date.now() - started;
    const insideWindow =
      lastWindow !== null && Date.now() - lastWindow <= beatWindowMs;
    if (!insideWindow)
      samples.push({
        t: at,
        animated: await page.evaluate(ANIMATED_PROBE),
        window: false,
      });
    await page.waitForTimeout(5000);
  }
  expect(changes, "the window carried two question changes").toBe(2);
  const windowSeconds = Math.round((Date.now() - started) / 1000);
  expect(
    windowSeconds,
    "§K.1 requires a window of ≥3 minutes",
  ).toBeGreaterThanOrEqual(180);

  const outsidePeak = samples.length
    ? Math.max(...samples.map((s) => s.animated))
    : 0;
  const insidePeak = windows.length
    ? Math.max(...windows.map((w) => w.peak))
    : 0;
  const after = await hookSnapshot(page);
  const drift: string[] = [];
  for (let i = 0; i < baseline.length; i++) {
    const a = baseline[i];
    const b = after[i];
    if (!b) {
      drift.push(`${a.selector}: disappeared`);
      continue;
    }
    if (b.identity !== a.identity)
      drift.push(`${a.selector}: identity changed`);
    for (const key of ["top", "left", "width", "height"] as const)
      if (Math.abs(Number(b[key]) - Number(a[key])) > 1)
        drift.push(`${a.selector}: ${key} ${a[key]} -> ${b[key]}`);
    for (const key of ["opacity", "transform", "willChange"] as const)
      if (b[key] !== a[key]) drift.push(`hooks ${a.selector}: ${key} changed`);
  }

  // Both A2 exemptions are inherited verbatim: required content that changes (the session timer,
  // the pairing countdown, expiry) is out of the byte-identity scope but must carry 0 animations;
  // interactive controls may declare C1 transitions. The four hooks carry neither, so the whole
  // drift list must be empty.
  expect(drift, drift.join("\n")).toEqual([]);
  // 0 distinct animated elements at every 5 s sample outside a beat window.
  expect(
    samples.filter((s) => s.animated !== 0),
    `animated outside the beat windows: ${JSON.stringify(samples.filter((s) => s.animated !== 0))}`,
  ).toEqual([]);
  // Sampled peak ≤ 8 inside a window.
  expect(insidePeak, "peak inside a beat window").toBeLessThanOrEqual(8);

  await writeEvidence("a36-window.json", {
    row: "A36",
    document: "INTERACTION_DELTA_V4 §K.1 (replaces §F A36)",
    transport: "fixture",
    transportNote:
      "UI-only transport fixture: drives the package path's own renderer with no session row written. " +
      "Evidence of the beat's SHAPE and of the still-board property; not evidence that real data reaches the moment.",
    windowSeconds,
    questionChanges: changes,
    beatWindowMs,
    sampled: samples.length,
    outsideWindowPeak: outsidePeak,
    insideWindowPeak: insidePeak,
    windows,
    hookCensus,
    hookDrift: drift,
    hooks: MOTION_HOOKS,
  });
  await shot(page, info, "a36-three-minute-window");
});

/**
 * §K.1's last clause: "under each of the four motion-off inputs, the same window reports 0 distinct
 * animated elements and 0 elements with a live transition, in addition to the equal-values clause."
 *
 * It is a separate row because it is a separate window, and because the existing `A1/A5` row proves
 * the *switch* produces identical outcomes while this one proves the **board** is the thing that
 * goes still — including the beats that A36's main body just measured as firing.
 */
test("A36 (K.1, second branch) all four motion-off inputs report 0 animated elements and 0 live transitions", async ({
  page,
}, info) => {
  test.setTimeout(180000);
  await page.setViewportSize({ width: 1920, height: 1080 });
  const check = {
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
  };
  const payload = presentationStateSchema.parse({
    schemaVersion: 1,
    mode: "check",
    question: 1,
    taskEpoch: fixtureId,
    groups: [],
    check,
    package: { id: fixtureId, revision: 1 },
  });
  const readings: Record<string, unknown> = {};
  for (const input of ["os", "app", "light", "saveData"] as const) {
    await fixtureBoard(page, payload, null, { motionOff: input });
    await page.addInitScript(recorder(A47_SELECTORS));
    await page.goto("/layar");
    await waitBound(page, '[data-beat="question"] .board-question');
    await page.evaluate(() => document.fonts.ready.then(() => undefined));
    // Give the arrival beats a full window to *fail* to appear, then read the census: a motion-off
    // board must never have started an animation, and the recorder has been watching since
    // document start, so this is a whole-window count rather than a post-hoc sample.
    await page.waitForTimeout(1500);
    const rec = (await page.evaluate(() => window.__d2k)) as Recorder;
    await page.evaluate(() => window.__d2kStop?.());
    const anims = animations(rec);
    const liveTransitions = await page.evaluate(() => {
      const out: string[] = [];
      for (const node of document.querySelectorAll("*")) {
        const s = getComputedStyle(node);
        if (s.transitionProperty !== "none" && s.transitionDuration !== "0s")
          out.push(
            `${node.tagName}.${String(node.className || "").slice(0, 50)}`,
          );
      }
      return out;
    });
    const reading = {
      animationsStarted: rec.samples.reduce(
        (total, s) => total + s.rows.length,
        0,
      ),
      distinctAnimationNames: [...new Set(anims.map((a) => a.name))],
      liveTransitions,
      stageReducedMotion: await page.evaluate(
        () =>
          document
            .querySelector("[data-reduced-motion]")
            ?.getAttribute("data-reduced-motion") ?? null,
      ),
    };
    readings[input] = reading;
    expect(
      reading.animationsStarted,
      `${input}: an animation started on a motion-off board`,
    ).toBe(0);
    expect(reading.liveTransitions, `${input}: live transitions`).toEqual([]);
  }
  await writeEvidence("a36-motion-off.json", {
    row: "A36 (second branch)",
    document: "INTERACTION_DELTA_V4 §K.1, final clause",
    transport: "fixture",
    transportNote:
      "UI-only transport fixture; the four inputs are the ones §A.3/A.5 names (OS preference, app switch, light display, saveData).",
    inputs: readings,
  });
  await shot(page, info, "a36-motion-off");
});

test("A47 (K.5) each §B moment fires its own named trigger, with its own timing budget", async ({
  page,
}, info) => {
  // Seven moments, one of which (`B9`) is defined by the product's own 60 s timer crossing 10 s and
  // then 0 s. The budget is dominated by that beat and says so rather than shortening the clock.
  test.setTimeout(600000);
  await page.setViewportSize({ width: 1920, height: 1080 });
  const groups = [
    {
      id: "7b000001-0000-4000-8000-000000000090",
      label: "Segitiga Biru" as const,
      attendanceNumbers: [1, 2, 3],
    },
    {
      id: "7b000001-0000-4000-8000-000000000091",
      label: "Kotak Hijau" as const,
      attendanceNumbers: [4, 5, 6],
    },
    {
      id: "7b000001-0000-4000-8000-000000000092",
      label: "Lingkaran Oranye" as const,
      attendanceNumbers: [7, 8, 9],
    },
    {
      id: "7b000001-0000-4000-8000-000000000093",
      label: "Belah Ketupat Ungu" as const,
      attendanceNumbers: [10, 11, 12],
    },
  ];
  const check = {
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
  };
  const tool = {
    kind: "number-line" as const,
    origin: { numerator: -2, denominator: 1 },
    delta: { numerator: 7, denominator: 1 },
    orientation: "vertical" as const,
  };
  const moments: {
    moment: string;
    keys: string[];
    /** The element that proves the moment actually mounted, so the reading describes it. */
    bound: string;
    payload: PresentationState;
    /** Extra trigger attributes to wait for *after* the moment binds (B9's two transitions). */
    awaitMarks?: string[];
    /** Drive `B8`'s revoked session (see `fixtureBoard`'s `closing` option). */
    closeSession?: boolean;
    /**
     * A selector whose element count is part of the beat's own claim, asserted per moment so a
     * partial mount cannot pass as the full one (§K.5 names `B4` as 4 `[data-testid="public-group"]`).
     */
    expectCount?: { selector: string; count: number };
    /**
     * `B9` is a **static** urgency beat (§B9: "no pulsing, no colour cycling, no sound"), so 0
     * animations inside its own window is the clause, not a vacuous reading. Every other moment
     * legitimately animates inside its window.
     */
    staticBeat?: boolean;
  }[] = [
    {
      moment: "B1/B2 check (crossing + question entrance)",
      keys: ["B1", "B2"],
      bound: '[data-beat="question"] .board-question',
      payload: presentationStateSchema.parse({
        schemaVersion: 1,
        mode: "check",
        question: 1,
        taskEpoch: fixtureId,
        groups: [],
        check,
        package: { id: fixtureId, revision: 1 },
      }),
    },
    {
      moment: "B3 arrival acknowledgement",
      keys: ["B3"],
      bound: '[data-beat="question"] .board-question',
      payload: presentationStateSchema.parse({
        schemaVersion: 1,
        mode: "check",
        question: 1,
        taskEpoch: fixtureId,
        groups: [],
        check,
        package: { id: fixtureId, revision: 1 },
      }),
    },
    {
      moment: "B4 groups arrival",
      keys: ["B4a", "B4b"],
      bound: '[data-beat="groups"]',
      expectCount: { selector: '[data-testid="public-group"]', count: 4 },
      payload: presentationStateSchema.parse({
        schemaVersion: 1,
        mode: "groups",
        question: 1,
        taskEpoch: fixtureId,
        // All **four** synthetic groups: §K.5 names `B4` as `[data-beat="groups"]` **plus 4**
        // `[data-testid="public-group"]`, and the four stagger rules in globals.css are keyed to
        // `:nth-child(1..4)`. Declaring two would let three of those rules go unexercised while the
        // row still claimed `B4`.
        groups,
        package: { id: fixtureId, revision: 1 },
      }),
    },
    {
      moment: "B5 reveal",
      keys: ["B5"],
      bound: '[data-reveal="true"]',
      payload: presentationStateSchema.parse({
        schemaVersion: 1,
        mode: "station",
        question: 1,
        taskEpoch: fixtureId,
        groups,
        tool,
        pattern: "predict",
        guidance: { hint: 0, reveal: true },
        package: { id: fixtureId, revision: 1 },
      }),
    },
    {
      moment: "B6 progress rail",
      keys: ["B6a", "B6b"],
      bound: ".board-rail-segment",
      payload: presentationStateSchema.parse({
        schemaVersion: 1,
        mode: "check",
        question: 1,
        taskEpoch: fixtureId,
        groups: [],
        check,
        package: { id: fixtureId, revision: 1 },
      }),
    },
    {
      moment: "B8 session close",
      keys: ["B8"],
      // The closing card *is* the moment, but it only exists after the session is revoked, so the
      // moment binds on the check content first and the revoke is driven below.
      bound: '[data-beat="question"] .board-question',
      closeSession: true,
      payload: presentationStateSchema.parse({
        schemaVersion: 1,
        mode: "check",
        question: 1,
        taskEpoch: fixtureId,
        groups: [],
        check,
        package: { id: fixtureId, revision: 1 },
      }),
    },
    {
      moment: "B9 timer expiry (urgent → expired)",
      keys: ["B9a", "B9b"],
      bound: '[data-beat="question"] .board-question',
      awaitMarks: ["B9a", "B9b"],
      staticBeat: true,
      // `seconds` is a closed enum (60/75/80) and the beat is defined by the clock crossing 10 s
      // then 0 s, so this moment is deliberately slow: it declares the 60 s face and waits for the
      // product's own timer rather than faking the attribute.
      payload: presentationStateSchema.parse({
        schemaVersion: 1,
        mode: "check",
        question: 1,
        taskEpoch: fixtureId,
        groups: [],
        check: { ...check, seconds: 60 },
        package: { id: fixtureId, revision: 1 },
      }),
    },
  ];

  const report: Record<string, unknown> = {};
  // Written incrementally: a row that fails on moment 3 must still leave moments 1–2 inspectable,
  // which is exactly what a bare assertion failure would destroy.
  let lastReport: Record<string, unknown> = report;
  try {
    for (const entry of moments) {
      // B8's revoked session is a per-moment switch: the fixture answers every pairing call with
      // 404 only once this turns true, so the bind itself stays real.
      let revoke = false;
      await fixtureBoard(page, entry.payload, null, {
        closing: () => revoke,
      });
      await page.addInitScript(recorder(A47_SELECTORS));
      await page.goto("/layar");
      await page.evaluate(() => document.fonts.ready.then(() => undefined));
      // Bind to the moment's own content, let every ≤500 ms beat finish, then read the recorder.
      await waitBound(page, entry.bound);
      if (entry.closeSession) {
        revoke = true;
        // The product's own terminator, not a DOM fake: the next pairing call 404s, the transport
        // classifies it as terminal, closes the session and the board renders the closing card.
        await page.waitForSelector("[data-board-close]", {
          state: "visible",
          timeout: 60000,
        });
      }
      for (const key of entry.awaitMarks ?? []) {
        // The beat is defined by the product's own clock crossing a value (B9: 10 s, then 0 s), so
        // the row waits for the attribute the product sets rather than setting it itself.
        await page.waitForFunction(
          (selector) => document.querySelector(selector) !== null,
          A47_SELECTORS[key as keyof typeof A47_SELECTORS],
          { timeout: 90000 },
        );
        await page.waitForTimeout(50);
      }
      const rec = (await page.evaluate(() => window.__d2k)) as Recorder;
      await page.evaluate(() => window.__d2kStop?.());

      const found = Object.fromEntries(
        entry.keys.map((key) => [
          key,
          {
            selector: A47_SELECTORS[key as keyof typeof A47_SELECTORS],
            appearedAtMs: rec.marks[key] ?? null,
            element: rec.firstSeen[key] ?? null,
          },
        ]),
      );
      // The row must be able to fail: every named selector exists on its moment. (B7 is excluded per
      // §K.7 — its ring has no producer — and is probed separately on its own card.)
      //
      // The guard is `Number.isFinite`, **not** `not.toBeNull()`. The recorder only ever writes
      // `marks[key]` on a hit (`if (hit && marks[key] == null)`), so a selector that never appears
      // leaves the property *absent*, and `expect(undefined).not.toBeNull()` PASSES. That made the
      // first revision of this row accept a trigger that never fired — the exact false-coverage
      // shape §K.1 exists to kill. `Number.isFinite` fails on `undefined`, on `null` and on a
      // missing key, so an absent trigger is now a failure.
      for (const key of entry.keys)
        expect(
          Number.isFinite(rec.marks[key]),
          `${entry.moment}: trigger ${key} (${A47_SELECTORS[key as keyof typeof A47_SELECTORS]}) never appeared — marks[${key}] = ${JSON.stringify(rec.marks[key])}`,
        ).toBe(true);

      const anims = animations(rec);
      if (entry.expectCount) {
        const count = await page.evaluate(
          (selector) => document.querySelectorAll(selector).length,
          entry.expectCount.selector,
        );
        expect(
          count,
          `${entry.moment}: ${entry.expectCount.selector} count`,
        ).toBe(entry.expectCount.count);
      }
      const overBudget = anims.filter((a) => ms(a.duration) > 500);
      const repeating = anims.filter(
        (a) => a.iterations === "Infinity" || Number(a.iterations) > 1,
      );
      const analysis = analyse(rec, entry.keys);
      // §K.5's second timing clause, asserted for the first time: each fired animation reaches
      // `finished` within 700 ms (§K.1 derives the bound as ≤140 ms start + ≤500 ms = ≤640 ms, so it
      // is the clause that bounds the *start delay*; `duration ≤ 500` alone does not).
      //
      // Two readings, and the distinction matters because the first instrument tried here was wrong:
      //  · `endTime` is the timeline's own claim (delay + activeDuration) — exact.
      //  · `observedRunningMs` is how long the instance was *seen running* before it finished —
      //    observation with no DOM-observation proxy in it.
      // A third candidate, `finished.atMs - trigger mark`, was measured and rejected: the trigger mark
      // is a 40 ms-poll DOM scan plus the React commit, it landed 296 ms and 2424 ms after `t0` on two
      // runs of the same fixture, and that error exceeds the clause's own 60 ms margin. Bounding it
      // would have made page-load jitter red, which is a false positive rather than a finding.
      const lateCompletions = anims.filter(
        (a) => a.endTime > COMPLETION_BUDGET_MS,
      );
      const lateObserved = rec.finished.filter(
        (f) => f.observedRunningMs > COMPLETION_BUDGET_MS,
      );
      // The peak is only falsifiable if the offenders are named. A bare "9 > 8" cannot say whether a
      // beat legitimately overlapped another or whether something unowned started moving, so the
      // elements that make up the peak are recorded with the selector they belong to.
      const insideRows = rec.samples
        .filter(
          (s) =>
            analysis.windowStart !== null &&
            s.t >= analysis.windowStart &&
            s.t <= analysis.windowStart + 900,
        )
        .flatMap((s) => s.rows);
      const peakOffenders = [
        ...new Set(
          insideRows.map(
            (r) =>
              `${r.name} @ ${r.tag}.${r.cls}${r.pseudo} [${r.owned || "unowned"}]`,
          ),
        ),
      ];
      /**
       * **Per-mark** windows, not one window anchored at the earliest mark.
       *
       * `B9` is the case that forces this: its two attributes (`data-urgent`, then `data-expired`)
       * are set 10 s apart on the *same* line, so a single window anchored at the first mark cannot
       * see the second, and a "0 animations" reading for the second transition would be an artifact
       * of the window rather than a fact about the beat. Every key the moment names gets its own
       * `[mark, mark + 900 ms]` window and the row asserts each one.
       */
      const markWindows = [...new Set(entry.keys.map((key) => rec.marks[key]))]
        .filter((v) => Number.isFinite(v))
        .sort((a, b) => a - b)
        .map((mark) => ({
          key: entry.keys.find((key) => rec.marks[key] === mark) ?? "?",
          from: mark,
          // `B9b` is reached only after `B9a` and both are recorded, so this is 2 windows.
          rows: rec.samples
            .filter((s) => s.t >= mark && s.t <= mark + 900)
            .flatMap((s) => s.rows),
        }));
      // The moment's reading is committed **before** its assertions. A failure on the last moment
      // must still leave every earlier moment — and the failing moment itself — inspectable, and
      // the report has to include the per-mark windows above, which only exist here.
      report[entry.moment] = {
        keys: entry.keys,
        bound: entry.bound,
        found,
        beatRoots: await page.evaluate(() =>
          [...document.querySelectorAll("[data-beat]")].map((e) =>
            e.getAttribute("data-beat"),
          ),
        ),
        animations: anims,
        observedFinished: rec.finished,
        sampledPeakInsideWindow: analysis.insidePeak,
        /** §K.5's `sampled peak ≤ 8`, reported per moment; asserted once, in `A47f`. */
        peakCeiling: PEAK_CEILING,
        exceedsPeakCeiling: analysis.insidePeak > PEAK_CEILING,
        staticBeat: entry.staticBeat ?? false,
        animationsInsideWindow: insideRows.length,
        /** Per-transition windows (`B9` has two, 10 s apart) — the static-beat subject. */
        markWindows: markWindows.map((w) => ({
          key: w.key,
          fromMs: w.from,
          animations: w.rows.length,
        })),
        peakOffenders,
        /**
         * Which named beat each contributing element belongs to. A raw "peak = 9" cannot be acted
         * on; this says **which moments ran at once**, which is the difference between "the ceiling
         * is exceeded" and "these beats are concurrent at bind".
         */
        peakByBeat: (() => {
          const byBeat: Record<string, string[]> = {};
          for (const row of insideRows) {
            for (const owner of (row.owned || "unowned").split(",")) {
              const key = owner.trim() || "unowned";
              byBeat[key] = byBeat[key] ?? [];
              const label = `${row.name} @ ${row.tag}.${row.cls}${row.pseudo}`;
              if (!byBeat[key].includes(label)) byBeat[key].push(label);
            }
          }
          return byBeat;
        })(),
        sampledPeakOutsideWindow: analysis.outsidePeak,
        overBudget,
        repeating,
        lateCompletions,
        lateObserved,
        settle: [],
      };
      lastReport = report;

      expect(overBudget, `>500 ms: ${JSON.stringify(overBudget)}`).toEqual([]);
      expect(
        repeating,
        `iterations !== 1: ${JSON.stringify(repeating)}`,
      ).toEqual([]);
      expect(
        lateCompletions,
        `reaching finished later than 700 ms from the trigger: ${JSON.stringify(lateCompletions)}`,
      ).toEqual([]);
      expect(
        lateObserved,
        `animations observed to run longer than ${COMPLETION_BUDGET_MS} ms: ${JSON.stringify(lateObserved)}`,
      ).toEqual([]);
      if (entry.staticBeat) {
        // §K.5's timing clauses are vacuous on a beat that fires no animation, so the honest
        // assertion for such a beat is the one §B9 actually makes: urgency is a *static* state
        // change ("no pulsing, no flashing, no colour cycling") — 0 animations inside **each** of
        // its own transitions' windows, not merely "no long animation".
        for (const window of markWindows) {
          expect(
            window.rows,
            `${entry.moment}: the static transition at +${window.from} ms (${window.key}) animated: ${JSON.stringify(window.rows)}`,
          ).toEqual([]);
        }
        expect(
          analysis.outsidePeak,
          `${entry.moment}: the board moved outside the static beat's window`,
        ).toBe(0);
      } else {
        expect(
          insideRows.length,
          `${entry.moment}: the moment fired no animation at all, so its timing clauses are vacuous`,
        ).toBeGreaterThan(0);
      }
      // NOTE: §K.5's "sampled peak ≤ 8" / "at most 1 beat in flight" clauses are asserted in the
      // dedicated finding row below rather than here — see its comment for why.

      // At settle: willChange auto, transform none/identity, opacity 1 on the hooks the moment owns.
      const settle = await page.evaluate((keys) => {
        return keys.map((key) => {
          const el = document.querySelector(
            {
              B1: '[data-crossing="true"]',
              B2: '[data-beat="question"]',
              B3: '[data-testid="board-connection"]',
              B4a: '[data-beat="groups"]',
              B4b: '[data-testid="public-group"]',
              B5: '[data-reveal="true"]',
              B6a: "[data-progress-rail]",
              B6b: '.board-rail-segment[data-state="current"]',
              B7: '[data-testid="number-marker"]',
              B8: "[data-board-close]",
              // B9's beat root is the timer figure's own rule-bearing line, and by settle the
              // attribute is the state the room keeps, so both are read: the marked line and its
              // underline element.
              B9a: '[data-beat="question"] .board-instruction-line',
              B9b: '[data-beat="question"] .board-instruction-line',
            }[key]!,
          );
          if (!el) return { key, present: false };
          const s = getComputedStyle(el);
          return {
            key,
            present: true,
            willChange: s.willChange,
            transform: s.transform,
            opacity: s.opacity,
            animated: el
              .getAnimations()
              .filter((a) => a.playState === "running").length,
          };
        });
      }, entry.keys);
      for (const row of settle) {
        if (!row.present) continue;
        // §K.1's own exemption: `B1`'s crossing attribute is a transient that has already returned to
        // `false` by settle, so it is reported for presence, not for its settled values. The same is
        // true of `B3`'s `data-arrived` and `B9`'s `data-urgent`/`data-expired` — all three are
        // 900 ms transients whose *marked root* is queried by its stable selector above instead.
        if (row.key === "B1") continue;
        // The settled reading is attached to the report **before** its expectations, so the evidence
        // can never be a partial picture of the moment it describes.
        (report[entry.moment] as { settle: unknown[] }).settle.push(row);
        expect(
          row.willChange,
          `${entry.moment}: ${row.key} willChange at settle`,
        ).toBe("auto");
        expect(
          ["none", "matrix(1, 0, 0, 1, 0, 0)"],
          `${entry.moment}: ${row.key} transform at settle`,
        ).toContain(row.transform === "none" ? "none" : row.transform);
        // §K.5's settle triple is `willChange: auto`, `transform: none/identity`, `opacity: 1`.
        // §B9 declares the one exception, and the row's own first revision got it wrong: `B9a` and
        // `B9b` are two *transient attributes on the same line*, and the reading is taken after
        // expiry, so that line is at its **expired resting state** `opacity: 0.72` — which §B9
        // declares ("the timer block dims once to `opacity 0.72` over 220 ms and stays"). Expecting
        // `1` there asserts the document against the document; a different value still fails.
        expect(
          row.opacity,
          `${entry.moment}: ${row.key} opacity at settle`,
        ).toBe(row.key.startsWith("B9") ? "0.72" : "1");
        expect(
          row.animated,
          `${entry.moment}: ${row.key} animations at settle`,
        ).toBe(0);
      }
    }
  } finally {
    // Flush on the way out — a failure on moment 3 must still leave moments 1–2 inspectable, which
    // a bare assertion failure would otherwise destroy.
    await writeEvidence("a47-moments.json", {
      row: "A47",
      document:
        "INTERACTION_DELTA_V4 §K.5 (replaces A4's `data-beat` trigger set)",
      transport: "fixture",
      transportNote:
        "UI-only transport fixture: no session row written. Legitimate for a beat's SHAPE (count, peak, " +
        "duration, composite-only, settle state). NOT evidence that real data reaches these moments.",
      deviceProfileNote:
        "The board's capability model derives `reducedMotion` from `p95Ms`; an unmeasured profile turns " +
        "every beat off (`capability-motion-gate.json`), so this fixture declares a measured p95 of 120 ms. " +
        "Without that, the row would pass vacuously on a motion-off board.",
      /** Every named key, and which moment drove it. A key driven by nothing shows up as `never`. */
      triggerCensus: Object.fromEntries(
        Object.keys(A47_SELECTORS).map((key) => [
          key,
          moments
            .filter((entry) => entry.keys.includes(key))
            .map((entry) => entry.moment),
        ]),
      ),
      undrivenKeys: Object.keys(A47_SELECTORS).filter(
        (key) =>
          key !== "B7" && !moments.some((entry) => entry.keys.includes(key)),
      ),
      excluded: {
        B7: '§K.7 — `@keyframes pn-ring-trace` / `.board-touch-ring` have no producer in src/. A47 points B7 at [data-testid="number-marker"]\'s press / data-dragging until t_2ea7f16f decides; probed separately there, not asserted here.',
      },
      b9Note:
        "B9 is a STATIC urgency beat (§B9: no pulsing, flashing or colour cycling), so its moment asserts " +
        "0 animations inside **each** of its two transitions' own windows (urgent, then expired, 10 s " +
        "apart) plus 0 movement outside them — the timing clauses are vacuous on a beat that fires " +
        "nothing, and saying so is the honest reading rather than an empty pass.",
      peakNote:
        "§K.5's `sampled peak ≤ 8` is measured per moment here and asserted in `A47f`, which also asserts " +
        "`at most 1 beat in flight` — the two clauses of one sentence, in one place. Per-moment peaks " +
        "above the ceiling are flagged by `exceedsPeakCeiling` so a regression is attributable to the " +
        "moment that caused it, and the B4 moments run with the full four groups because §K.5 names " +
        '`B4` as `[data-beat="groups"]` plus 4 `[data-testid="public-group"]`.',
      whyDataBeatIsNotTheTriggerSet:
        "B5/B6/B7/B8 emit no `data-beat` at all, and the code does emit `idle`, which §B never names. A4's wording was therefore unrunnable; this map is the replacement.",
      moments: lastReport,
    });
  }
  await shot(page, info, "a47-last-moment");
});

/** §A.2's animation ceiling, the figure every peak assertion in this file uses. */
const PEAK_CEILING = 8;

/** §K.5's concurrency clause: "at most **1** beat in flight". */
const BEATS_IN_FLIGHT_CEILING = 1;

/**
 * A47's concurrency clause, isolated as its own row — and why it is separate.
 *
 * §K.5 requires both `sampled peak ≤ 8` **and** `at most 1 beat in flight`. At bind these two
 * cannot both hold on the shipped package path: the check moment starts `B1` (role-line rule draw +
 * column-body rise), `B2` (question rise + 4 option-row fades), `B3` (state-rule draw) and `B6`
 * (rail-segment wipe) in the same frame. Measured on revision `a723437`, the peak inside
 * `[trigger, trigger + 900 ms]` is **9** distinct elements from **four** named moments.
 *
 * **Both** clauses are asserted here, in one place, each with its own expectation. The earlier
 * revision of this row computed `beatsInFlight` and printed it in the failure message while
 * asserting only the peak, which left the concurrency clause orphaned: `A47` explicitly defers it
 * to this row, so "at most 1 beat in flight" was asserted nowhere. A named acceptance clause that
 * no assertion can fail is the same false-coverage shape §K.1 exists to kill, so it now has one.
 *
 * This row is deliberately separate from the parent `A47` row so that a **real** regression in one
 * moment (its own trigger never firing, a >500 ms animation, a non-settling element) still turns
 * the suite red, while a known-and-scoped exceedance is asserted in exactly one place with the
 * attribution needed to act on it. It asserts the contract as written rather than weakening it.
 */
test("A47f (K.5) the sampled peak at a beat window obeys §A.2's ceiling, with per-beat attribution", async ({
  page,
}, info) => {
  test.setTimeout(120000);
  await page.setViewportSize({ width: 1920, height: 1080 });
  const check = {
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
  };
  await fixtureBoard(
    page,
    presentationStateSchema.parse({
      schemaVersion: 1,
      mode: "check",
      question: 1,
      taskEpoch: fixtureId,
      groups: [],
      check,
      package: { id: fixtureId, revision: 1 },
    }),
  );
  await page.addInitScript(recorder(A47_SELECTORS));
  await page.goto("/layar");
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
  await waitBound(page, '[data-beat="question"] .board-question');
  const rec = (await page.evaluate(() => window.__d2k)) as Recorder;
  await page.evaluate(() => window.__d2kStop?.());

  const analysis = analyse(rec, ["B1", "B2", "B3", "B6a", "B6b"]);
  const insideRows = rec.samples
    .filter(
      (s) =>
        analysis.windowStart !== null &&
        s.t >= analysis.windowStart &&
        s.t <= analysis.windowStart + 900,
    )
    .flatMap((s) => s.rows);
  const byBeat: Record<string, string[]> = {};
  for (const row of insideRows)
    for (const owner of (row.owned || "unowned").split(",")) {
      const key = owner.trim() || "unowned";
      byBeat[key] = byBeat[key] ?? [];
      const label = `${row.name} @ ${row.tag}.${row.cls}${row.pseudo}`;
      if (!byBeat[key].includes(label)) byBeat[key].push(label);
    }
  const distinctElements = new Set(
    insideRows.map((r) => `${r.tag}.${r.cls}${r.pseudo}`),
  );
  const beatsInFlight = Object.keys(byBeat).filter((k) => k !== "unowned");
  const declaration = {
    row: "A47f",
    document:
      "INTERACTION_DELTA_V4 §K.5 — `sampled peak ≤ 8` and `at most 1 beat in flight`",
    transport: "fixture",
    transportNote:
      "UI-only transport fixture. The clause is a package-path property and a fixture is the only reachable trigger for it (§K.3).",
    measured: {
      sampledPeak: analysis.insidePeak,
      ceiling: PEAK_CEILING,
      distinctElements: distinctElements.size,
      beatsInFlight,
      beatsInFlightCeiling: BEATS_IN_FLIGHT_CEILING,
      byBeat,
      /** Both asserted clauses are reported with their verdict, so the evidence names the failure. */
      verdicts: {
        peak: analysis.insidePeak <= PEAK_CEILING ? "pass" : "fail",
        beatsInFlight:
          beatsInFlight.length <= BEATS_IN_FLIGHT_CEILING ? "pass" : "fail",
      },
    },
  };
  await writeEvidence("a47-peak-finding.json", declaration);
  await shot(page, info, "a47-peak-window");
  /**
   * Both clauses of §K.5's one sentence are asserted, and both verdicts are collected **before**
   * either fails.
   *
   * `expect.soft` is the right instrument here and it is not a weakening: a hard assertion aborts
   * the row on the first failure, so the second clause is never evaluated and its reading never
   * reaches the evidence — which is how this row's first revision ended up with a concurrency clause
   * that no assertion could fail. Soft assertions report *every* failing clause in one run, then fail
   * the test at the end, so the evidence for a red row is complete. Neither expectation is loosened:
   * both are the contract's own numbers.
   */
  expect
    .soft(
      analysis.insidePeak,
      `sampled peak inside [trigger, trigger+900 ms] = ${analysis.insidePeak} > ${PEAK_CEILING}; ` +
        `${beatsInFlight.length} moments concurrent (${beatsInFlight.join(", ")}); elements: ` +
        [...distinctElements].join(" | "),
    )
    .toBeLessThanOrEqual(PEAK_CEILING);
  // §K.5's other half of the same sentence, asserted rather than merely computed. Measured at
  // `a723437` this fails too (5 beats in flight), and it is the clause that makes the peak a
  // *choreography* bound rather than a coincidence: several small beats can each obey their own
  // budget and still be five at once.
  expect
    .soft(
      beatsInFlight.length,
      `beats in flight inside [trigger, trigger+900 ms] = ${beatsInFlight.length} > ${BEATS_IN_FLIGHT_CEILING} ` +
        `(${beatsInFlight.join(", ")}); byBeat: ${JSON.stringify(byBeat)}`,
    )
    .toBeLessThanOrEqual(BEATS_IN_FLIGHT_CEILING);
});

test("A48 (K.5) a real library run is calm: 0 animated, 0 loops, 0 gradients, 0 live non-interactive transitions", async ({
  page,
  browser,
}, info) => {
  test.setTimeout(240000);
  await page.setViewportSize({ width: 1920, height: 1080 });
  // REAL DATA: a bound library run created and claimed through the product's own teacher API.
  const binding = await realLibraryBoard(page, browser, 5);
  await expect(page.getByTestId("library-board")).toBeVisible({
    timeout: 45000,
  });
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
  await expect
    .poll(async () => page.evaluate(ANIMATED_PROBE), { timeout: 25000 })
    .toBe(0);
  // Load and idle for 30 s, outside any item transition (§K.5).
  await page.waitForTimeout(30000);
  const profile = await page.evaluate(() =>
    localStorage.getItem("pn-board-capabilities-v1"),
  );

  const reading = await page.evaluate(() => {
    const animatedElements = new Set<Element>();
    const loops: string[] = [];
    const gradients: string[] = [];
    const nonInteractiveTransitions: string[] = [];
    const named: string[] = [];
    const interactive =
      "button,a,input,select,textarea,summary,[role='button'],[data-slot='button']";
    for (const node of document.querySelectorAll("*")) {
      const style = getComputedStyle(node);
      if (style.animationName !== "none" && style.animationName !== "")
        named.push(
          `${node.tagName}.${String(node.className || "").slice(0, 50)}`,
        );
      for (const animation of node.getAnimations())
        if (
          animation.playState !== "finished" &&
          animation.playState !== "idle"
        )
          animatedElements.add(node);
      const timing = node
        .getAnimations()
        .map((a) => a.effect?.getTiming().iterations);
      if (timing.some((i) => i === Infinity))
        loops.push(
          `${node.tagName}.${String(node.className || "").slice(0, 50)}`,
        );
      if (String(style.backgroundImage).includes("gradient"))
        gradients.push(
          `${node.tagName}.${String(node.className || "").slice(0, 50)}`,
        );
      const hasTransition =
        style.transitionProperty !== "none" &&
        style.transitionDuration !== "0s";
      if (
        hasTransition &&
        !node.matches(interactive) &&
        !node.closest(interactive)
      )
        nonInteractiveTransitions.push(
          `${node.tagName}.${String(node.className || "").slice(0, 50)}`,
        );
    }
    return {
      animated: animatedElements.size,
      animationNameNotNone: named,
      loops,
      gradients,
      nonInteractiveTransitions,
      beatCount: document.querySelectorAll("[data-beat]").length,
      crossingCount: document.querySelectorAll("[data-crossing]").length,
      rail: (() => {
        const el = document.querySelector("[data-progress-rail]");
        return el
          ? {
              source: el.getAttribute("data-progress-source"),
              text: el.textContent,
              segments: document.querySelectorAll(".board-rail-segment").length,
            }
          : null;
      })(),
      header:
        [...document.querySelectorAll("p")]
          .map((p) => p.textContent ?? "")
          .find((t) => /Soal \d+\/\d+/.test(t)) ?? null,
      visibleQuestions: [
        ...document.querySelectorAll("[data-board-question]"),
      ].filter((el) => {
        const rect = el.getBoundingClientRect();
        const s = getComputedStyle(el);
        return (
          rect.height > 0 &&
          rect.width > 0 &&
          s.visibility !== "hidden" &&
          s.display !== "none" &&
          !(el as HTMLElement).hidden
        );
      }).length,
      questionOccurrences: document.querySelectorAll("[data-board-question]")
        .length,
    };
  });

  expect(reading.animated, "distinct animated elements").toBe(0);
  expect(reading.animationNameNotNone, "animationName !== none").toEqual([]);
  expect(reading.loops, "iterations === Infinity").toEqual([]);
  expect(
    reading.gradients,
    "computed background-image containing gradient",
  ).toEqual([]);
  expect(
    reading.nonInteractiveTransitions,
    "non-interactive elements with a live transition",
  ).toEqual([]);
  // The row's own honest scope (§K.5): the §B moments live on the package path, so 0 is correct
  // here — and this row must never be filed as immersive-motion coverage.
  expect(reading.beatCount, "[data-beat] count on the library path").toBe(0);
  // The rail's count agrees with the item's own header line (§K.5).
  expect(reading.rail, "the rail is bound on the library path").not.toBeNull();
  expect(reading.header, "the library header states the position").toContain(
    reading.rail!.text,
  );

  await writeEvidence("a48-calm-library.json", {
    row: "A48",
    document: "INTERACTION_DELTA_V4 §K.5",
    transport: "real-data",
    transportNote:
      "A REAL bound library run, created through /api/v1/library (save + start) and read back through " +
      "the product's own /api/v1/board/library. No transport stub: this is the row that keeps the calm " +
      "inventory from being entirely fixture-borne.",
    scopedSentence: SCOPED_SENTENCE,
    idleSeconds: 30,
    boundRun: { runId: binding.runId, classId: binding.classId },
    declaredDeviceProfile: profile,
    deviceProfileNote:
      "Declared, not measured: the board's own capability model derives reducedMotion from p95Ms, and a " +
      "measured headless profile would leave the board motion-off, which would make a calm assertion vacuous. " +
      "A declared profile means this calm claim is tested against a board that CAN animate.",
    reading,
  });
  await shot(page, info, "a48-calm-library");
  await binding.teacher.close();
});

test("A3b/A3c (K.2) on a REAL bound library run: exactly one visible question, no non-nested band collisions", async ({
  page,
  browser,
}, info) => {
  test.setTimeout(240000);
  await page.setViewportSize({ width: 1920, height: 1080 });
  const binding = await realLibraryBoard(page, browser, 5);
  await expect(page.getByTestId("library-board")).toBeVisible({
    timeout: 45000,
  });
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
  await expect
    .poll(async () => page.evaluate(ANIMATED_PROBE), { timeout: 25000 })
    .toBe(0);

  const reading = await page.evaluate(() => {
    const visible = (el: Element) => {
      const rect = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      return (
        rect.height > 0 &&
        rect.width > 0 &&
        s.visibility !== "hidden" &&
        s.display !== "none" &&
        !(el as HTMLElement).hidden
      );
    };
    // §K.2(a): the count is of VISIBLE elements, not attribute occurrences. On the library path the
    // attribute legitimately resolves twice for a paginated item (the hidden `h1.library-prompt`
    // keeps it; the visible reading page carries it), so a raw count may read 2 on a correct board.
    const occurrences = [...document.querySelectorAll("[data-board-question]")];
    const visibleQuestions = occurrences.filter(visible);

    // §K.2(b): nesting is DOM containment (`a.contains(b) || b.contains(a)`), NEVER rect geometry —
    // which is exactly why LENS's `board-foot` × `board-state-line` 7077 px² reading is a non-defect.
    const bands = [...document.querySelectorAll("[data-board-band]")].filter(
      visible,
    );
    const collisions: unknown[] = [];
    const excludedByContainment: string[] = [];
    for (let i = 0; i < bands.length; i++)
      for (let j = i + 1; j < bands.length; j++) {
        const a = bands[i];
        const b = bands[j];
        const containment = a.contains(b) || b.contains(a);
        const ra = a.getBoundingClientRect();
        const rb = b.getBoundingClientRect();
        const x = Math.max(
          0,
          Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left),
        );
        const y = Math.max(
          0,
          Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top),
        );
        const area = x * y;
        if (containment) {
          if (area > 0.5)
            excludedByContainment.push(
              `${String(a.className)} × ${String(b.className)} = ${Math.round(area)} px²`,
            );
          continue;
        }
        if (area > 0.5)
          collisions.push({
            a: String(a.className),
            b: String(b.className),
            area: Math.round(area),
          });
      }
    return {
      questionOccurrences: occurrences.length,
      visibleQuestions: visibleQuestions.length,
      visibleQuestionClass: visibleQuestions[0]
        ? String(visibleQuestions[0].className)
        : null,
      bands: bands.length,
      collisions,
      excludedByContainment,
    };
  });

  expect(
    reading.visibleQuestions,
    `exactly one VISIBLE question on the real library path (attribute occurrences: ${reading.questionOccurrences})`,
  ).toBe(1);
  expect(
    reading.questionOccurrences,
    "the attribute may legitimately occur twice (hidden prompt + visible reading page)",
  ).toBeGreaterThanOrEqual(1);
  expect(
    reading.bands,
    "bands resolve on the real library path",
  ).toBeGreaterThan(2);
  expect(reading.collisions, JSON.stringify(reading.collisions)).toEqual([]);
  // The containment exclusion is a fact, not a discovery: name it in the evidence.
  expect(
    reading.excludedByContainment.length,
    "at least one nested band pair is excluded BY CONTAINMENT (§K.2(b))",
  ).toBeGreaterThan(0);

  await writeEvidence("a3b-a3c-real-library.json", {
    row: "A3b + A3c",
    document:
      "INTERACTION_DELTA_V4 §K.2 (sharpens §J.2.2 / §J.2.3; hooks unchanged)",
    transport: "real-data",
    transportNote:
      "A REAL bound library run, not a fixture. §K.2 requires these two rows on real data so the " +
      "suite is not entirely fixture-borne.",
    countingRule:
      "The count is of VISIBLE elements (rendered box height/width > 0, not hidden/visibility:hidden), never attribute occurrences.",
    nestingRule:
      "Nesting is decided by DOM containment (a.contains(b) || b.contains(a)), NEVER rect geometry. A nested pair with a non-zero rect overlap is recorded in `excludedByContainment` and is NOT a defect — this is why board-foot × board-state-line (7077 px²) must not be re-filed.",
    boundRun: { runId: binding.runId, classId: binding.classId },
    reading,
  });
  await shot(page, info, "a3b-a3c-real-library");
  await binding.teacher.close();
});
