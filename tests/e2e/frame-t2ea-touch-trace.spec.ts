import { test, expect, type Page, type TestInfo } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { libraryBoardSchema } from "../../src/contracts/library";
import { snapshotSchema } from "../../src/contracts/presentation";
import { INTERACTIVE_HELP } from "../../src/features/library/templates";
import {
  TOUCH_RING_MAX,
  TOUCH_TARGET_SELECTOR,
} from "../../src/ui/components/touch-trace";

/**
 * `t_2ea7f16f` — §B7 `Sentuh`: the touch trace's producer, and the acceptance rows it makes
 * implementable.
 *
 * `A11` and `A12` (`INTERACTION_DELTA_V4` §F.1) were **BLOCKED, not FAILED**, at `dc5242b`:
 * `globals.css` declared `@keyframes pn-ring-trace` and `.board-touch-ring` while nothing in
 * `src/` ever rendered that class, so both rows named a thing the product never produced. This
 * file is the row that runs the beat — and, per the card, it is written to be able to fail:
 * every clause below is an observable with a number in it.
 *
 * The three readings a reader should be able to check against the delta:
 *
 *  · **The ring is emitted on release.** §A.4 forbids "motion while a pointer is down anywhere on
 *    the board"; `A11` reads "on release, exactly one ring animation per pointer" and `A12` reads
 *    "a ring with `opacity < 0.6` exists and is gone after 400 ms". Release-time emission is the
 *    only reading that satisfies all three, and the *position* is the `pointerdown` point, so a
 *    drag traces the object that was touched rather than where the finger stopped.
 *  · **`pointermove` produces zero rings.** §B7's own Forbidden list, and the failure mode the
 *    beat would have if it were wired to a move instead of a touch.
 *  · **The trace is not a target and not the only feedback.** `pointer-events: none` +
 *    `aria-hidden`; and a press on a board control that is *not* one of §B7's six objects gets no
 *    ring, which is the difference between "the trace" and "a click effect".
 *
 * UI-only transport fixtures: no session row is written. The trace is a browser-side property of
 * a mounted board, so a mounted board is the honest instrument for it.
 */
test.use({ trace: "off" });

const EVIDENCE = "artifacts/qa/t2ea-touch-trace";
const fixtureId = "7b000001-0000-4000-8000-000000000099";

/** `--pn-ink-900: #14212b` (`src/ui/tokens.css`), as the browser reports a border colour. */
const INK_900 = "rgb(20, 33, 43)";

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
 * Every reading the card asks for, taken from the rendered DOM: ring count, each ring's touch
 * point, its painted geometry (2 px ink border, 88 px box), its animation's own timing, the
 * settle triple (`willChange`), and the container's `pointer-events`.
 */
const TRACE_PROBE = `(() => {
  const trace = document.querySelector('[data-testid="board-touch-trace"]');
  const rings = [...document.querySelectorAll(".board-touch-ring")];
  return {
    count: rings.length,
    trace: trace
      ? {
          pointerEvents: getComputedStyle(trace).pointerEvents,
          ariaHidden: trace.getAttribute("aria-hidden"),
        }
      : null,
    rings: rings.map((node) => {
      const point = node.parentElement;
      const rect = point.getBoundingClientRect();
      const style = getComputedStyle(node);
      return {
        center: [rect.left + rect.width / 2, rect.top + rect.height / 2],
        box: [rect.width, rect.height],
        borderWidth: style.borderTopWidth,
        borderColor: style.borderTopColor,
        animationName: style.animationName,
        animationDuration: style.animationDuration,
        iterations: node.getAnimations().map((a) => a.effect.getTiming().iterations),
        willChange: style.willChange,
        transitionProperty: style.transitionProperty,
        transitionDuration: style.transitionDuration,
        opacity: style.opacity,
      };
    }),
  };
})()`;

type TraceReading = {
  count: number;
  trace: { pointerEvents: string; ariaHidden: string | null } | null;
  rings: {
    center: [number, number];
    box: [number, number];
    borderWidth: string;
    borderColor: string;
    animationName: string;
    animationDuration: string;
    iterations: number[];
    willChange: string;
    transitionProperty: string;
    transitionDuration: string;
    opacity: string;
  }[];
};

