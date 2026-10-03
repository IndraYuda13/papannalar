import { openTeacherExample } from "../browser/helpers";
import { openBoard, chooseTeacherMode } from "../browser/helpers";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import {
  injectFixture,
  loginTeacher,
  waitForShellCache,
} from "../browser/helpers";

test.use({ actionTimeout: 15000 });

// Source §4 of 07_BUILD_QA_PITCH, accelerated software rehearsal only.
// Camera cards/touch/judge/six-minute stage timing still require physical rehearsal.
for (const run of [1, 2, 3]) {
  test(`M17 software rehearsal ${run}: three rotations, source tools, exit, reflection and offline scan`, async ({
    page,
    browser,
  }) => {
    test.setTimeout(120000);
    const started = Date.now();
    const output = `artifacts/qa/M17/run-${run}`;
    await mkdir(output, { recursive: true });
    const errors: string[] = [];
    const expectedOfflineErrors: string[] = [];
    let offline = false;
    const context = await browser.newContext({
      baseURL: "http://127.0.0.1:3100",
      viewport: { width: 1920, height: 1080 },
      recordVideo: {
        dir: `${output}/video`,
        size: { width: 1920, height: 1080 },
      },
    });
    await context.addInitScript(() => {
      const install = () => {
        if (document.documentElement && !document.getElementById("qa-mask")) {
          const style = document.createElement("style");
          style.id = "qa-mask";
          style.textContent =
            '[data-testid="pairing-code"]{color:transparent!important;position:relative}[data-testid="pairing-code"]::after{content:"Kode disembunyikan";position:absolute;inset:0;color:#14212B;font-size:32px;letter-spacing:0}body::after{content:"REKAMAN UJI LOKAL · kartu sintetis";position:fixed;bottom:0;right:0;background:#14212B;color:white;padding:8px;font:20px sans-serif;z-index:99999;pointer-events:none}';
          document.documentElement.append(style);
        }
      };
      new MutationObserver(install).observe(document, {
        childList: true,
        subtree: true,
      });
      install();
    });
    const board = await context.newPage();
    for (const [label, surface] of [
      ["teacher", page],
      ["board", board],
    ] as const) {
      surface.on("pageerror", () => errors.push(`${label}:runtime`));
      surface.on("console", (m) => {
        if (m.type() !== "error") return;
        if (
          offline &&
          /ERR_INTERNET_DISCONNECTED|Failed to fetch/.test(m.text())
        )
          expectedOfflineErrors.push(`${label}:network-offline`);
        else errors.push(`${label}:console`);
      });
    }
    await loginTeacher(page);
    await chooseTeacherMode(page, "demo");
    await page.getByRole("button", { name: "Buat kelas", exact: true }).click();
    await page.getByLabel("Nama rombel", { exact: true }).fill("7B");
    await page
      .getByRole("button", { name: "Simpan kelas", exact: true })
      .click();
    await page.getByRole("button", { name: /Buka kelas 7B/ }).click();
    await openTeacherExample(page);
    await page
      .getByRole("button", { name: "Jalankan contoh sesi", exact: true })
      .click();
    await expect(page.getByTestId("scan-count")).toContainText("29/32");
    await openBoard(board);
    await expect(board.getByTestId("pairing-code")).toHaveText(/^\d{3} \d{3}$/);
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
    await board.getByLabel("Besar lompatan").fill("7");
    await board.getByRole("button", { name: "Lompat", exact: true }).click();
    await board.getByRole("button", { name: "Jalankan", exact: true }).click();
    await expect(board.getByTestId("number-position")).toContainText(
      "perpindahan 7 lantai",
    );
    const controls = page.getByLabel("Kontrol Layar Kelas");
    await controls
      .getByRole("button", { name: "Cek Level", exact: true })
      .click();
    await controls.getByRole("button", { name: "Soal 3", exact: true }).click();
    await expect(
      board.getByRole("heading", { name: "−3 − 5 = …", exact: true }),
    ).toBeVisible();
    await controls
      .getByRole("button", { name: "Lanjutan", exact: true })
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
    await expect(page.getByTestId("scan-count")).toContainText("32/32");
    await controls
      .getByRole("button", { name: "Kelompok", exact: true })
      .click();
    await expect(board.getByTestId("public-group")).toHaveCount(3);
    await expect(page.getByLabel("Kelompok guru")).toContainText(
      "Segitiga Biru · D1 · 7 siswa",
    );
    const station = page.getByRole("region", {
      name: "Kendali Stasiun",
      exact: true,
    });
    await station
      .getByRole("button", { name: "Mulai rotasi", exact: true })
      .click();
    await expect(station.getByLabel("Bisik kelompok Guru")).toContainText(
      "D1.2",
    );
    await page.getByText("Pratinjau Alat Nalar", { exact: true }).click();
    const open = async (tool: string, title: string, pattern: string) => {
      await page
        .getByLabel("Pilih Alat Nalar", { exact: true })
        .selectOption(tool);
      await page
        .getByLabel("Pola interaksi", { exact: true })
        .selectOption(pattern);
      await page
        .getByRole("button", { name: `Buka latihan ${title}`, exact: true })
        .click();
    };
    await open("ratio", "Tabel Rasio", "build");
    await expect(
      board.getByRole("region", { name: "Tabel Rasio", exact: true }),
    ).toBeVisible();
    await board
      .getByRole("button", { name: "Tambah kolom × pengali", exact: true })
      .click();
    await board.getByLabel("Nilai B kolom 2", { exact: true }).fill("9");
    await board.getByLabel("Nilai B kolom 2", { exact: true }).blur();
    await board.getByRole("button", { name: "Jalankan", exact: true }).click();
    await expect(
      board.getByRole("region", { name: "Tabel Rasio", exact: true }),
    ).toContainText("Model sudah sesuai");
    for (const round of [2, 3]) {
      await station
        .getByRole("button", { name: "Akhiri putaran", exact: true })
        .click();
      await station
        .getByRole("button", { name: "Mulai putaran berikutnya", exact: true })
        .click();
      await expect(station).toContainText(`Putaran ${round}/3`);
      const turns = station.getByRole("region", {
        name: "Giliran Papan",
        exact: true,
      });
      await turns
        .getByRole("button", {
          name: "Pratinjau peran berikutnya",
          exact: true,
        })
        .click();
      await turns
        .getByRole("button", { name: "Mulai tugas papan", exact: true })
        .click();
      await expect(turns).toContainText("1/3 tugas dimulai");
      await expect(board.getByTestId("board-roles")).toContainText("Pilot:");
      if (round === 2) {
        await open("number-line", "Garis Bilangan", "predict");
        await board.getByLabel("Nilai tebakan", { exact: true }).fill("-8");
        await board
          .getByRole("button", {
            name: "Simpan tebakan dan coba model",
            exact: true,
          })
          .click();
        await board.getByLabel("Besar lompatan", { exact: true }).fill("-5");
        await board
          .getByRole("button", { name: "Lompat", exact: true })
          .click();
        await board
          .getByRole("button", { name: "Jalankan", exact: true })
          .click();
        await expect(board.getByTestId("prediction-comparison")).toContainText(
          "Tebakan -8 · Hasil model -8",
        );
      } else {
        await open("fractions", "Batang Pecahan", "find-error");
        await board
          .getByRole("button", {
            name: "2 · Susun model seperti Nala",
            exact: true,
          })
          .click();
        await board
          .getByRole("button", { name: "Jalankan", exact: true })
          .click();
        await expect(
          board.getByRole("region", { name: "Batang Pecahan", exact: true }),
        ).toContainText("Bandingkan bagian berwarna");
        await board
          .getByRole("button", { name: "Mulai ulang", exact: true })
          .click();
        await board.getByLabel("Batang 1 bagian 1", { exact: true }).click();
        await board.getByLabel("Batang 2 bagian 1", { exact: true }).click();
        await board
          .getByRole("button", { name: "Samakan penyebut", exact: true })
          .click();
        for (const cell of [1, 2, 3, 4, 5])
          await board
            .getByLabel(`Batang 3 bagian ${cell}`, { exact: true })
            .click();
        await board
          .getByRole("button", { name: "Jalankan", exact: true })
          .click();
        await expect(
          board.getByRole("region", { name: "Batang Pecahan", exact: true }),
        ).toContainText("Model sudah sesuai");
      }
      await board.screenshot({ path: `${output}/round-${round}.png` });
    }
    await page
      .getByRole("button", { name: "Siapkan soal", exact: true })
      .click();
    await expect(
      page.getByRole("region", { name: "Paket Sesi", exact: true }),
    ).toContainText("Latihan tersimpan di perangkat ini");
    const exit = page.getByRole("region", {
      name: "Hasil Kartu Keluar",
      exact: true,
    });
    await exit
      .getByRole("button", {
        name: "Bekukan Kartu Keluar dari paket",
        exact: true,
      })
      .click();
    await exit
      .getByRole("button", { name: "Tampilkan baris keluar 2", exact: true })
      .click();
    await expect(
      board.getByRole("heading", {
        name: "Kartu Keluar · Baris 2/3",
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      board
        .getByRole("region", { name: "Kartu Keluar kelompok", exact: true })
        .locator("section"),
    ).toHaveCount(3);
    await exit
      .getByRole("button", { name: "Input manual", exact: true })
      .click();
    await exit
      .getByLabel("Absen keluar", { exact: true })
      .selectOption({ label: "1" });
    for (const row of [1, 2, 3])
      await exit
        .getByLabel(`Keluar baris ${row}`, { exact: true })
        .selectOption("?");
    await exit
      .getByRole("button", { name: "Simpan hasil keluar", exact: true })
      .click();
    await expect(exit.getByTestId("exit-count")).toHaveText(
      "1/32 hasil keluar tersimpan",
    );
    await expect(
      exit.getByLabel("Ringkasan benar dan paham", { exact: true }),
    ).toContainText("0/1 pasangan dinilai");
    await controls
      .getByRole("button", { name: "Refleksi", exact: true })
      .click();
    await expect(
      board.getByRole("heading", { name: "Refleksi", exact: true }),
    ).toBeVisible();
    await board.screenshot({ path: `${output}/reflection.png` });
    await injectFixture(page);
    await waitForShellCache(page);
    await page.addScriptTag({
      content: await readFile(".browser-tests/assessment-fixture.js", "utf8"),
    });
    const before = await page.evaluate(() =>
      window.__assessmentFixture.inspect(),
    );
    offline = true;
    await page.context().setOffline(true);
    await page
      .getByRole("button", { name: "Fixture sintetis 07", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Simpan hasil", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Ganti", exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Lewati", exact: true }).click();
    const after = await page.evaluate(() =>
      window.__assessmentFixture.inspect(),
    );
    expect(after.observations).toBe(before.observations);
    expect(after.counts).toEqual(before.counts);
    expect(after.groups.map((g) => g.attendance.length)).toEqual([7, 13, 12]);
    expect(errors).toEqual([]);
    const video = board.video()!;
    await context.close();
    await video.saveAs(`${output}/local-rehearsal.webm`);
    await writeFile(
      `${output}/result.json`,
      JSON.stringify(
        {
          status: "PASS",
          run,
          elapsedMs: Date.now() - started,
          buildId: (await readFile(".next/BUILD_ID", "utf8")).trim(),
          environment: "LOCAL Chromium + PostgreSQL auth/realtime emulator",
          input:
            "29 seed observations + 3 synthetic pixel cards; real deterministic core",
          groups: [7, 13, 12],
          rotations: 3,
          toolPreviews: [
            "ratio",
            "number-line/predict",
            "fractions/find-error",
          ],
          actualStarts: 2,
          previewChangesCountedAsStarts: false,
          exitReceived: 1,
          exitExpected: 32,
          pendingExit: 31,
          offlineDuplicateAddsEvidence: false,
          runtimeOrUnexpectedConsoleErrors: errors.length,
          expectedOfflineNetworkErrors: expectedOfflineErrors.length,
          physicalCamera: "NOT_RUN",
          physicalTouch: "NOT_RUN",
          sixMinuteStageTiming: "NOT_RUN",
          liveAI: "NOT_RUN; static strategy shown",
        },
        null,
        2,
      ) + "\n",
    );
  });
}
