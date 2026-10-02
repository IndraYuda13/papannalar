import { test, expect, type Locator } from "@playwright/test";
import { writeFile } from "node:fs/promises";
import { loginTeacher } from "../browser/helpers";
import { snapshotSchema } from "../../src/contracts/presentation";
import {
  remoteStatusSchema,
  type RemoteAction,
} from "../../src/contracts/remote";
import { publicTool, type PublicTool } from "../../src/contracts/tools";
import { GRAPH_EXAMPLES } from "../../src/core/tools/graph-tasks";
for (const touches of [0, 1, 2, 4])
  test(`BOARD01 six checks, ${touches} touch fallback, local profile and public payload`, async ({
    browser,
  }) => {
    const context = await browser.newContext({
        baseURL: "http://127.0.0.1:3100",
        viewport: { width: 1920, height: 1080 },
        hasTouch: true,
      }),
      page = await context.newPage(),
      errors: string[] = [];
    page.on("pageerror", () => errors.push("runtime"));
    await page.goto("/layar");
    await page
      .getByRole("button", { name: "Simpan tampilan", exact: true })
      .click();
    const panel = page.getByRole("region", {
        name: "Tes Kemampuan Papan",
        exact: true,
      }),
      cdp = await context.newCDPSession(page);
    for (const [stage, n] of [1, 2, 4].entries()) {
      await expect(panel.getByLabel("Progres tes")).toHaveText(
        `Tahap ${stage + 1} dari 6`,
      );
      if (touches >= n) {
        const points = [];
        await panel
          .getByRole("button", { name: "Target sentuh 1", exact: true })
          .scrollIntoViewIfNeeded();
        for (let i = 1; i <= n; i++) {
          const box = (await panel
            .getByRole("button", { name: `Target sentuh ${i}`, exact: true })
            .boundingBox())!;
          points.push({
            id: i,
            x: box.x + box.width / 2,
            y: box.y + box.height / 2,
          });
        }
        await cdp.send("Input.dispatchTouchEvent", {
          type: "touchStart",
          touchPoints: points,
        });
        await expect(panel.getByRole("status")).toContainText(
          "Sentuhan bersamaan terbaca",
        );
        await cdp.send("Input.dispatchTouchEvent", {
          type: "touchEnd",
          touchPoints: [],
        });
        await expect(panel.getByLabel("Progres tes")).toHaveText(
          `Tahap ${stage + 2} dari 6`,
        );
      } else {
        await panel
          .getByRole("button", {
            name:
              touches === 0
                ? "Gunakan tanpa sentuhan"
                : `Lanjut dengan ${touches} sentuhan`,
            exact: true,
          })
          .click();
        break;
      }
    }
    await expect(panel.getByLabel("Progres tes")).toHaveText("Tahap 5 dari 6");
    for (let i = 1; i <= 5; i++) {
      await panel
        .getByRole("button", { name: "Ketuk untuk ukur", exact: true })
        .click();
      await expect(panel.getByRole("status")).toContainText(
        i < 5 ? `${i} dari 5 ketukan` : "Pemeriksaan selesai",
      );
    }
    await expect(panel.getByLabel("Progres tes")).toHaveText("Tahap 6 dari 6");
    await expect(
      panel.getByRole("button", { name: "Simpan profil papan", exact: true }),
    ).toBeDisabled();
    await panel
      .getByRole("button", {
        name: touches === 0 ? "Terlalu tinggi · setengah bawah" : "Terjangkau",
        exact: true,
      })
      .click();
    const saved = page.waitForResponse((r) =>
      r.url().endsWith("/api/v1/board/profile"),
    );
    await panel
      .getByRole("button", { name: "Simpan profil papan", exact: true })
      .click();
    const response = await saved;
    expect(response.status()).toBe(200);
    const sent = response.request().postDataJSON();
    expect(sent).toMatchObject({
      touches,
      samples: 5,
      height: touches === 0 ? "high" : "normal",
    });
    expect(Object.keys(sent).sort()).toEqual(
      [
        "schemaVersion",
        "touches",
        "pointerEvents",
        "indexedDb",
        "serviceWorker",
        "width",
        "heightPixels",
        "browser",
        "major",
        "samples",
        "medianMs",
        "p95Ms",
        "height",
        "durationSeconds",
      ].sort(),
    );
    expect(sent.p95Ms).toBeGreaterThanOrEqual(sent.medianMs);
    await page.reload();
    await expect(panel).toHaveCount(0);
    const menu = page.getByText("Menu papan · kemampuan dan cadangan", {
      exact: true,
    });
    if (
      !(await menu.evaluate(
        (summary) => (summary.parentElement as HTMLDetailsElement).open,
      ))
    )
      await menu.click();
    if (touches === 0)
      await expect(
        page.getByText(/Papan ini belum bisa disentuh/),
      ).toBeVisible();
    if (touches <= 1)
      await expect(
        page.getByText(
          "Gunakan papan bergantian. Sentuhan bersama belum tersedia.",
        ),
      ).toBeVisible();
    if (touches === 0 || touches === 2) {
      const teacherContext = await browser.newContext({
          baseURL: "http://127.0.0.1:3100",
        }),
        teacher = await teacherContext.newPage();
      await loginTeacher(teacher);
      const headers = { Origin: "http://127.0.0.1:3100" },
        classId = crypto.randomUUID();
      expect(
        (
          await teacher.request.post("/api/v1/classes", {
            headers,
            data: {
              id: classId,
              label: "7K",
              grade: 7,
              count: 3,
              mode: "demo",
            },
          })
        ).status(),
      ).toBe(201);
      const code = (await page
        .getByTestId("pairing-code")
        .textContent())!.replace(/\s/g, "");
      const claim = await teacher.request.post("/api/v1/pairing", {
        headers,
        data: {
          action: "claim",
          classId,
          sessionId: crypto.randomUUID(),
          code,
          payload: {
            schemaVersion: 1,
            mode: "station",
            question: 1,
            taskEpoch: crypto.randomUUID(),
            groups: [],
            tool: {
              kind: "number-line",
              origin: { numerator: -3, denominator: 1 },
              delta: { numerator: -5, denominator: 1 },
              orientation: "horizontal",
            },
            pattern: "together",
          },
        },
      });
      expect(claim.status()).toBe(200);
      const snapshot = await claim.json();
      await expect(page.getByTestId("board-connection")).toContainText(
        "Tersambung",
      );
      const pairedProfile = await teacher.request.get(
        `/api/v1/board-profiles?presentationId=${snapshot.envelope.presentationId}`,
      );
      expect(pairedProfile.status()).toBe(200);
      expect((await pairedProfile.json()).profile.touches).toBe(touches);
      if (touches === 2) {
        await expect(
          page.getByText(
            "Dua model, dua cara. Bandingkan hasil tanpa lomba waktu.",
          ),
        ).toBeVisible();
        await expect(page.getByTestId("number-position")).toHaveCount(2);
      } else {
        const lower = page.locator('[data-board-height="high"]');
        expect((await lower.boundingBox())!.y).toBeGreaterThanOrEqual(540);
        await page
          .getByRole("button", { name: "Lihat contoh", exact: true })
          .scrollIntoViewIfNeeded();
        expect(
          (await page
            .getByRole("button", { name: "Lihat contoh", exact: true })
            .boundingBox())!.y,
        ).toBeGreaterThanOrEqual(540);
        await page.screenshot({
          path: "artifacts/qa/M12/low-touch-zone.png",
          fullPage: false,
        });
      }
      await page
        .getByText("Menu papan · kemampuan dan cadangan", { exact: true })
        .click();
      await teacherContext.close();
    }
    if (
      !(await menu.evaluate(
        (summary) => (summary.parentElement as HTMLDetailsElement).open,
      ))
    )
      await menu.click();
    await page
      .getByRole("button", { name: "Tes Kemampuan Papan", exact: true })
      .click();
    await expect(panel.getByLabel("Progres tes")).toHaveText("Tahap 1 dari 6");
    await page.screenshot({
      path: `artifacts/qa/M12/capability-${touches}.png`,
      fullPage: false,
    });
    expect(errors).toEqual([]);
    await writeFile(
      `artifacts/qa/M12/capability-${touches}.json`,
      JSON.stringify(
        {
          sample: "CDP synthetic touch events, not physical hardware",
          profile: sent,
          errors,
        },
        null,
        2,
      ),
    );
    await context.close();
  });