/** Distinct animated elements (§A.2), so "the ring is the only thing moving" is a number. */
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
 * A measured capability profile (`p95Ms: 10`) and a saved appearance. `p95Ms: null` means
 * "unmeasured", which derives `reducedMotion: true` and writes `data-reduced-motion="true"` on the
 * board stage — whose CSS net is `animation: none !important`. A profile that declares an
 * unmeasured board would make this whole row vacuous: the ring would be refused and the row would
 * pass on a motion-off product.
 */
async function storedBoard(page: Page, options: { motionOff?: "app" } = {}) {
  await page.addInitScript(
    ({ id, off }) => {
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
          samples: 20,
          medianMs: 5,
          p95Ms: 10,
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
      if (off)
        localStorage.setItem(
          "pn-visual-preferences-v1",
          JSON.stringify({ reduced: true, light: false }),
        );
    },
    { id: fixtureId, off: options.motionOff === "app" },
  );
}

/** UI-only transport, the same fixture family the other board rows use. */
async function boardFixture(page: Page, item: ReturnType<typeof libraryItem>) {
  const snapshot = snapshotSchema.parse({
    envelope: {
      protocolVersion: 1,
      presentationId: fixtureId,
      channelEpoch: fixtureId,
      revision: 1,
      commandId: fixtureId,
      packageVersion: "prelim-7b-v1",
      payload: {
        schemaVersion: 1,
        mode: "check",
        question: 1,
        taskEpoch: fixtureId,
        groups: [],
      },
    },
    ackRevision: 1,
    ackCommandId: fixtureId,
    ackAt: new Date().toISOString(),
  });
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
    const now = new Date().toISOString();
    const json =
      action === "resume"
        ? { snapshot }
        : action === "create"
          ? {
              id: fixtureId,
              code: "123456",
              expiresAt: new Date(Date.now() + 600000).toISOString(),
              pairingUrl: null,
            }
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
                  : { accepted: true };
    await route.fulfill({ json });
  });
  await page.route("**/api/v1/board/library", (route) =>
    route.fulfill({ json: libraryBoardSchema.parse(item) }),
  );
}

function libraryItem(): ReturnType<typeof libraryBoardSchema.parse> {
  return libraryBoardSchema.parse({
    id: fixtureId,
    title: "Garis bilangan — Sentuh",
    position: 0,
    total: 1,
    revision: 1,
    status: "active",
    item: {
      ...INTERACTIVE_HELP["number-line"].templates[0].item,
      id: fixtureId,
    },
  });
}

/** A mounted board carrying the §B7 number-line object, settled. */
async function board(page: Page, options: { motionOff?: "app" } = {}) {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await storedBoard(page, options);
  await boardFixture(page, libraryItem());
  await page.goto("/layar");
  await page
    .getByTestId("number-marker")
    .waitFor({ state: "visible", timeout: 30000 });
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
  await page.waitForTimeout(600);
}

async function readTrace(page: Page) {
  return (await page.evaluate(TRACE_PROBE)) as TraceReading;
}

