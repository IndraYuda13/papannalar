import { openTeacherExample } from "../browser/helpers";
import { openBoard } from "../browser/helpers";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";
import { loginTeacher, chooseTeacherMode } from "../browser/helpers";
import { snapshotSchema } from "../../src/contracts/presentation";

async function start7b(page: Page) {
  await loginTeacher(page);
  await chooseTeacherMode(page, "demo");
  await page.getByRole("button", { name: "Buat kelas", exact: true }).click();
  await page.getByLabel("Nama kelas", { exact: true }).fill("7B");
  await page.getByRole("button", { name: "Simpan kelas", exact: true }).click();
  await page.getByRole("button", { name: /Buka kelas 7B/ }).click();
  await openTeacherExample(page);
  await page
    .getByRole("button", { name: "Jalankan contoh sesi", exact: true })
    .click();
  await expect(page.getByTestId("scan-count")).toContainText("29/32");
}
async function scanThree(page: Page) {
  for (const n of ["07", "12", "25"]) {
    await page
      .getByRole("button", { name: `Fixture sintetis ${n}`, exact: true })
      .click();
    await page
      .getByRole("button", { name: "Simpan hasil", exact: true })
      .click();
    await expect(page.getByLabel("Review kartu")).toHaveCount(0);
  }
}
test("M05-a reset reproduces canonical inputs/groups, excluding three cards until actual pixel scan", async ({
  page,
}) => {
  await start7b(page);
  await page.addScriptTag({
    content: await readFile(".browser-tests/assessment-fixture.js", "utf8"),
  });
  const before = await page.evaluate(() =>
    window.__assessmentFixture.inspect(),
  );
  expect(before.received).toBe(29);
  expect(before.reserved.every((s) => !s.received)).toBe(true);
  expect(before.counts).toEqual({ events: 29, outbox: 29 });
  expect(before.distractorCount).toBe(5);
  await scanThree(page);
  const first = await page.evaluate(() => window.__assessmentFixture.inspect());
  expect(first.received).toBe(32);
  expect(first.observations).toBe(160);
  expect(first.groups.map((g) => g.attendance.length)).toEqual([7, 13, 12]);
  expect(first.distractorCount).toBe(5);
  await page
    .getByRole("button", { name: "Reset sesi demo lokal", exact: true })
    .click();
  await openTeacherExample(page);
  await page
    .getByRole("button", { name: "Jalankan contoh sesi", exact: true })
    .click();
  await expect(page.getByTestId("scan-count")).toContainText("29/32");
  const reset = await page.evaluate(() => window.__assessmentFixture.inspect());
  expect(reset.sessionId).not.toBe(first.sessionId);
  expect(reset.reserved.every((s) => !s.received)).toBe(true);
  expect(reset.counts).toEqual({ events: 29, outbox: 29 });
  await scanThree(page);
  const second = await page.evaluate(() =>
    window.__assessmentFixture.inspect(),
  );
  expect(second.groups).toEqual(first.groups);
  expect(second.observations).toBe(160);
  expect(second.counts).toEqual({ events: 32, outbox: 32 });
  await mkdir("artifacts/qa/M05", { recursive: true });
  await writeFile(
    "artifacts/qa/M05/reset-results.json",
    JSON.stringify(
      {
        mode: "synthetic pixels",
        before: 29,
        reserved: [7, 12, 25],
        after: 32,
        groups: second.groups,
        distractorCount: second.distractorCount,
        observations: second.observations,
        resetReproduced: true,
      },
      null,
      2,
    ),
  );
});