test("REMOTE01 teacher trackpad changes actual tool, ACKs terminal input, cannot control reflection and stops offline", async ({
  page,
  browser,
}) => {
  test.setTimeout(120000);
  const errors: string[] = [];
  await loginTeacher(page);
  await page.getByLabel("Data kelas").selectOption("demo");
  await page.getByRole("button", { name: "Buat kelas", exact: true }).click();
  await page.getByLabel("Nama rombel", { exact: true }).fill("7Q");
  await page.getByRole("button", { name: "Simpan kelas", exact: true }).click();
  await page.getByRole("button", { name: /Buka kelas 7Q/ }).click();
  await page
    .getByRole("button", { name: "Mulai Sesi Tepat Level", exact: true })
    .click();
  const context = await browser.newContext({
      baseURL: "http://127.0.0.1:3100",
      viewport: { width: 1920, height: 1080 },
    }),
    board = await context.newPage();
  for (const surface of [page, board])
    surface.on("pageerror", () => errors.push("runtime"));
  await board.goto("/layar");
  await board
    .getByRole("button", { name: "Simpan tampilan", exact: true })
    .click();
  await board
    .getByRole("button", {
      name: "Tutup tes · lanjut dengan cadangan",
      exact: true,
    })
    .click();
  const code = (await board.getByTestId("pairing-code").textContent())!.replace(
    /\s/g,
    "",
  );
  await page.getByLabel("Kode pasangan", { exact: true }).fill(code);
  await page
    .getByRole("button", { name: "Hubungkan papan", exact: true })
    .click();
  await expect(page.getByTestId("pairing-status")).toContainText(
    "Layar tersambung",
  );
  await page.getByText("Pratinjau Alat Nalar", { exact: true }).click();
  await page
    .getByLabel("Pilih Alat Nalar", { exact: true })
    .selectOption("number-line");
  await page
    .getByLabel("Pola interaksi", { exact: true })
    .selectOption("build");
  await page
    .getByRole("button", { name: "Buka latihan Garis Bilangan", exact: true })
    .click();
  await expect(board.getByTestId("number-position")).toContainText("−3");
  let lastInput: Record<string, unknown> | undefined;
  page.on("request", (r) => {
    if (
      r.url().endsWith("/api/v1/remote") &&
      r.postDataJSON()?.action === "send"
    )
      lastInput = r.postDataJSON();
  });
  const remote = page
    .getByText("Kendali dari HP", { exact: true })
    .locator("..");
  await remote.locator("summary").click();
  await remote
    .getByRole("button", { name: "Aktifkan kendali alat", exact: true })
    .click();
  await expect(remote.getByRole("status")).toContainText("Kendali aktif");
  async function clickBoard(target: Locator) {
    await target.scrollIntoViewIfNeeded();
    const p = await target.evaluate((element) => {
      const rect = element.getBoundingClientRect(),
        root = element
          .closest('[data-remote-area="tool"]')!
          .getBoundingClientRect();
      const left = Math.max(0, root.left),
        top = Math.max(0, root.top),
        right = Math.min(innerWidth, root.right),
        bottom = Math.min(innerHeight, root.bottom);
      return {
        x: (rect.x + rect.width / 2 - left) / (right - left),
        y: (rect.y + rect.height / 2 - top) / (bottom - top),
      };
    });
    const pad = remote.getByRole("application", {
      name: "Trackpad alat papan",
    });
    await pad.scrollIntoViewIfNeeded();
    const box = (await pad.boundingBox())!;
    const sent = page.waitForResponse(
      (r) =>
        r.url().endsWith("/api/v1/remote") &&
        r.request().postDataJSON()?.action === "send",
    );
    await pad.click({ position: { x: box.width * p.x, y: box.height * p.y } });
    expect((await sent).status()).toBe(200);
  }
  await clickBoard(board.getByLabel("Besar lompatan", { exact: true }));
  await expect(
    remote.getByRole("button", { name: "Terapkan nilai", exact: true }),
  ).toBeEnabled();
  await remote.getByLabel("Nilai kendali terpilih", { exact: true }).fill("-5");
  await remote
    .getByRole("button", { name: "Terapkan nilai", exact: true })
    .click();
  await expect(board.getByLabel("Besar lompatan", { exact: true })).toHaveValue(
    "-5",
  );
  await clickBoard(board.getByRole("button", { name: "Lompat", exact: true }));
  await expect(board.getByTestId("number-position")).toContainText("−8");
  await clickBoard(
    board.getByRole("button", { name: "Jalankan", exact: true }),
  );
  await expect(
    board.getByRole("region", { name: "Garis Bilangan Lompat", exact: true }),
  ).toContainText("Model sudah sesuai");
  await clickBoard(
    board.getByRole("button", { name: "Ulang langkah", exact: true }),
  );
  await expect(board.getByTestId("number-position")).toContainText("−3");
  await board.screenshot({
    path: "artifacts/qa/M12/remote-number-line.png",
    fullPage: false,
  });
  await page.context().setOffline(true);
  await expect(remote.getByRole("status")).toContainText("Kendali berhenti");
  await expect(
    remote.getByRole("button", { name: "Terapkan nilai", exact: true }),
  ).toBeDisabled();
  // The tool itself remains usable on the board without the HP link.
  await board.getByRole("button", { name: "Lompat", exact: true }).click();
  await expect(board.getByTestId("number-position")).toContainText("−8");
  await page.context().setOffline(false);
  await page.getByRole("button", { name: "Refleksi", exact: true }).click();
  await expect(
    board.getByText("Hari ini aku belajar …", { exact: true }),
  ).toBeVisible();
  expect(lastInput).toBeDefined();
  const stale = await page.request.post("/api/v1/remote", {
    headers: { Origin: "http://127.0.0.1:3100" },
    data: lastInput,
  });
  expect(stale.status()).toBe(409);
  expect(errors).toEqual([]);
  await writeFile(
    "artifacts/qa/M12/remote-browser.json",
    JSON.stringify(
      {
        tool: "number-line",
        initial: -3,
        remoteJump: -5,
        result: -8,
        undo: -3,
        terminalAck: true,
        offlineStop: true,
        staleStatus: stale.status(),
        errors,
      },
      null,
      2,
    ),
  );
  await context.close();
});