test("A11/A12 §B7 a press on the marker makes exactly one 2px ink ring at the touch point, and pointermove makes none", async ({
  page,
}, info) => {
  await board(page);
  const marker = page.getByTestId("number-marker");
  const box = (await marker.boundingBox())!;
  const x = Math.round(box.x + box.width / 2);
  const y = Math.round(box.y + box.height / 2);

  // Nothing before the touch. A trace that existed at rest would be a permanent ornament on the
  // projected board, which §A.4 and §B7 both forbid.
  const before = await readTrace(page);
  expect(before.count, "rings before any touch").toBe(0);
  expect(
    before.trace,
    "the trace container is not mounted until it has something to draw",
  ).toBeNull();

  await page.mouse.move(x, y);
  await page.mouse.down();
  // §B7/§A.11: a press is a *state*, never an animated target — and it moves the marker by exactly
  // the `--pn-m-1` offset. `A12` accepts `translateY(2px)` or a matrix whose `f === 2`.
  const pressed = await marker.evaluate((el) => getComputedStyle(el).transform);
  const pressedAnimations = await marker.evaluate(
    (el) => el.getAnimations().filter((a) => a.playState === "running").length,
  );
  // §A.4 and `A11`: the move must add nothing. Sampled across the drag, not once.
  const moveReadings: TraceReading[] = [];
  for (let step = 1; step <= 4; step++) {
    await page.mouse.move(x + step * 12, y);
    moveReadings.push(await readTrace(page));
  }
  const duringMove = await marker.evaluate((el) => {
    const style = getComputedStyle(el);
    return {
      transform: style.transform,
      transitionProperty: style.transitionProperty,
      transitionDuration: style.transitionDuration,
      // `A11`'s clause read honestly: a transition *property* of `all` at a *duration* of `0s` is
      // the CSS initial value, not a live transition. The repo's own probe uses the same two-part
      // predicate (`frame-d2-interaction.spec.ts`, `A2`'s `strict` scan).
      liveTransition:
        style.transitionProperty !== "none" &&
        style.transitionDuration !== "0s",
      animations: el.getAnimations().filter((a) => a.playState === "running")
        .length,
    };
  });
  const peakDuringMove = await page.evaluate(ANIMATED_PROBE);
  await page.mouse.up();

  // `A11`: "on release, exactly one ring animation per pointer".
  await expect
    .poll(async () => (await readTrace(page)).count, { timeout: 1500 })
    .toBe(1);
  const after = await readTrace(page);
  const ring = after.rings[0];
  await shot(page, info, "touch-trace-ring");
  // `A12`'s own wording is "a ring with `opacity < 0.6` exists": the first sample can catch the
  // keyframe's `from` value exactly, so the decay is read a moment into the fade as well. Both
  // readings are kept — the start frame proves the `from`, the later one proves it is falling.
  await page.waitForTimeout(120);
  const fading = (await readTrace(page)).rings[0];

  // "gone after 400 ms" — measured from the release: 120 ms for the fade sample above plus 300 ms.
  await page.waitForTimeout(300);
  const settled = await readTrace(page);
  const rest = await page.evaluate(() => ({
    willChange: [...document.querySelectorAll(".board-touch-ring")].map(
      (node) => getComputedStyle(node).willChange,
    ),
    traceMounted:
      document.querySelector('[data-testid="board-touch-trace"]') !== null,
  }));

  const reading = {
    row: "A11/A12",
    document:
      "INTERACTION_DELTA_V4 §B7 / §F.1 A11, A12 (producer added by t_2ea7f16f)",
    transport: "fixture",
    transportNote:
      "UI-only transport fixture: no session row written. The trace is a browser-side property of a mounted board.",
    touchPoint: [x, y],
    pressedTransform: pressed,
    pressedRunningAnimations: pressedAnimations,
    duringMove,
    peakAnimatedDuringMove: peakDuringMove,
    moveRingCounts: moveReadings.map((reading) => reading.count),
    ring,
    ringFading: fading,
    ringsAtSettle: settled.count,
    traceMountedAtSettle: rest.traceMounted,
    willChangeAtSettle: rest.willChange,
  };
  await writeEvidence("touch-trace.json", reading);

  // The press offset (`A12` clause 1). `matrix(1, 0, 0, 1, 0, 2)` is `translateY(2px)`.
  expect(pressed, "the marker's transform while pressed").toMatch(
    /^matrix\(1, 0, 0, 1, 0, 2\)$/,
  );
  // `A11` clause 1: the press is a state, not an animation, and the marker carries no transition
  // of its own during the move.
  expect(pressedAnimations, "animations on the marker while pressed").toBe(0);
  // §B7 Forbidden: "a ring on `pointermove`".
  expect(
    moveReadings.map((reading) => reading.count),
    "rings produced by pointermove",
  ).toEqual([0, 0, 0, 0]);
  expect(
    duringMove.animations,
    "animations on the marker during the move",
  ).toBe(0);
  expect(
    duringMove.liveTransition,
    `the marker carries no live transition during the move (property ${duringMove.transitionProperty}, duration ${duringMove.transitionDuration})`,
  ).toBe(false);
  // §A.4: nothing moves while a pointer is down — the press is the only change and it is static.
  expect(peakDuringMove, "distinct animated elements during the move").toBe(0);
  // The ring itself: one, at the touch point, carrying §B7's own geometry.
  expect(after.count, "rings on release").toBe(1);
  expect(ring.animationName, "the ring's animation").toBe("pn-ring-trace");
  expect(ring.animationDuration, "the ring's duration (--pn-t-4)").toBe("0.3s");
  expect(ring.iterations, "the ring runs once").toEqual([1]);
  // `A12`: "a ring with `opacity < 0.6` exists" — the fade is real, not just declared. The first
  // sample already sits inside `--pn-t-4`'s window (the poll that waits for the ring costs a frame
  // or two), so it may read anywhere at or below the keyframe's `from`; the sample 120 ms later
  // must be strictly lower, and the whole trace must be gone by 400 ms.
  expect(
    parseFloat(ring.opacity),
    "the ring's opacity at its first sample",
  ).toBeLessThanOrEqual(0.6);
  expect(
    parseFloat(fading.opacity),
    "the ring's opacity 120 ms in",
  ).toBeLessThan(parseFloat(ring.opacity));
  expect(ring.borderWidth, "the ring's stroke").toBe("2px");
  expect(ring.borderColor, "the ring's colour (--pn-ink-900)").toBe(INK_900);
  expect(Math.round(ring.box[0]), "the ring's full size").toBe(88);
  expect(Math.round(ring.box[1]), "the ring's full size").toBe(88);
  // Position: the ring is centred on the touch point, not on the release point (the finger moved
  // 48 px during the drag above and the ring must ignore that).
  expect(
    Math.abs(ring.center[0] - x),
    "ring x vs touch point",
  ).toBeLessThanOrEqual(1.5);
  expect(
    Math.abs(ring.center[1] - y),
    "ring y vs touch point",
  ).toBeLessThanOrEqual(1.5);
  // §A.4's permanent-`will-change` ban, and "the trace is not a target": pointer-transparent,
  // aria-hidden, and `willChange` back to `auto` once it is on screen.
  expect(ring.willChange, "the ring's willChange").toBe("auto");
  // `A11` clause 3 read the same way as the marker's: a property of `all` at a duration of `0s` is
  // the CSS initial value. What the clause forbids is a *live* transition on the trace.
  expect(
    ring.transitionProperty !== "none" && ring.transitionDuration !== "0s",
    `the ring carries no live transition (property ${ring.transitionProperty}, duration ${ring.transitionDuration})`,
  ).toBe(false);
  expect(
    after.trace?.pointerEvents,
    "the trace container's pointer-events",
  ).toBe("none");
  expect(after.trace?.ariaHidden, "the trace container's aria-hidden").toBe(
    "true",
  );
  // `A12`: gone after 400 ms — and not left in the DOM as a transparent 88 px circle.
  expect(settled.count, "rings after the release + 400 ms").toBe(0);
  expect(
    rest.traceMounted,
    "the trace container is unmounted again at rest",
  ).toBe(false);
  expect(rest.willChange, "willChange at rest").toEqual([]);
});

