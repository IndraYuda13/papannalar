import { openBoard, chooseTeacherMode } from "../browser/helpers";
import { test, expect, type Page, type Browser } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import {
  loginTeacher,
  injectFixture,
  waitForShellCache,
} from "../browser/helpers";
import { generateQuestion } from "../../src/core/package/question";
import { questionTool } from "../../src/core/package/tool-task";
import { toPublicQuestion } from "../../src/contracts/package";
import { publicTool } from "../../src/contracts/tools";
import {
  publicPresentation,
  snapshotSchema,
  type PresentationEnvelope,
  type PresentationState,
} from "../../src/contracts/presentation";
import { remoteStatusSchema } from "../../src/contracts/remote";
import { boardPackageFixture } from "../fixtures/board-package";
import { packagePages } from "../../src/features/layar/package-navigation";
import { STEP_IDS } from "../../src/content/ladder/registry";
import { withContext } from "../../src/content/contexts/question";
import {
  spotlightView,
  resumeView,
} from "../../src/features/layar/presentation-view";
const headers = { Origin: "http://127.0.0.1:3100" };
async function paired(page: Page, browser: Browser) {
  await loginTeacher(page);
  await chooseTeacherMode(page, "demo");
  await page.getByRole("button", { name: "Buat kelas", exact: true }).click();
  await page.getByLabel("Nama rombel", { exact: true }).fill("7V");
  await page.getByRole("button", { name: "Simpan kelas", exact: true }).click();
  await page.getByRole("button", { name: /Buka kelas 7V/ }).click();
  await page
    .getByRole("button", { name: "Mulai Sesi Tepat Level", exact: true })
    .click();
  const context = await browser.newContext({
      baseURL: "http://127.0.0.1:3100",
      viewport: { width: 1920, height: 1080 },
    }),
    board = await context.newPage(),
    errors: string[] = [];
  for (const surface of [page, board]) {
    surface.on("pageerror", () => errors.push("runtime"));
    surface.on("console", (m) => {
      if (m.type() === "error") errors.push("console");
    });
  }
  await openBoard(board);
  await page
    .getByLabel("Kode pasangan", { exact: true })
    .fill(
      (await board.getByTestId("pairing-code").textContent())!.replace(
        /\s/g,
        "",
      ),
    );
  const claimed = page.waitForResponse(
    (r) =>
      r.url().endsWith("/api/v1/pairing") &&
      r.request().postDataJSON()?.action === "claim",
  );
  await page
    .getByRole("button", { name: "Hubungkan papan", exact: true })
    .click();
  let snapshot = snapshotSchema.parse(await (await claimed).json());
  await expect(page.getByTestId("pairing-status")).toContainText(
    "Layar tersambung",
  );
  const controls = page.getByRole("region", {
    name: "Kontrol Layar Kelas",
    exact: true,
  });
  async function publish(payload: PresentationState) {
    const controllerId = await page.evaluate(() =>
      sessionStorage.getItem("pn-presentation-controller-v1"),
    );
    expect(controllerId).toMatch(/^[a-f0-9-]{36}$/);
    const current = snapshotSchema.parse(
      await (
        await page.request.post("/api/v1/pairing", {
          headers,
          data: {
            action: "snapshot",
            controllerId,
            presentationId: snapshot.envelope.presentationId,
          },
        })
      ).json(),
    );
    const response = await page.request.post("/api/v1/pairing", {
      headers,
      data: {
        action: "publish",
        controllerId,
        presentationId: current.envelope.presentationId,
        channelEpoch: current.envelope.channelEpoch,
        baseRevision: current.envelope.revision,
        commandId: crypto.randomUUID(),
        payload: publicPresentation(payload),
      },
    });
    expect(response.status()).toBe(200);
    snapshot = snapshotSchema.parse(await response.json());
    // Canonical receipt for this revision, not a briefly retained status from
    // the previous question. Polling fallback can take two recovery cycles.
    await expect
      .poll(
        async () => {
          const receipt = snapshotSchema.parse(
            await (
              await page.request.post("/api/v1/pairing", {
                headers,
                data: {
                  action: "snapshot",
                  controllerId,
                  presentationId: snapshot.envelope.presentationId,
                },
              })
            ).json(),
          );
          return (
            receipt.ackRevision === snapshot.envelope.revision &&
            receipt.ackCommandId === snapshot.envelope.commandId
          );
        },
        { timeout: 15000 },
      )
      .toBe(true);
    await expect(controls.getByTestId("pairing-status")).toContainText(
      "Layar tersambung",
    );
    return snapshot.envelope;
  }
  return {
    context,
    board,
    controls,
    errors,
    publish,
    state: snapshot.envelope.payload,
  };
}
async function openLine(page: Page) {
  await page.getByText("Pratinjau Alat Nalar", { exact: true }).click();
  await page
    .getByLabel("Pilih Alat Nalar", { exact: true })
    .selectOption("number-line");
  await page
    .getByRole("button", { name: "Buka latihan Garis Bilangan", exact: true })
    .click();
}
test("UI01 SD public questions, independent work and exit reasons render their given models without assessment keys", async ({
  page,
  browser,
}) => {
  test.setTimeout(150000);
  const { context, board, errors, publish } = await paired(page, browser);
  const failedRequests: string[] = [];
  for (const surface of [page, board])
    surface.on("response", (response) => {
      if (response.status() >= 400)
        failedRequests.push(
          `${response.request().method()} ${new URL(response.url()).pathname}: ${response.status()}`,
        );
    });
  const { packet } = boardPackageFixture(5);
  const pages = packagePages(packet.content, packet.plan, packet.plan.id);
  const opening = await publish(pages[0].state);
  const transfer = await page.request.post("/api/v1/presentation-content", {
    headers,
    data: {
      action: "write",
      presentationId: opening.presentationId,
      channelEpoch: opening.channelEpoch,
      packet,
    },
  });
  expect(transfer.status()).toBe(200);
  await expect(board.getByTestId("board-cache-status")).toContainText(
    "tersimpan",
  );
  await expect(
    board.getByRole("figure", { name: "Model visual soal" }),
  ).toHaveAttribute("data-diagram", "fractions");
  const check = pages.find((p) => p.state.mode === "check")!.state;
  for (const step of STEP_IDS.slice(0, 12)) {
    const q = toPublicQuestion(generateQuestion(step, 31));
    await publish({
      ...check,
      taskEpoch: crypto.randomUUID(),
      check: { ...check.check!, question: q },
    });
    await expect(
      board
        .getByRole("region", { name: "Soal cek paket" })
        .getByRole("figure", { name: "Model visual soal" }),
    ).toBeVisible();
    await expect(board.locator('[data-diagram="quantities"]')).toHaveCount(0);
  }
  for (const step of ["A4", "B2", "C3", "C4"] as const) {
    const q = toPublicQuestion(withContext(generateQuestion(step, 31)));
    await publish({
      ...check,
      taskEpoch: crypto.randomUUID(),
      check: { ...check.check!, question: q },
    });
    await expect(
      board
        .getByRole("region", { name: "Soal cek paket" })
        .getByRole("figure", { name: "Model visual soal" }),
    ).toBeVisible();
    await expect(board.locator('[data-diagram="quantities"]')).toHaveCount(0);
  }
  const station = pages.find((p) => p.state.activity)!.state;
  await publish({ ...station, taskEpoch: crypto.randomUUID() });
  await expect(
    board.getByRole("region", { name: "Aktivitas paket" }),
  ).toBeVisible();
  const exit = pages.find((p) => p.state.exit?.row === 2)!.state;
  await publish({ ...exit, taskEpoch: crypto.randomUUID() });
  await expect(
    board
      .getByRole("region", { name: "Kartu Keluar kelompok" })
      .getByRole("figure", { name: "Model visual soal" }),
  ).toHaveCount(packet.plan.groups.length);
  await expect(board.locator('[data-diagram="quantities"]')).toHaveCount(0);
  await expect(board.locator('[data-board-height="normal"]')).toBeVisible();
  await mkdir("artifacts/qa/M15", { recursive: true });
  await board.screenshot({ path: "artifacts/qa/M15/sd-exit-visual.png" });
  expect(errors, failedRequests.join("\n")).toEqual([]);
  await writeFile(
    "artifacts/qa/M15/sd-visual-browser.json",
    JSON.stringify(
      {
        environment: "LOCAL_CHROMIUM",
        plainQuestions: 12,
        contextQuestions: 4,
        exitGroups: packet.plan.groups.length,
        errors,
      },
      null,
      2,
    ),
  );
  await context.close();
});
test("UI01 teacher hint controls report board progress and target reveal needs explicit HP confirmation without replacing the student model", async ({
  page,
  browser,
}) => {
  const { context, board, controls, errors } = await paired(page, browser);
  await openLine(page);
  const student = board.getByRole("region", {
    name: "Pola Alat Nalar",
    exact: true,
  });
  const line = student.getByRole("region", {
    name: "Garis Bilangan Lompat",
    exact: true,
  });
  await line.getByLabel("Besar lompatan", { exact: true }).fill("1");
  await line.getByRole("button", { name: "Lompat", exact: true }).click();
  await expect(line.getByTestId("number-position")).toContainText("−2");
  await student
    .getByRole("button", { name: "Petunjuk 1", exact: true })
    .click();
  const guide = controls.getByRole("region", {
    name: "Petunjuk dan jawaban latihan",
    exact: true,
  });
  await expect(guide).toContainText("papan: 1/3");
  await expect(board.getByTestId("teacher-reveal")).toHaveCount(0);
  await guide
    .getByRole("button", { name: "Tunjukkan jawaban", exact: true })
    .click();
  await expect(
    page.getByRole("alertdialog", { name: "Konfirmasi jawaban latihan" }),
  ).toBeVisible();
  await expect(board.getByTestId("teacher-reveal")).toHaveCount(0);
  await guide.getByRole("button", { name: "Batal", exact: true }).click();
  await expect(board.getByTestId("teacher-reveal")).toHaveCount(0);
  await guide
    .getByRole("button", { name: "Tunjukkan jawaban", exact: true })
    .click();
  await guide
    .getByRole("button", { name: "Tampilkan jawaban latihan", exact: true })
    .click();
  await expect(board.getByTestId("teacher-reveal")).toContainText("−8");
  await expect(line.getByTestId("number-position")).toContainText("−2");
  await guide
    .getByRole("button", { name: "Tutup jawaban latihan", exact: true })
    .click();
  await expect(board.getByTestId("teacher-reveal")).toHaveCount(0);
  await expect(line.getByTestId("number-position")).toContainText("−2");
  await guide
    .getByRole("button", { name: "Petunjuk berikutnya", exact: true })
    .click();
  await expect(guide).toContainText("papan: 2/3");
  await guide
    .getByRole("button", { name: "Petunjuk berikutnya", exact: true })
    .click();
  await expect(
    board.getByRole("region", { name: "Contoh kembar", exact: true }),
  ).toBeVisible();
  await expect(guide).toContainText("papan: 3/3");
  await expect(board.getByTestId("teacher-reveal")).toHaveCount(0);
  await controls
    .getByRole("button", { name: "Cek Level", exact: true })
    .click();
  await expect(guide).toHaveCount(0);
  expect(errors).toEqual([]);
  await context.close();
});
test("UI01 Sorot uses a twin, permits Nala repair, and returns the same station model/undo after a fresh input epoch", async ({
  page,
  browser,
}) => {
  const { context, board, controls, errors } = await paired(page, browser);
  await openLine(page);
  const line = board.getByRole("region", {
    name: "Garis Bilangan Lompat",
    exact: true,
  });
  await line.getByLabel("Besar lompatan", { exact: true }).fill("-5");
  await line.getByRole("button", { name: "Lompat", exact: true }).click();
  await expect(line.getByTestId("number-position")).toContainText("−8");
  const before = await line.getByTestId("number-position").innerText();
  await board.clock.install();
  await controls.getByRole("button", { name: "Sorot", exact: true }).click();
  const spot = board.getByRole("region", { name: "Sorot", exact: true });
  await expect(
    spot.getByRole("region", { name: "Contoh kembar", exact: true }),
  ).toBeVisible();
  await board.clock.runFor(31000);
  await spot
    .getByRole("button", { name: "Coba soal sendiri", exact: true })
    .click();
  await board.clock.resume();
  await spot
    .getByRole("button", { name: "Periksa cara Nala", exact: true })
    .click();
  await expect(spot).toContainText("Nala mencoba model ini");
  await mkdir("artifacts/qa/M14", { recursive: true });
  await spot.getByRole("heading", { name: /Sorot/ }).scrollIntoViewIfNeeded();
  await board.screenshot({ path: "artifacts/qa/M14/spotlight.png" });
  await controls
    .getByRole("button", { name: "Kembali dari Sorot", exact: true })
    .click();
  await expect(spot).toHaveCount(0);
  await expect(line.getByTestId("number-position")).toHaveText(before);
  await line
    .getByRole("button", { name: "Ulang langkah", exact: true })
    .click();
  await expect(line.getByTestId("number-position")).toContainText("−3");
  expect(errors).toEqual([]);
  await context.close();
});
test("UI01 four public panels paginate with 72px prompts, independent model state and offline resume", async ({
  page,
  browser,
}) => {
  const { context, board, errors, publish, state } = await paired(
    page,
    browser,
  );
  const labels: PresentationState["groups"][number]["label"][] = [
    "Segitiga Biru",
    "Lingkaran Oranye",
    "Kotak Hijau",
    "Belah Ketupat Ungu",
  ];
  const groups = labels.map((label, i) => ({
    id: crypto.randomUUID(),
    label,
    attendanceNumbers: [i + 1],
  }));
  const split = {
    panels: groups.map((g, i) => ({
      groupId: g.id,
      exercises: [1, 2].map((j) => {
        const q = generateQuestion("D1", i * 13 + j * 9);
        return {
          id: q.id,
          prompt: toPublicQuestion(q).prompt,
          tool: publicTool(questionTool(q)!),
        };
      }),
    })),
  };
  const payload = publicPresentation({
    ...state,
    mode: "split",
    taskEpoch: crypto.randomUUID(),
    groups,
    split,
  });
  const splitEnvelope = await publish(payload);
  const remote = (env: PresentationEnvelope) =>
    page.request.post("/api/v1/remote", {
      headers,
      data: {
        action: "read",
        presentationId: env.presentationId,
        channelEpoch: env.channelEpoch,
        taskEpoch: env.payload.taskEpoch,
      },
    });
  await expect
    .poll(
      async () =>
        remoteStatusSchema.parse(await (await remote(splitEnvelope)).json())
          .instanceId,
    )
    .not.toBeNull();
  const panels = board.getByRole("region", {
    name: "Panel Terbagi",
    exact: true,
  });
  await expect(panels).toContainText("4 kelompok · Halaman 1/2");
  const first = panels
    .locator('section[aria-label="Latihan panel 1"]:visible')
    .first();
  await first.getByLabel("Besar lompatan", { exact: true }).fill("1");
  await first.getByRole("button", { name: "Lompat", exact: true }).click();
  const before = await first.getByTestId("number-position").innerText();
  await expect
    .poll(
      async () =>
        (await first.getByTestId("number-marker").boundingBox())!.width,
    )
    .toBeGreaterThanOrEqual(48);
  expect(
    await first
      .getByTestId("split-prompt")
      .evaluate((el) => parseFloat(getComputedStyle(el).fontSize)),
  ).toBeGreaterThanOrEqual(32);
  await panels
    .getByRole("button", { name: "Panel berikutnya", exact: true })
    .click();
  await expect(panels).toContainText("Halaman 2/2");
  await expect(
    panels.getByRole("heading", { name: "Kotak Hijau", exact: true }),
  ).toBeVisible();
  const spot = spotlightView(
    payload,
    split.panels[0].exercises[0].tool,
    crypto.randomUUID(),
  );
  const spotlightEnvelope = await publish(spot);
  expect((await remote(splitEnvelope)).status()).toBe(409);
  await expect
    .poll(
      async () =>
        remoteStatusSchema.parse(await (await remote(spotlightEnvelope)).json())
          .instanceId,
    )
    .not.toBeNull();
  await expect(
    board.getByRole("region", { name: "Sorot", exact: true }),
  ).toBeVisible();
  await publish(resumeView(spot, crypto.randomUUID()));
  await expect(panels).toContainText("Halaman 2/2");
  await panels
    .getByRole("button", { name: "Panel sebelumnya", exact: true })
    .click();
  await expect(first.getByTestId("number-position")).toHaveText(before);
  await injectFixture(board);
  await waitForShellCache(board);
  await context.setOffline(true);
  await panels
    .getByRole("button", { name: "Perbesar panel 1", exact: true })
    .click();
  await first
    .getByRole("button", { name: "Ulang langkah", exact: true })
    .click();
  await expect(first.getByTestId("number-position")).not.toHaveText(before);
  await panels
    .getByRole("button", { name: "Kembali ke panel", exact: true })
    .click();
  await panels
    .getByRole("heading", { name: "Panel Terbagi", exact: true })
    .scrollIntoViewIfNeeded();
  await mkdir("artifacts/qa/M14", { recursive: true });
  await board.screenshot({ path: "artifacts/qa/M14/split-four.png" });
  await board.setViewportSize({ width: 1366, height: 768 });
  expect(
    await first
      .getByTestId("split-prompt")
      .evaluate((el) => parseFloat(getComputedStyle(el).fontSize)),
  ).toBeGreaterThanOrEqual(32);
  expect(await board.locator("body").innerText()).not.toMatch(
    /\bD1\b|mastery|answerKey|nickname/,
  );
  await context.setOffline(false);
  expect(errors).toEqual([]);
  await context.close();
});
test("UI01 SD5 lower touch zone, 1.5x objects, SMA10 tariffs and explicit Berdua fallback", async ({
  page,
  browser,
}) => {
  const { context, board, controls, errors, publish, state } = await paired(
    page,
    browser,
  );
  await page
    .getByText("Pembuka bermakna dari katalog", { exact: true })
    .click();
  await page
    .getByLabel("Konteks pembuka demo", { exact: true })
    .selectOption("5");
  await page
    .getByRole("button", { name: "Tampilkan pembuka katalog", exact: true })
    .click();
  const zone = board.locator('[data-board-height="sd"]');
  await expect(zone).toBeVisible();
  expect((await zone.boundingBox())!.y).toBeGreaterThanOrEqual(359);
  const intuition = board.getByRole("button", {
    name: "Lebih kecil / kurang",
    exact: true,
  });
  await intuition.scrollIntoViewIfNeeded();
  expect((await intuition.boundingBox())!.y).toBeGreaterThanOrEqual(359);
  expect((await intuition.boundingBox())!.height).toBeGreaterThanOrEqual(48);
  await intuition.click();
  await board.screenshot({ path: "artifacts/qa/M14/sd5-low-zone.png" });
  await page
    .getByLabel("Konteks pembuka demo", { exact: true })
    .selectOption("10");
  await page
    .getByRole("button", { name: "Tampilkan pembuka katalog", exact: true })
    .click();
  await expect(zone).toHaveCount(0);
  await board.getByLabel("Nilai tebakan", { exact: true }).fill("5");
  await board
    .getByRole("button", { name: "Simpan tebakan dan coba model", exact: true })
    .click();
  const graph = board.getByRole("region", {
    name: "Grafik Geser",
    exact: true,
  });
  await expect(graph.getByTestId("graph-target")).toContainText(
    "A: y = x + 20",
  );
  expect(
    await graph
      .getByTestId("graph-target")
      .evaluate((el) => parseFloat(getComputedStyle(el).fontSize)),
  ).toBeGreaterThanOrEqual(26);
  const marker = graph.getByRole("button", {
    name: "Seret titik uji grafik",
    exact: true,
  });
  const baseWidth = (await marker.boundingBox())!.width;
  expect(baseWidth).toBeGreaterThanOrEqual(48);
  await controls
    .getByRole("button", { name: "Objek besar 1,5×", exact: true })
    .click();
  await expect
    .poll(async () => (await marker.boundingBox())!.width)
    .toBeCloseTo(baseWidth * 1.5, 1);
  await controls
    .getByRole("button", { name: "Objek besar 1,5×", exact: true })
    .click();
  await expect
    .poll(async () => (await marker.boundingBox())!.width)
    .toBeCloseTo(baseWidth, 1);
  const q = generateQuestion("D1", 13),
    tool = publicTool(questionTool(q)!);
  await publish(
    publicPresentation({
      ...state,
      mode: "together",
      taskEpoch: crypto.randomUUID(),
      tool,
    }),
  );
  await expect(board.getByTestId("two-model-results")).toContainText(
    "Cara A: sedang mencoba · Cara B: sedang mencoba",
  );
  await expect(board.getByText(/Dua sentuhan belum teruji/)).toBeVisible();
  await board
    .getByRole("button", { name: "Giliran Pilot B", exact: true })
    .click();
  await expect(
    board.getByRole("button", { name: "Giliran Pilot A", exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
  await writeFile(
    "artifacts/qa/M14/modes-browser.json",
    JSON.stringify(
      {
        source: "LOCAL_CHROMIUM",
        viewports: ["1920x1080", "1366x768"],
        physical: "NOT_RUN",
        runtimeErrors: errors,
        software: [
          "split-pagination",
          "spotlight-resume",
          "sd5",
          "sma10",
          "large-objects",
          "together-fallback",
        ],
      },
      null,
      2,
    ),
  );
  await context.close();
});
