import { openBoard } from "../browser/helpers";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { loginTeacher } from "../browser/helpers";
test("TURN01 real IndexedDB records actual start once, isolates semester/owner and rejects rewritten history", async ({
  page,
}) => {
  await loginTeacher(page);
  await page.addScriptTag({
    content: await readFile(".browser-tests/turn-fixture.js", "utf8"),
  });
  expect(await page.evaluate(() => window.__turnFixture.exercise())).toEqual({
    empty: 0,
    conflict: true,
    immutable: true,
    privacy: true,
    pilot: 1,
    duplicate: 1,
    nextSemester: 0,
    otherCount: 0,
    holdPersisted: true,
    historyFrozen: true,
  });
});
test("ROT01 teacher timer/three rounds and board projection preserve privacy", async ({
  page,
  browser,
}) => {
  // Three rounds publish and ACK multiple persistent commands, plus reload.
  test.setTimeout(90000);
  const errors: string[] = [];
  page.on("pageerror", () => errors.push("teacher-runtime"));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push("teacher-console");
  });
  await loginTeacher(page);
  await page.getByLabel("Data kelas").selectOption("demo");
  await page.getByRole("button", { name: "Buat kelas", exact: true }).click();
  await page.getByLabel("Nama rombel", { exact: true }).fill("7R");
  await page.getByRole("button", { name: "Simpan kelas", exact: true }).click();
  await page.getByRole("button", { name: /Buka kelas 7R/ }).click();
  await page
    .getByRole("button", { name: "Mulai Sesi Tepat Level", exact: true })
    .click();
  for (const n of ["07", "12", "25"]) {
    await page
      .getByRole("button", { name: `Fixture sintetis ${n}`, exact: true })
      .click();
    await page
      .getByRole("button", { name: "Simpan hasil", exact: true })
      .click();
    await expect(page.getByLabel("Review kartu")).toHaveCount(0);
  }
  const boardContext = await browser.newContext({
    baseURL: "http://127.0.0.1:3100",
    viewport: { width: 1920, height: 1080 },
  });
  const board = await boardContext.newPage();
  board.on("pageerror", () => errors.push("board-runtime"));
  board.on("console", (m) => {
    if (m.type() === "error") errors.push("board-console");
  });
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
  const control = page.getByRole("region", {
    name: "Kendali Stasiun",
    exact: true,
  });
  const commandStarted = Date.now();
  await control
    .getByRole("button", { name: "Mulai rotasi", exact: true })
    .click();
  const rotation = board.getByRole("region", {
    name: "Rotasi kelas",
    exact: true,
  });
  await expect(rotation).toContainText("Putaran 1/3");
  await control
    .getByRole("button", { name: "Pratinjau tahan kelompok", exact: true })
    .click();
  await expect(control).toContainText("Tidak ada jadwal sisa yang aman");
  await expect(rotation).toContainText("Putaran 1/3");
  const commandLatencyMs = Date.now() - commandStarted;
  const turns = control.getByRole("region", {
    name: "Giliran Papan",
    exact: true,
  });
  await turns
    .getByText("Kehadiran dan Navigator dulu", { exact: true })
    .click();
  await turns.getByLabel("Hadir absen 21", { exact: true }).uncheck();
  await turns.getByLabel("Navigator dulu absen 22", { exact: true }).check();
  await expect(
    turns.getByLabel("Navigator dulu absen 22", { exact: true }),
  ).toBeEnabled();
  await turns
    .getByRole("button", { name: "Pratinjau peran berikutnya", exact: true })
    .click();
  await expect(turns).toContainText("0/3 tugas dimulai");
  await expect(turns.getByTestId("role-preview")).not.toContainText(
    /Pilot: (21|22)/,
  );
  await turns
    .getByRole("button", { name: "Pratinjau peran berikutnya", exact: true })
    .click();
  await expect(turns).toContainText("0/3 tugas dimulai");
  await turns
    .getByRole("button", { name: "Mulai tugas papan", exact: true })
    .click();
  await expect(turns).toContainText("1/3 tugas dimulai");
  await expect(board.getByTestId("board-roles")).toContainText("Pilot:");
  await expect(control.getByLabel("Waktu putaran")).toHaveText(/1[45]:\d{2}/);
  await expect(control.getByLabel("Bisik kelompok Guru")).toContainText("D1.2");
  await control
    .getByRole("button", { name: "Tambah 3 menit", exact: true })
    .click();
  await expect(control).toContainText("Tambahan: 3 menit");
  await expect(rotation.getByLabel("Waktu putaran")).toHaveText(/1[78]:\d{2}/);
  for (let n = 1; n <= 3; n++) {
    await expect(rotation).toContainText(`Putaran ${n}/3`);
    await control
      .getByRole("button", { name: "Akhiri putaran", exact: true })
      .click();
    await expect(rotation).toContainText("Jeda pindah");
    if (n < 3)
      await control
        .getByRole("button", { name: "Mulai putaran berikutnya", exact: true })
        .click();
  }
  await mkdir("artifacts/qa/M08", { recursive: true });
  await writeFile(
    "artifacts/qa/M08/command-latency.json",
    JSON.stringify(
      {
        environment: "LOCAL_DESKTOP_LOOPBACK_POLLING",
        sampleCount: 1,
        commandLatencyMs,
        physicalDevice: "NOT_RUN",
      },
      null,
      2,
    ),
  );
  await rotation.screenshot({ path: "artifacts/qa/M08/rotation-board.png" });
  expect(await rotation.textContent()).not.toMatch(
    /D1|D2|D3|mastery|tingkat siswa/,
  );
  await control
    .getByRole("button", { name: "Selesaikan rotasi", exact: true })
    .click();
  await expect(rotation).toContainText("Rotasi selesai");
  await page.reload();
  await page.getByLabel("Data kelas").selectOption("demo");
  await expect(control).toContainText("Rotasi selesai");
  expect(errors).toEqual([]);
  await boardContext.close();
});