test("§B7 concurrency: one ring per pointer, never more than four at once, and none while one is at full size", async ({
  page,
}, info) => {
  await board(page);
  const marker = page.getByTestId("number-marker");
  const box = (await marker.boundingBox())!;
  const x = Math.round(box.x + box.width / 2);
  const y = Math.round(box.y + box.height / 2);

  // Five pointers down at once, then released together. Real `pointerup` events with distinct
  // `pointerId`s on the real element: this drives the producer's own guards, which is what the
  // clause is about (a classroom wall can carry several fingers at once).
  const release = async () => {
    await page.evaluate(
      ({ sel, x, y }) => {
        const el = document.querySelector(sel)!;
        for (const pointerId of [1, 2, 3, 4, 5]) {
          el.dispatchEvent(
            new PointerEvent("pointerdown", {
              pointerId,
              bubbles: true,
              clientX: x + pointerId * 8,
              clientY: y,
            }),
          );
        }
        for (const pointerId of [1, 2, 3, 4, 5]) {
          el.dispatchEvent(
            new PointerEvent("pointerup", {
              pointerId,
              bubbles: true,
              clientX: x + pointerId * 8,
              clientY: y,
            }),
          );
        }
      },
      { sel: '[data-testid="number-marker"]', x, y },
    );
  };
  await release();
  const fired = await readTrace(page);
  // `A11`'s last clause: "peak animated elements ≤ 8". Four rings are four distinct animated
  // elements, so the ceiling is read here rather than inferred from the ring count.
  const peak = await page.evaluate(ANIMATED_PROBE);
  await shot(page, info, "touch-trace-concurrency");

  // A second press of a pointer that already holds a live ring adds none ("one per pointer"), and
  // once every ring is at full size no new ring may start (§B7's Forbidden list).
  await release();
  const repeated = await readTrace(page);

  await writeEvidence("touch-trace-concurrency.json", {
    row: "§B7 concurrency",
    document:
      "INTERACTION_DELTA_V4 §B7 (max 4 concurrent rings, one per pointer; no ring while another is at full size)",
    transport: "fixture",
    pointers: 5,
    ceiling: TOUCH_RING_MAX,
    ringsAfterFirstRelease: fired.count,
    ringCenters: fired.rings.map((ring) => ring.center.map(Math.round)),
    distinctAnimatedElements: peak,
    peakCeiling: 8,
    ringsAfterSecondRelease: repeated.count,
  });

  expect(fired.count, "rings for 5 concurrent pointers").toBe(TOUCH_RING_MAX);
  expect(fired.count).toBeLessThanOrEqual(4);
  // `A11`'s ceiling, measured on the trace's own worst case: four fingers at once.
  expect(
    peak,
    "distinct animated elements with four rings in flight",
  ).toBeLessThanOrEqual(8);
  // Distinct pointers → distinct touch points: four rings, four places, not four copies of one.
  const centers = new Set(
    fired.rings.map((ring) => ring.center.map(Math.round).join(",")),
  );
  expect(centers.size, "distinct ring positions").toBe(TOUCH_RING_MAX);
  expect(
    repeated.count,
    "rings after a second release on the same pointers",
  ).toBe(TOUCH_RING_MAX);
});

