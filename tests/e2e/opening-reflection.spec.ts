import { openTeacherExample } from "../browser/helpers";
import { openBoard } from "../browser/helpers";
import { mkdir, writeFile } from "node:fs/promises";
import { test, expect } from "@playwright/test";
import { loginTeacher, chooseTeacherMode } from "../browser/helpers";
test.use({ trace: "off", screenshot: "off", video: "off" });
declare global {
  interface Window {
    __inkAudit: { writes: number };
  }
}
test("OPEN01/PRIV02 catalog opening roles, SD intuition, persistent objective and ephemeral reflection", async ({
  page,
  browser,
}) => {
  // Nine viewport/preset combinations plus the complete ink privacy lifecycle.
  // Each assertion retains its normal timeout; revocation has a separate bound.
  test.setTimeout(60000);
  const errors: string[] = [];
  await loginTeacher(page);
  await chooseTeacherMode(page, "demo");
  await page.getByRole("button", { name: "Buat kelas", exact: true }).click();
  await page.getByLabel("Nama rombel", { exact: true }).fill("7R");
  await page.getByRole("button", { name: "Simpan kelas", exact: true }).click();
  await page.getByRole("button", { name: /Buka kelas 7R/ }).click();
  await openTeacherExample(page);
  await page
    .getByRole("button", { name: "Jalankan contoh sesi", exact: true })
    .click();
  const context = await browser.newContext({
      baseURL: "http://127.0.0.1:3100",
      viewport: { width: 1920, height: 1080 },
    }),
    board = await context.newPage();
  for (const surface of [page, board]) {
    surface.on("pageerror", () => errors.push("runtime"));
    surface.on("console", (m) => {
      if (m.type() === "error")
        errors.push(`console: ${m.text().slice(0, 180)}`);
    });
  }
  await openBoard(board);
  const code = await board.getByTestId("pairing-code").textContent();
  await page
    .getByLabel("Kode pasangan", { exact: true })
    .fill(code!.replace(/\s/g, ""));
  await page
    .getByRole("button", { name: "Hubungkan papan", exact: true })
    .click();
  await expect(page.getByTestId("pairing-status")).toContainText(
    "Layar tersambung",
  );
  await page
    .getByText("Pertanyaan pembuka & giliran siswa", { exact: true })
    .click();
  const opening = page.getByRole("region", {
    name: "Giliran Pembuka",
    exact: true,
  });
  await opening
    .getByRole("button", { name: "Pratinjau Pilot pembuka", exact: true })
    .click();
  await expect(opening).toContainText("0/1 tugas dimulai");
  await opening
    .getByRole("button", {
      name: "Mulai pembuka dengan peran ini",
      exact: true,
    })
    .click();
  await expect(opening).toContainText("1/1 tugas dimulai");
  await expect(board.getByTestId("opening-roles")).toContainText("Pilot:");
  await expect(page.getByTestId("scan-count")).toHaveText(
    "29/32 kartu tersimpan lokal",
  );
  await board.getByLabel("Nilai tebakan", { exact: true }).fill("5");
  await board
    .getByRole("button", { name: "Simpan tebakan dan coba model", exact: true })
    .click();
  await board.getByLabel("Besar lompatan", { exact: true }).fill("7");
  await board.getByRole("button", { name: "Lompat", exact: true }).click();
  await board.getByRole("button", { name: "Jalankan", exact: true }).click();
  await expect(board.getByTestId("number-position")).toContainText(
    "perpindahan 7 lantai",
  );
  const controls = page.getByRole("region", {
    name: "Kontrol Layar Kelas",
    exact: true,
  });
  await controls.getByRole("button", { name: "Lanjutan", exact: true }).click();
  await expect(
    board.getByRole("region", { name: "Lanjutan pembuka", exact: true }),
  ).toContainText("mulai di −3 lalu turun 5");
  await expect(board.getByTestId("lesson-objective")).toContainText("basement");
  await page
    .getByLabel("Konteks pembuka demo", { exact: true })
    .selectOption("5");
  await page
    .getByRole("button", { name: "Tampilkan pembuka katalog", exact: true })
    .click();
  await expect(
    board.getByRole("region", { name: "Pembuka bermakna", exact: true }),
  ).toContainText("2/3 gelas ditambah 1/4");
  await board
    .getByRole("button", { name: "Lebih kecil / kurang", exact: true })
    .click();
  await expect(
    board.getByRole("region", { name: "Pembuka bermakna", exact: true }),
  ).toContainText("Perkiraan: lebih kecil / kurang");
  await expect(
    board.getByRole("region", { name: "Batang Pecahan", exact: true }),
  ).toHaveCount(0);
  await controls.getByRole("button", { name: "Refleksi", exact: true }).click();
  const canvas = board.getByLabel("Zona tulis sementara", { exact: true });
  await expect(canvas).toBeVisible();
  for (const size of [
    { width: 1280, height: 720 },
    { width: 1366, height: 768 },
    { width: 1920, height: 1080 },
  ]) {
    await board.setViewportSize(size);
    for (const preset of ["compact", "balanced", "large"]) {
      await board.locator(".board-surface").evaluate((el, value) => {
        el.setAttribute("data-board-preset", value);
      }, preset);
      const bounds = await board
        .getByRole("button", { name: "Bersihkan zona tulis", exact: true })
        .boundingBox();
      expect(bounds!.height).toBeGreaterThanOrEqual(48);
      expect(bounds!.y).toBeGreaterThanOrEqual(0);
      expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(size.height);
      expect(
        await board.evaluate(
          () => document.documentElement.scrollHeight <= innerHeight,
        ),
      ).toBe(true);
    }
  }
  for (const prompt of [
    "Hari ini aku belajar",
    "Ini berguna untuk",
    "Yang masih membingungkan",
  ])
    await expect(
      board.getByRole("region", { name: "Refleksi kelas", exact: true }),
    ).toContainText(prompt);
  await board.evaluate(() => {
    window.__inkAudit = { writes: 0 };
    const put = IDBObjectStore.prototype.put,
      add = IDBObjectStore.prototype.add,
      set = Storage.prototype.setItem;
    IDBObjectStore.prototype.put = function (
      this: IDBObjectStore,
      ...args: Parameters<typeof put>
    ) {
      window.__inkAudit.writes++;
      return put.apply(this, args);
    };
    IDBObjectStore.prototype.add = function (
      this: IDBObjectStore,
      ...args: Parameters<typeof add>
    ) {
      window.__inkAudit.writes++;
      return add.apply(this, args);
    };
    Storage.prototype.setItem = function (
      this: Storage,
      ...args: Parameters<typeof set>
    ) {
      window.__inkAudit.writes++;
      return set.apply(this, args);
    };
  });
  const unexpectedRequests: string[] = [];
  board.on("request", (request) => {
    if (request.method() !== "POST") return;
    const body: Record<string, unknown> = JSON.parse(
      request.postData() ?? "{}",
    );
    if (!["ack", "snapshot", "channel", "status"].includes(String(body.action)))
      unexpectedRequests.push(request.url().split("?")[0]);
  });
  async function inkCount() {
    return canvas.evaluate(
      (el: HTMLCanvasElement) =>
        el
          .getContext("2d")!
          .getImageData(0, 0, el.width, el.height)
          .data.filter((v, i) => i % 4 === 3 && v > 0).length,
    );
  }
  async function draw() {
    await canvas.scrollIntoViewIfNeeded();
    const box = (await canvas.boundingBox())!;
    await board.mouse.move(box.x + 120, box.y + 100);
    await board.mouse.down();
    await board.mouse.move(box.x + 300, box.y + 120, { steps: 5 });
    await board.mouse.up();
    await expect.poll(inkCount).toBeGreaterThan(0);
  }
  await draw();
  expect(await board.evaluate(() => window.__inkAudit.writes)).toBe(0);
  expect(unexpectedRequests).toEqual([]);
  await controls.getByRole("button", { name: "Lanjutan", exact: true }).click();
  await expect(canvas).toHaveCount(0);
  await controls.getByRole("button", { name: "Refleksi", exact: true }).click();
  await expect(canvas).toBeVisible();
  expect(await inkCount()).toBe(0);
  await draw();
  await board.evaluate(() => {
    const channel = new BroadcastChannel("pn-teacher-access");
    channel.postMessage({ locked: true });
    channel.close();
  });
  await expect.poll(inkCount).toBe(0);
  await draw();
  await board
    .getByRole("button", { name: "Bersihkan zona tulis", exact: true })
    .click();
  expect(await inkCount()).toBe(0);
  await mkdir("artifacts/qa/M10", { recursive: true });
  // Only blank reflection is captured; strokes never enter QA artifacts.
  await board
    .getByRole("region", { name: "Refleksi kelas", exact: true })
    .screenshot({ path: "artifacts/qa/M10/reflection-blank.png" });
  expect(errors).toEqual([]);
  const revokedResponses: number[] = [];
  board.on("response", (response) => {
    if (
      response.url().endsWith("/api/v1/board/pairing") &&
      response.status() === 403
    )
      revokedResponses.push(403);
  });
  const revokeStartedAt = Date.now();
  const revokeResponse = page.waitForResponse((response) => {
    if (!response.url().endsWith("/api/v1/pairing")) return false;
    return response.request().postDataJSON()?.action === "revoke";
  });
  await controls
    .getByRole("button", { name: "Putuskan layar", exact: true })
    .click();
  expect((await revokeResponse).ok()).toBe(true);
  await expect(canvas).toHaveCount(0);
  const revokeElapsedMs = Date.now() - revokeStartedAt;
  expect(revokeElapsedMs).toBeLessThan(5000);
  await board.reload();
  await expect(canvas).toHaveCount(0);
  expect(revokedResponses.length).toBeGreaterThan(0);
  expect(
    errors.every(
      (error) =>
        error ===
        "console: Failed to load resource: the server responded with a status of 403 (Forbidden)",
    ),
  ).toBe(true);
  await writeFile(
    "artifacts/qa/M10/opening-privacy.json",
    JSON.stringify(
      {
        catalogs: ["SMP7", "SD5"],
        inkStorageWrites: 0,
        inkRequests: 0,
        clearOnMode: true,
        clearOnAccessLock: true,
        clearOnRevoke: true,
        revokeElapsedMs,
        clearOnReload: true,
        runtimeErrors: 0,
        expectedRevokedResponses: revokedResponses.length,
        hardware: "NOT_RUN",
      },
      null,
      2,
    ),
  );
  await context.close();
});
