import { openBoard } from "../browser/helpers";
import { test, expect, type Locator, type Page } from "@playwright/test";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { loginTeacher, chooseTeacherMode } from "../browser/helpers";
import type { CardAnswer, CardKind } from "../../src/cards/layouts/layout-v1";
const commands: {
  action: string;
  base?: number;
  mode?: string;
  question?: number;
  status: number;
  revision?: number;
}[] = [];
const errors: string[] = [];
test.afterEach(async () => {
  await writeFile(
    "artifacts/qa/M10/freshclass-commands.json",
    JSON.stringify({ commands, errors }, null, 2),
  );
});
async function photo(
  page: Page,
  surface: Locator,
  kind: CardKind,
  attendance: number,
  answers: CardAnswer[],
) {
  const png = await page.evaluate((input) => window.__cardPhoto.png(input), {
    kind,
    attendance,
    answers,
    scale: 5,
    skew: 6,
  });
  await surface.getByLabel("Pilih foto lokal", { exact: true }).setInputFiles({
    name: "synthetic-card.png",
    mimeType: "image/png",
    buffer: Buffer.from(png, "base64"),
  });
}
test("E2E02 fresh 32-student class uses UI/photo inputs through check, rotations, late exit, finalization and next session", async ({
  page,
  browser,
}) => {
  test.setTimeout(240000);
  page.on("response", async (response) => {
    if (response.request().method() !== "POST") {
      if (response.status() >= 400)
        commands.push({
          action: new URL(response.url()).pathname,
          status: response.status(),
        });
      return;
    }
    const request = response.request().postDataJSON();
    if (request?.action !== "publish" && response.status() < 400) return;
    const body = await response.json().catch(() => ({}));
    commands.push({
      action: request.action ?? new URL(response.url()).pathname,
      base: request.baseRevision,
      mode: request.payload?.mode,
      question: request.payload?.question,
      status: response.status(),
      revision: body.envelope?.revision,
    });
  });
  page.on("pageerror", () => errors.push("teacher-runtime"));
  page.on("console", (m) => {
    if (m.type() === "error")
      errors.push(
        `teacher-console:${m.text().slice(0, 140)}:${m.location().url ? new URL(m.location().url).pathname : ""}`,
      );
  });
  await loginTeacher(page);
  await chooseTeacherMode(page, "demo");
  await page.getByRole("button", { name: "Buat kelas", exact: true }).click();
  await page.getByLabel("Nama rombel", { exact: true }).fill("7N");
  await page.getByRole("button", { name: "Simpan kelas", exact: true }).click();
  await page.getByRole("button", { name: /Buka kelas 7N/ }).click();
  const pkg = page.getByRole("region", { name: "Paket Sesi", exact: true }),
    cycle = page.getByRole("region", { name: "Siklus kelas", exact: true });
  await pkg.getByRole("button", { name: "Siapkan soal", exact: true }).click();
  await expect(pkg).toContainText("Latihan tersimpan di perangkat ini");
  await cycle
    .getByRole("button", { name: "Mulai sesi dengan soal ini", exact: true })
    .click();
  await expect(cycle.getByTestId("cycle-status")).toContainText("Sesi 1");
  await expect(cycle.getByTestId("cycle-scan-count")).toContainText("0/32");
  await cycle.getByText("Kehadiran sesi", { exact: true }).click();
  await cycle.getByLabel("Tidak hadir absen 32", { exact: true }).check();
  await expect(
    cycle.getByLabel("Tidak hadir absen 32", { exact: true }),
  ).toBeEnabled();
  const boardContext = await browser.newContext({
      baseURL: "http://127.0.0.1:3100",
      viewport: { width: 1920, height: 1080 },
    }),
    board = await boardContext.newPage();
  board.on("pageerror", () => errors.push("board-runtime"));
  board.on("response", (response) => {
    if (response.status() >= 400)
      commands.push({
        action: `board:${new URL(response.url()).pathname}`,
        status: response.status(),
      });
  });
  board.on("console", (m) => {
    if (m.type() === "error")
      errors.push(`board-console:${m.text().slice(0, 140)}`);
  });
  await openBoard(board);
  const code = await board.getByTestId("pairing-code").textContent();
  await cycle
    .getByLabel("Kode pasangan", { exact: true })
    .fill(code!.replace(/\s/g, ""));
  await cycle
    .getByRole("button", { name: "Hubungkan papan", exact: true })
    .click();
  await expect(cycle.getByTestId("pairing-status")).toContainText(
    "Layar tersambung",
  );
  await cycle.getByRole("button", { name: "Cek Level", exact: true }).click();
  for (const n of [1, 10]) {
    await cycle.getByRole("button", { name: `Soal ${n}`, exact: true }).click();
    await expect(
      board.getByRole("region", { name: "Soal cek paket", exact: true }),
    ).toContainText(`Soal ${n}/10`);
  }
  await page.addScriptTag({
    content: await readFile(".browser-tests/card-photo.js", "utf8"),
  });
  const keys: CardAnswer[] = [];
  for (let row = 1; row <= 10; row++)
    keys.push(
      (await cycle
        .getByTestId(`teacher-check-${row}`)
        .getAttribute("data-answer")) as CardAnswer,
    );
  const checks = cycle.getByRole("region", {
    name: "Hasil cek sesi",
    exact: true,
  });
  for (let n = 1; n <= 31; n++) {
    const answers = [...keys];
    answers[n === 1 ? 0 : n <= 7 ? 3 : n <= 20 ? 5 : 7] = "?";
    await photo(page, checks, "initial", n, answers);
    await checks
      .getByRole("button", { name: "Simpan hasil cek", exact: true })
      .click();
    await expect(checks.getByTestId("cycle-scan-count")).toContainText(
      `${n}/32`,
    );
  }
  await expect(
    cycle.getByRole("region", {
      name: "Penempatan dan kelompok sesi",
      exact: true,
    }),
  ).toContainText("di bawah jangkauan cek");
  await cycle
    .getByRole("button", {
      name: "Gunakan pembagian kelompok ini",
      exact: true,
    })
    .click();
  await expect(
    cycle.getByLabel("Tidak hadir absen 32", { exact: true }),
  ).toBeDisabled();
  await cycle
    .getByRole("button", { name: "Panel Terbagi", exact: true })
    .click();
  const split = board.getByRole("region", {
    name: "Panel Terbagi",
    exact: true,
  });
  await expect(split).toContainText("3 kelompok");
  await split
    .getByRole("button", { name: "Panel berikutnya", exact: true })
    .click();
  await expect(split).toContainText("Halaman 2/2");
  const spotlightSelection = cycle.getByLabel("Kelompok yang disorot", {
    exact: true,
  });
  const selectedGroup = await spotlightSelection
    .locator("option")
    .last()
    .getAttribute("value");
  const selectedLabel = await spotlightSelection
    .locator("option")
    .last()
    .innerText();
  await spotlightSelection.selectOption(selectedGroup!);
  await cycle.getByRole("button", { name: "Sorot", exact: true }).click();
  await expect(
    board.getByRole("region", { name: "Sorot", exact: true }),
  ).toBeVisible();
  await expect(
    board.getByRole("region", { name: "Sorot", exact: true }),
  ).toContainText(selectedLabel);
  await cycle
    .getByRole("button", { name: "Kembali dari Sorot", exact: true })
    .click();
  await expect(split).toContainText("Halaman 2/2");
  await cycle.getByRole("button", { name: "Kelompok", exact: true }).click();
  await expect(
    board.getByRole("heading", { name: "Temukan kelompokmu", exact: true }),
  ).toBeVisible();
  await expect(board.getByTestId("public-group").first()).toContainText(
    "Stasiun pertama: Guru",
  );
  await expect(board.locator("body")).not.toContainText(
    /\b32\b|C3|D1|D3|B4|mastery|answerKey/,
  );
  const stations = cycle.getByRole("region", {
    name: "Kendali Stasiun",
    exact: true,
  });
  await stations
    .getByRole("button", { name: "Mulai rotasi", exact: true })
    .click();
  for (let round = 1; round <= 3; round++) {
    const activity = board.getByRole("region", {
      name: "Aktivitas paket",
      exact: true,
    });
    await expect(activity).toContainText(`Putaran ${round}/3`);
    if (round === 1) {
      // First board group is the highest displayed placement: ratio from this package.
      await board.getByLabel("Pengali rasio", { exact: true }).fill("2");
      await board
        .getByRole("button", { name: "Tambah kolom × pengali", exact: true })
        .click();
      await expect(
        board.getByLabel("Nilai A kolom 2", { exact: true }),
      ).toBeVisible();
    }
    if (round === 2) {
      let release = () => {};
      let observed = () => {};
      let forwarded = () => {};
      const held = new Promise<void>((resolve) => {
        release = resolve;
      });
      const requested = new Promise<void>((resolve) => {
        observed = resolve;
      });
      const sent = new Promise<void>((resolve) => {
        forwarded = resolve;
      });
      await page.route("**/api/v1/pairing", async (route) => {
        if (route.request().postDataJSON()?.action === "publish") {
          observed();
          await held;
          try {
            await route.continue();
          } finally {
            forwarded();
          }
          return;
        }
        await route.continue();
      });
      try {
        await stations
          .getByRole("button", { name: "Tambah 3 menit", exact: true })
          .click();
        await requested;
        await expect(
          stations.getByRole("button", {
            name: "Pratinjau peran berikutnya",
            exact: true,
          }),
        ).toBeDisabled();
      } finally {
        release();
        await sent;
        await page.unroute("**/api/v1/pairing");
      }
    } else {
      await stations
        .getByRole("button", { name: "Tambah 3 menit", exact: true })
        .click();
    }
    await expect(activity).toContainText(`Putaran ${round}/3`);
    if (round === 1)
      await expect(
        board.getByLabel("Nilai A kolom 2", { exact: true }),
      ).toBeVisible();
    for (let task = 1; task <= 3; task++) {
      await stations
        .getByRole("button", {
          name: "Pratinjau peran berikutnya",
          exact: true,
        })
        .click();
      await stations
        .getByRole("button", { name: "Mulai tugas papan", exact: true })
        .click();
      await expect(activity).toContainText(`Tugas ${task}/3`);
    }
    if (round === 1) {
      await mkdir("artifacts/qa/M10", { recursive: true });
      await activity.screenshot({ path: "artifacts/qa/M10/fresh-station.png" });
    }
    await stations
      .getByRole("button", { name: "Akhiri putaran", exact: true })
      .click();
    await stations
      .getByRole("button", {
        name: round === 3 ? "Selesaikan rotasi" : "Mulai putaran berikutnya",
        exact: true,
      })
      .click();
  }
  const exit = cycle.getByRole("region", {
    name: "Hasil Kartu Keluar",
    exact: true,
  });
  await exit
    .getByRole("button", {
      name: "Bekukan Kartu Keluar dari paket",
      exact: true,
    })
    .click();
  for (const row of [1, 2, 3]) {
    await exit
      .getByRole("button", {
        name: `Tampilkan baris keluar ${row}`,
        exact: true,
      })
      .click();
    await expect(
      board.getByRole("heading", {
        name: `Kartu Keluar · Baris ${row}/3`,
        exact: true,
      }),
    ).toBeVisible();
  }
  for (let n = 1; n <= 30; n++) {
    await photo(page, exit, "exit", n, ["?", "?", "?"]);
    await exit
      .getByRole("button", { name: "Simpan hasil keluar", exact: true })
      .click();
    await expect(exit.getByTestId("exit-count")).toContainText(`${n}/31`);
  }
  await cycle.getByRole("button", { name: "Refleksi", exact: true }).click();
  await expect(
    board.getByText("Hari ini aku belajar …", { exact: true }),
  ).toBeVisible();
  await cycle.getByRole("button", { name: "Tutup kelas", exact: true }).click();
  await expect(cycle.getByTestId("cycle-status")).toContainText(
    "kelas ditutup · penilaian belum disimpan",
  );
  await photo(page, exit, "exit", 31, ["?", "?", "?"]);
  await exit
    .getByRole("button", { name: "Simpan hasil keluar", exact: true })
    .click();
  await expect(exit.getByTestId("exit-count")).toContainText("31/31");
  await cycle
    .getByRole("button", { name: "Simpan penilaian sesi", exact: true })
    .click();
  await expect(cycle.getByTestId("cycle-status")).toContainText(
    "penilaian tersimpan",
  );
  await expect(cycle).toContainText("0 hasil belum lengkap");
  await page.reload();
  await chooseTeacherMode(page, "demo");
  await page.getByRole("button", { name: /Buka kelas 7N/ }).click();
  await expect(cycle.getByTestId("cycle-status")).toContainText(
    "penilaian tersimpan",
  );
  await expect(cycle.getByTestId("cycle-scan-count")).toContainText("31/32");
  await pkg.getByLabel("Jenis paket", { exact: true }).selectOption("weekly");
  await pkg
    .getByRole("button", { name: "Buat latihan baru", exact: true })
    .click();
  await expect(pkg).toContainText("Soal cek pemahaman (5)");
  await cycle
    .getByRole("button", {
      name: "Mulai sesi berikutnya",
      exact: true,
    })
    .click();
  await expect(cycle.getByTestId("cycle-status")).toContainText("Sesi 2");
  await expect(cycle.getByTestId("cycle-scan-count")).toContainText("0/32");
  await writeFile(
    "artifacts/qa/M10/freshclass-commands.json",
    JSON.stringify(commands, null, 2),
  );
  expect(errors).toEqual([]);
  await writeFile(
    "artifacts/qa/M10/freshclass-browser.json",
    JSON.stringify(
      {
        input: "UI + SYNTHETIC photo file",
        initialPresent: 31,
        absent: 1,
        preloadResponses: 0,
        initialRows: 10,
        rotations: 3,
        tasks: 9,
        exits: 31,
        lateExitAfterClosure: 1,
        logicalSessions: 2,
        runtimeErrors: 0,
        physical: "NOT_RUN",
      },
      null,
      2,
    ),
  );
  await boardContext.close();
});