test("§B7 the trace never becomes a click effect: a board control outside §B7's six objects makes no ring", async ({
  page,
}) => {
  await board(page);
  const control = page.getByRole("button", { name: "Lompat", exact: true });
  await control.click();
  const afterControl = await readTrace(page);
  // §B7's own object list, asserted as a product fact rather than a comment: the marker is one of
  // them, and the jalankan/lompat controls are not.
  const ownership = await page.evaluate(
    ({ selector, controlSelector }) => ({
      markerMatches: document.querySelectorAll(selector).length,
      controlMatches: document.querySelectorAll(controlSelector).length,
    }),
    {
      selector: TOUCH_TARGET_SELECTOR,
      controlSelector:
        '[aria-label="Besar lompatan"], [role="button"][aria-label="Lompat"]',
    },
  );
  await writeEvidence("touch-trace-scope.json", {
    row: "§B7 scope",
    document:
      "INTERACTION_DELTA_V4 §B7 — press/trace on the board's interactive objects",
    transport: "fixture",
    targetSelector: TOUCH_TARGET_SELECTOR,
    ringsAfterClickingANonB7Control: afterControl.count,
    ownership,
  });
  expect(
    ownership.markerMatches,
    "the §B7 selector resolves the marker",
  ).toBeGreaterThan(0);
  expect(afterControl.count, "rings after a click on a non-§B7 control").toBe(
    0,
  );
});

test("§B7 reduced motion: the app's own switch leaves the press and removes the ring entirely", async ({
  page,
}) => {
  await board(page, { motionOff: "app" });
  const marker = page.getByTestId("number-marker");
  const box = (await marker.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  const pressed = await marker.evaluate((el) => getComputedStyle(el).transform);
  await page.mouse.up();
  await page.waitForTimeout(600);
  const reading = await readTrace(page);
  const animated = await page.evaluate(ANIMATED_PROBE);
  await writeEvidence("touch-trace-motion-off.json", {
    row: "§B7 reduced motion",
    document:
      'INTERACTION_DELTA_V4 §B7 — "Only the press offset remains as an instant state change; no ring (A.5.3)"',
    transport: "fixture",
    pressedTransform: pressed,
    rings: reading.count,
    animatedElements: animated,
  });
  // The press survives (it is the gesture's remaining carrier); the ring does not exist at all.
  expect(pressed, "the marker's pressed transform with motion off").toMatch(
    /^matrix\(1, 0, 0, 1, 0, 2\)$/,
  );
  expect(reading.count, "rings with motion off").toBe(0);
  expect(reading.trace, "the trace container with motion off").toBeNull();
  expect(animated, "distinct animated elements with motion off").toBe(0);
});