test("REMOTE02 fractions, ratio, algebra, balance and graphs use the bounded input channel", async ({
  page,
  browser,
}) => {
  test.setTimeout(120000);
  await loginTeacher(page);
  const headers = { Origin: "http://127.0.0.1:3100" },
    classId = crypto.randomUUID();
  expect(
    (
      await page.request.post("/api/v1/classes", {
        headers,
        data: { id: classId, label: "7U", grade: 7, count: 3, mode: "demo" },
      })
    ).status(),
  ).toBe(201);
  const context = await browser.newContext({
      baseURL: "http://127.0.0.1:3100",
      viewport: { width: 1920, height: 1080 },
    }),
    board = await context.newPage(),
    errors: string[] = [];
  board.on("pageerror", () => errors.push("runtime"));
  board.on("console", (m) => {
    if (m.type() === "error") errors.push("console");
  });
  await board.goto("/layar");
  await board
    .getByRole("button", { name: "Simpan tampilan", exact: true })
    .click();
  await board
    .getByRole("button", {
      name: "Tutup tes · lanjut dengan cadangan",
      exact: true,
    })
    .click();
  const code = (await board.getByTestId("pairing-code").textContent())!.replace(
    /\s/g,
    "",
  );
  const fraction: PublicTool = {
    kind: "fractions",
    operation: "represent",
    left: { numerator: 1, denominator: 2 },
    right: { numerator: 0, denominator: 2 },
  };
  let snapshot = snapshotSchema.parse(
    await (
      await page.request.post("/api/v1/pairing", {
        headers,
        data: {
          action: "claim",
          classId,
          sessionId: crypto.randomUUID(),
          code,
          payload: {
            schemaVersion: 1,
            mode: "station",
            question: 1,
            taskEpoch: crypto.randomUUID(),
            groups: [],
            tool: fraction,
            pattern: "build",
          },
        },
      })
    ).json(),
  );
  const binding = () => ({
    presentationId: snapshot.envelope.presentationId,
    channelEpoch: snapshot.envelope.channelEpoch,
    taskEpoch: snapshot.envelope.payload.taskEpoch,
  });
  async function read() {
    const response = await page.request.post("/api/v1/remote", {
      headers,
      data: { action: "read", ...binding() },
    });
    expect(response.status()).toBe(200);
    return remoteStatusSchema.parse(await response.json());
  }
  async function send(input: RemoteAction) {
    await expect
      .poll(async () => Boolean((await read()).instanceId))
      .toBe(true);
    const state = await read();
    const command = {
      id: crypto.randomUUID(),
      instanceId: state.instanceId,
      sequence: state.sequence + 1,
      taskEpoch: binding().taskEpoch,
      input,
    };
    const response = await page.request.post("/api/v1/remote", {
      headers,
      data: { action: "send", ...binding(), command },
    });
    expect(response.status()).toBe(200);
    await expect.poll(async () => (await read()).receipt?.id).toBe(command.id);
    expect((await read()).receipt?.applied).toBe(true);
  }
  async function activate(target: Locator) {
    await target.scrollIntoViewIfNeeded();
    await expect(target).toBeEnabled();
    // The transport applies normalized coordinates on the next board poll.
    // History/weights change the tool's height; require stable geometry and a
    // real hit target rather than sampling an intermediate React layout.
    let signature = "",
      stableSince = 0,
      p = { x: 0, y: 0 };
    await expect
      .poll(
        async () => {
          const sample = await target.evaluate((el) => {
            const b = el.getBoundingClientRect(),
              r = el
                .closest('[data-remote-area="tool"]')!
                .getBoundingClientRect();
            const l = Math.max(0, r.left),
              t = Math.max(0, r.top),
              cx = b.x + b.width / 2,
              cy = b.y + b.height / 2;
            return {
              x: (cx - l) / (Math.min(innerWidth, r.right) - l),
              y: (cy - t) / (Math.min(innerHeight, r.bottom) - t),
              hit:
                document
                  .elementFromPoint(cx, cy)
                  ?.closest('button,input,select,[role="button"]') === el,
              signature: [
                b.x,
                b.y,
                b.width,
                b.height,
                r.x,
                r.y,
                r.width,
                r.height,
              ]
                .map((n) => Math.round(n * 100))
                .join(","),
              now: performance.now(),
            };
          });
          if (!sample.hit || sample.signature !== signature) {
            signature = sample.signature;
            stableSince = sample.now;
            return false;
          }
          p = { x: sample.x, y: sample.y };
          return sample.now - stableSince >= 300;
        },
        { timeout: 7000, intervals: [50, 100] },
      )
      .toBe(true);
    await send({ kind: "activate", ...p });
  }
  async function open(tool: PublicTool) {
    snapshot = snapshotSchema.parse(
      await (
        await page.request.post("/api/v1/pairing", {
          headers,
          data: {
            action: "publish",
            presentationId: snapshot.envelope.presentationId,
            channelEpoch: snapshot.envelope.channelEpoch,
            baseRevision: snapshot.envelope.revision,
            commandId: crypto.randomUUID(),
            payload: {
              schemaVersion: 1,
              mode: "station",
              question: 1,
              taskEpoch: crypto.randomUUID(),
              groups: [],
              tool,
              pattern: "build",
            },
          },
        })
      ).json(),
    );
  }
  await activate(
    board.getByRole("button", { name: "Batang 1 bagian 1", exact: true }),
  );
  await activate(board.getByRole("button", { name: "Jalankan", exact: true }));
  await expect(
    board.getByRole("region", { name: "Batang Pecahan", exact: true }),
  ).toContainText("Model sudah sesuai");
  await activate(board.getByLabel("Bagi batang 1", { exact: true }));
  await send({ kind: "value", value: "4" });
  await expect(board.getByLabel("Bagi batang 1", { exact: true })).toHaveValue(
    "4",
  );
  await open({ kind: "ratio", baseX: 2, baseY: 3, targetX: 6 });
  await activate(
    board.getByRole("button", { name: "Tambah kolom × pengali", exact: true }),
  );
  await expect(
    board.getByLabel("Nilai B kolom 2", { exact: true }),
  ).toHaveValue("9");
  await activate(board.getByLabel("Nilai B kolom 2", { exact: true }));
  await send({ kind: "value", value: "7" });
  await activate(board.getByRole("button", { name: "Jalankan", exact: true }));
  await expect(
    board.getByRole("region", { name: "Tabel Rasio", exact: true }),
  ).toContainText("Periksa pengali kedua baris");
  await activate(
    board.getByRole("button", { name: "Ulang langkah", exact: true }),
  );
  await expect(
    board.getByLabel("Nilai B kolom 2", { exact: true }),
  ).toHaveValue("9");
  await open({ kind: "algebra", groups: 1, xPerGroup: 1, constantPerGroup: 1 });
  await activate(
    board.getByRole("button", { name: "Tambah kelompok", exact: true }),
  );
  await activate(
    board.getByRole("button", { name: "Tambah ubin +x", exact: true }),
  );
  await activate(
    board.getByRole("button", { name: "Tambah ubin +1", exact: true }),
  );
  await activate(board.getByRole("button", { name: "Jalankan", exact: true }));
  await expect(
    board.getByRole("region", { name: "Ubin Aljabar", exact: true }),
  ).toContainText("Model sudah sesuai");
  await open({
    kind: "balance",
    left: { x: 3, constant: -7 },
    right: { x: 0, constant: 11 },
  });
  for (const [value, label] of [
    ["7", "Tambah kedua ruas"],
    ["3", "Bagi kedua ruas"],
  ]) {
    await activate(
      board.getByLabel("Nilai operasi timbangan", { exact: true }),
    );
    await send({ kind: "value", value });
    await activate(board.getByRole("button", { name: label, exact: true }));
  }
  await expect(board.getByTestId("balance-left")).toHaveText("x");
  await expect(board.getByTestId("balance-right")).toHaveText("6");
  await activate(board.getByRole("button", { name: "Jalankan", exact: true }));
  await expect(
    board.getByRole("region", { name: "Timbangan Persamaan", exact: true }),
  ).toContainText("Model sudah sesuai");
  await open(publicTool(GRAPH_EXAMPLES.linear));
  for (const [label, value] of [
    ["Kemiringan A", "2"],
    ["Titik potong y A", "1"],
    ["Koordinat x grafik", "3"],
  ]) {
    await activate(board.getByLabel(label, { exact: true }));
    await send({ kind: "value", value });
  }
  await activate(
    board.getByRole("button", { name: "Titik pada kurva A", exact: true }),
  );
  await expect(board.getByTestId("graph-point")).toHaveText("Titik (3, 7)");
  await activate(board.getByRole("button", { name: "Jalankan", exact: true }));
  await expect(
    board.getByRole("region", { name: "Grafik Geser", exact: true }),
  ).toContainText("Model sudah sesuai");
  expect(errors).toEqual([]);
  await context.close();
});