test("M05-b recorded PRELIM regression: opening, check, scan, groups, station, actual exit and reflection", async ({
  page,
  browser,
}) => {
  test.setTimeout(60000);
  const errors: string[] = [],
    consoleErrors: string[] = [],
    bodies: string[] = [],
    publicStates: unknown[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") consoleErrors.push(m.text());
  });
  page.on("request", (r) => {
    if (r.method() !== "GET") bodies.push(r.postData() ?? "");
  });
  await start7b(page);
  await page.getByRole("button", { name: "Siapkan soal", exact: true }).click();
  await expect(
    page.getByRole("region", { name: "Paket Sesi", exact: true }),
  ).toContainText("Latihan tersimpan di perangkat ini");
  const bc = await browser.newContext({
    baseURL: "http://127.0.0.1:3100",
    viewport: { width: 1920, height: 1080 },
    recordVideo: {
      dir: "artifacts/qa/M05/video",
      size: { width: 1920, height: 1080 },
    },
  });
  // Prevent ephemeral pairing credentials entering the recorded artifact.
  await bc.addInitScript(() => {
    const install = () => {
      if (
        document.documentElement &&
        !document.getElementById("qa-code-mask")
      ) {
        const style = document.createElement("style");
        style.id = "qa-code-mask";
        style.textContent =
          '[data-testid="pairing-code"]{color:transparent!important;position:relative}[data-testid="pairing-code"]::after{content:"Kode pasangan disembunyikan";position:absolute;inset:0;color:#14212B;font-size:32px;letter-spacing:0;display:flex;align-items:center;justify-content:center}';
        document.documentElement.append(style);
      }
    };
    new MutationObserver(install).observe(document, {
      childList: true,
      subtree: true,
    });
    install();
  });
  const board = await bc.newPage();
  board.on("pageerror", (e) => errors.push(e.message));
  board.on("console", (m) => {
    if (m.type() === "error") consoleErrors.push(m.text());
  });
  board.on("response", async (r) => {
    if (r.url().endsWith("/board/pairing") && r.ok()) {
      try {
        const data: unknown = await r.json();
        const parsed = snapshotSchema.safeParse(data);
        if (parsed.success) publicStates.push(parsed.data.envelope.payload);
      } catch {}
    }
  });
  await openBoard(board);
  await expect(board.getByTestId("pairing-code")).toHaveText(/^\d{3} \d{3}$/);
  const pairingStart = Date.now();
  await page
    .getByLabel("Kode pasangan", { exact: true })
    .fill(
      (await board.getByTestId("pairing-code").textContent())!.replace(
        /\s/g,
        "",
      ),
    );
  await page
    .getByRole("button", { name: "Hubungkan papan", exact: true })
    .click();
  await expect(page.getByTestId("pairing-status")).toContainText(
    "Layar tersambung",
  );
  const pairingMs = Date.now() - pairingStart;
  await board.getByLabel("Besar lompatan").fill("7");
  await board.getByRole("button", { name: "Lompat", exact: true }).click();
  await board.getByRole("button", { name: "Jalankan", exact: true }).click();
  await expect(board.getByTestId("number-position")).toContainText(
    "perpindahan 7 lantai",
  );
  await board.screenshot({ path: "artifacts/qa/M05/opening.png" });
  const controls = page.getByLabel("Kontrol Layar Kelas");
  await controls
    .getByRole("button", { name: "Cek Level", exact: true })
    .click();
  await controls.getByRole("button", { name: "Soal 3", exact: true }).click();
  await expect(
    board.getByRole("heading", { name: "−3 − 5 = …", exact: true }),
  ).toBeVisible();
  await board.screenshot({ path: "artifacts/qa/M05/check.png" });
  await controls.getByRole("button", { name: "Lanjutan", exact: true }).click();
  await expect(
    board.getByRole("heading", { name: "Ayo lanjutkan", exact: true }),
  ).toBeVisible();
  const scanStart = Date.now();
  await scanThree(page);
  const threeSyntheticMs = Date.now() - scanStart;
  await controls.getByRole("button", { name: "Kelompok", exact: true }).click();
  await expect(board.getByTestId("public-group")).toHaveCount(3);
  await board.screenshot({ path: "artifacts/qa/M05/groups.png" });
  await controls.getByRole("button", { name: "Stasiun", exact: true }).click();
  await expect(
    board.getByRole("heading", { name: "Segitiga Biru · −3 − 5", exact: true }),
  ).toBeVisible();
  await board.getByLabel("Besar lompatan").fill("-5");
  await board.getByRole("button", { name: "Lompat", exact: true }).click();
  await board.getByRole("button", { name: "Jalankan", exact: true }).click();
  await expect(board.getByTestId("number-position")).toHaveText("Posisi −8");
  await expect(
    board.getByText("Model sudah sesuai. Ceritakan arah lompatanmu."),
  ).toBeVisible();
  await board.screenshot({ path: "artifacts/qa/M05/station.png" });
  await controls
    .getByRole("button", { name: "Kartu cek akhir", exact: true })
    .click();
  await expect(
    board.getByRole("heading", { name: "Kartu cek akhir", exact: true }),
  ).toBeVisible();
  await expect(
    board.getByText(/Buka paket Kartu cek akhir dari HP guru/),
  ).toBeVisible();
  const exit = page.getByRole("region", {
    name: "Hasil Kartu cek akhir",
    exact: true,
  });
  await exit
    .getByRole("button", {
      name: "Siapkan pertanyaan penutup",
      exact: true,
    })
    .click();
  await expect(exit).toContainText("Kelompok dan soal keluar dikunci");
  await exit
    .getByRole("button", { name: "Tampilkan baris keluar 2", exact: true })
    .click();
  await expect(
    board.getByRole("heading", {
      name: "Kartu cek akhir · Baris 2/3",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    board
      .getByRole("region", { name: "Kartu cek akhir kelompok", exact: true })
      .locator("section"),
  ).toHaveCount(3);
  await controls.getByRole("button", { name: "Refleksi", exact: true }).click();
  await expect(
    board.getByRole("heading", { name: "Refleksi", exact: true }),
  ).toBeVisible();
  expect(publicStates.length).toBeGreaterThan(4);
  for (const state of publicStates) {
    const json = JSON.stringify(state);
    expect(json).not.toMatch(
      /"(?:name|nickname|level|stepId|mastery|score|answerKey|studentId)"/,
    );
  }
  expect(bodies.join("\n")).not.toMatch(
    /data:image|"(?:name|nickname|displayName)"/,
  );
  expect(errors).toEqual([]);
  expect(consoleErrors).toEqual([]);
  const video = board.video()!;
  await bc.close();
  await video.saveAs("artifacts/qa/M05/prelim-7b-synthetic.webm");
  await writeFile(
    "artifacts/qa/M05/rehearsal-results.json",
    JSON.stringify(
      {
        input: "29 seeded + 3 synthetic pixel cards",
        pairingMs,
        threeSyntheticMs,
        sampleCount: 1,
        environment:
          "local HTTP recovery adapter + PostgreSQL; desktop Chromium",
        uncaughtErrors: errors.length,
        consoleErrors: consoleErrors.length,
        publicSnapshotsChecked: publicStates.length,
        physicalPhotos: 0,
        liveSupabase: "NOT_RUN",
      },
      null,
      2,
    ),
  );
});
