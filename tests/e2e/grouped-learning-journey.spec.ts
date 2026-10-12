import { test, expect, type Page } from "@playwright/test";
import { appOrigin, providerOrigin } from "../harness/ports.mjs";
import { openBoard } from "../browser/helpers";
import { mkdir } from "node:fs/promises";
async function call(page: Page, path: string, data: object) {
  const response = await page.request.post(path, {
    headers: { Origin: appOrigin },
    data,
  });
  expect(response.ok(), await response.text()).toBe(true);
  return response.json();
}
async function login(page: Page) {
  const email = `groups-${crypto.randomUUID()}@qa.invalid`;
  await page.goto("/masuk");
  await page.getByLabel("Email guru").fill(email);
  await page.getByRole("button", { name: "Kirim tautan masuk" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Tautan masuk sudah dikirim" }),
  ).toBeVisible();
  const link = await (
    await page.request.get(
      `${providerOrigin}/__test/link?email=${encodeURIComponent(email)}`,
    )
  ).json();
  await page.goto(link.url);
  await expect(page).toHaveURL(/\/guru$/);
}
const root = "/mnt/papannalar-20261013/evidence/frame-browser";
test("real-class explicit methods, persisted groups, autonomous board and late blank corrections", async ({
  page,
  browser,
}) => {
  test.setTimeout(180000);
  await mkdir(root, { recursive: true });
  await login(page);
  const classId = crypto.randomUUID();
  await call(page, "/api/v1/classes", {
    id: classId,
    label: "Kelas uji kelompok",
    grade: 7,
    count: 6,
    mode: "pilot",
  });
  const collectionId = crypto.randomUUID();
  const collectionDocument = {
    title: "Latihan pecahan uji",
    kind: "cards",
    items: [
      {
        id: crypto.randomUUID(),
        kind: "card",
        prompt: "Mana yang lebih besar?",
        options: ["1/2", "3/4", "1/4", "0"],
        key: "B",
        explanation: "",
      },
      {
        id: crypto.randomUUID(),
        kind: "card",
        prompt: "2 + 3 = ?",
        options: ["4", "5", "6", "7"],
        key: "B",
        explanation: "",
      },
    ],
  };
  await call(page, "/api/v1/library", {
    contractVersion: 2,
    action: "save",
    id: collectionId,
    revision: 0,
    ready: true,
    document: collectionDocument,
    mapping: {
      default: {
        topicId: "pecahan",
        competencyId: "pecahan-representasi",
        mappingVersion: 1,
      },
      overrides: [],
    },
  });
  await page.goto(`/guru/mulai?class=${classId}&collection=${collectionId}`);
  await expect(page.getByLabel("Bahas soal saja")).toBeChecked();
  await page.getByRole("button", { name: "Mulai sesi", exact: true }).click();
  await expect(page).toHaveURL(/\/guru\/sesi\//);
  const runId = page.url().split("/").at(-1)!;
  await expect(
    page.getByRole("region", { name: "Lembar jawaban" }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Akhiri sesi", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Akhiri sesi", exact: true })
    .click();
  await expect(page).toHaveURL(new RegExp(`/guru/hasil/${runId}`));
  await expect(
    page.getByText("Bahas soal tanpa pengumpulan kartu.", { exact: false }),
  ).toBeVisible();
  await page.goto(`/guru/mulai?class=${classId}&collection=${collectionId}`);
  await page
    .getByLabel("Kumpulkan jawaban dengan kartu", { exact: true })
    .check();
  await page.getByRole("button", { name: "Mulai sesi", exact: true }).click();
  await expect(
    page.getByRole("region", { name: "Lembar jawaban" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Akhiri sesi", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Akhiri sesi", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: /Jawaban kartu/ }),
  ).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/guru/latihan?class=${classId}`);
  await page.getByText("Periksa kehadiran", { exact: true }).click();
  await page.getByRole("checkbox").last().uncheck();
  await page.getByLabel("Jumlah kelompok").fill("2");
  await page
    .getByRole("button", { name: "Buat kelompok", exact: true })
    .click();
  await expect(
    page.getByText("5 siswa dalam 2 kelompok", { exact: true }),
  ).toBeVisible();
  await expect(page).toHaveURL(/lesson=/);
  const lessonId = new URL(page.url()).searchParams.get("lesson")!;
  let lesson = await call(page, "/api/v1/group-lessons", {
    action: "detail",
    id: lessonId,
  });
  expect(
    new Set(
      lesson.groups.flatMap((g: { studentIds: string[] }) => g.studentIds),
    ).size,
  ).toBe(5);
  const originalMembers = lesson.groups.map(
    (g: { studentIds: string[] }) => g.studentIds,
  );
  await page.reload();
  const reloaded = await call(page, "/api/v1/group-lessons", {
    action: "detail",
    id: lessonId,
  });
  expect(reloaded.seed).toBe(lesson.seed);
  expect(
    reloaded.groups.map((g: { studentIds: string[] }) => g.studentIds),
  ).toEqual(originalMembers);
  await expect(
    page.getByText("5 siswa dalam 2 kelompok", { exact: true }),
  ).toBeVisible();

  const groups = page.locator("section").filter({
    has: page.locator("summary", { hasText: "Lihat anggota dan kegiatan" }),
  });
  for (let i = 0; i < 2; i++) {
    const group = groups.nth(i);
    await group.locator("summary").first().click();
    await group
      .getByLabel(
        i === 0 ? "Menjawab di layar" : "Mengerjakan soal dengan kartu",
        { exact: true },
      )
      .check();
    await group.getByLabel("Soal yang dipakai").selectOption(collectionId);
  }
  await groups
    .nth(0)
    .getByRole("button", { name: "Pindahkan", exact: true })
    .first()
    .click();
  await groups
    .nth(0)
    .getByLabel("Pindahkan ke kelompok")
    .selectOption(lesson.groups[1].id);
  await groups
    .nth(0)
    .getByRole("button", { name: "Simpan perubahan", exact: true })
    .click();
  await page.screenshot({ path: `${root}/groups-mobile.png`, fullPage: true });
  for (const width of [360, 768, 1024, 1366, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `${root}/groups-${width}.png`,
      fullPage: true,
    });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page
    .getByRole("button", { name: "Periksa kesiapan", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Siap mulai?", exact: true }),
  ).toBeVisible();
  await page.getByText("Siapkan cetakan", { exact: true }).click();
  const download = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Unduh lembar soal", exact: true })
    .click();
  await (await download).saveAs(`${root}/assignment-questions.pdf`);
  await page.getByLabel("Lembar soal dan kartu sudah disiapkan").check();
  await page
    .getByRole("button", { name: "Mulai kegiatan", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Kegiatan kelompok", exact: true }),
  ).toBeVisible();
  const context = await browser.newContext({
      viewport: { width: 1366, height: 768 },
    }),
    board = await context.newPage();
  await openBoard(board);
  const code = await board.getByTestId("pairing-code").innerText();
  await page.getByLabel("Kode pasangan").fill(code.replace(/\s/g, ""));
  await page.getByRole("button", { name: /Hubungkan|Sambungkan/ }).click();
  await expect(board.getByTestId("group-board")).toBeVisible();
  await board.getByRole("button", { name: /^A\./ }).click();
  await board
    .getByRole("button", { name: "Periksa jawaban", exact: true })
    .click();
  await expect(
    board.getByText("Belum tepat. Coba lagi atau lanjut ke soal berikutnya."),
  ).toBeVisible();
  await board
    .getByRole("button", { name: "Soal berikutnya", exact: true })
    .click();
  await board.reload();
  await expect(board.getByTestId("group-board")).toContainText("Soal 2 dari 2");
  await board.getByRole("button", { name: "B. 5", exact: true }).click();
  await board
    .getByRole("button", { name: "Periksa jawaban", exact: true })
    .click();
  await expect(board.getByText("Jawaban tepat.")).toBeVisible();
  await board.screenshot({ path: `${root}/board-desktop.png` });
  await board
    .getByRole("button", { name: "Selesaikan tugas", exact: true })
    .click();
  await expect(
    board.getByRole("heading", { name: "Semua soal selesai", exact: true }),
  ).toBeVisible();
  lesson = await call(page, "/api/v1/group-lessons", {
    action: "detail",
    id: lessonId,
  });
  expect(lesson.status).toBe("active");
  await page
    .getByRole("button", { name: "Akhiri kegiatan kelas", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Akhiri kegiatan kelas", exact: true })
    .click();
  await expect(page).toHaveURL(/source=group_lesson/);
  const cards = lesson.assignments.find(
    (a: { method: string }) => a.method === "cards",
  );
  await page.goto(`/guru/sesi/${cards.runId}`);
  await page.getByRole("button", { name: "Input manual", exact: true }).click();
  await page.getByLabel("Baris 1", { exact: true }).selectOption("?");
  await page.getByLabel("Baris 2", { exact: true }).selectOption("unreadable");
  await page
    .getByRole("button", { name: "Simpan jawaban", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "sudah tersimpan" }),
  ).toBeVisible();
  const detail = await call(page, "/api/v1/library", {
    contractVersion: 2,
    action: "detail",
    id: cards.runId,
  });
  expect(detail.responses[0].status).toBe("review");
  expect(detail.responses[0].answers).toEqual(["?", null]);
  expect(detail.run.status).toBe("closed");
  await page.getByRole("button", { name: "Input manual", exact: true }).click();
  await page.getByLabel("Baris 1", { exact: true }).selectOption("B");
  await page.getByLabel("Baris 2", { exact: true }).selectOption("B");
  await page.getByLabel("Masih perlu dicek").uncheck();
  await page
    .getByRole("button", { name: "Simpan jawaban", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "sudah tersimpan" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Periksa jawaban", exact: true }),
  ).toHaveCount(0);
  const corrected = await call(page, "/api/v1/library", {
    contractVersion: 2,
    action: "detail",
    id: cards.runId,
  });
  expect(corrected.responses[0].status).toBe("received");
  expect(corrected.responses[0].correct).toBe(2);
  expect(corrected.responses[0].revision).toBeGreaterThan(
    detail.responses[0].revision,
  );
  await page.goto(`/guru/hasil/${lessonId}?source=group_lesson`);
  await expect(page.getByText("2/2 benar", { exact: true })).toBeVisible();
  const toolId = crypto.randomUUID();
  await call(page, "/api/v1/library", {
    contractVersion: 2,
    action: "save",
    id: toolId,
    revision: 0,
    ready: true,
    mapping: { default: null, overrides: [] },
    document: {
      title: "Lompatan interaktif uji",
      kind: "interactive",
      items: [
        {
          id: crypto.randomUUID(),
          kind: "interactive",
          prompt: "Mulai dari -3 dan lompat 5 ke kanan.",
          tool: {
            kind: "number-line",
            origin: { numerator: -3, denominator: 1 },
            delta: { numerator: 5, denominator: 1 },
            orientation: "horizontal",
          },
        },
        {
          id: crypto.randomUUID(),
          kind: "writing",
          prompt: "Ceritakan cara menemukan jawabannya.",
        },
      ],
    },
  });
  await page.goto(`/guru/latihan?class=${classId}`);
  await page.getByLabel("Jumlah kelompok").fill("1");
  await page
    .getByRole("button", { name: "Buat kelompok", exact: true })
    .click();
  const toolGroup = page.locator("section").filter({
    has: page.locator("summary", { hasText: "Lihat anggota dan kegiatan" }),
  });
  await toolGroup.locator("summary").first().click();
  await toolGroup.getByLabel("Menjawab di layar", { exact: true }).check();
  await toolGroup.getByLabel("Soal yang dipakai").selectOption(toolId);
  await page
    .getByRole("button", { name: "Periksa kesiapan", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Mulai kegiatan", exact: true })
    .click();

  const toolContext = await browser.newContext({
      viewport: { width: 1366, height: 768 },
    }),
    toolBoard = await toolContext.newPage();
  await openBoard(toolBoard);
  const toolCode = await toolBoard.getByTestId("pairing-code").innerText();
  await page.getByLabel("Kode pasangan").fill(toolCode.replace(/\s/g, ""));
  await page
    .getByRole("button", { name: "Hubungkan papan", exact: true })
    .click();
  await expect(toolBoard.getByTestId("group-board")).toBeVisible();
  await toolBoard.getByLabel("Besar lompatan").fill("5");
  await toolBoard.getByRole("button", { name: "Lompat", exact: true }).click();
  await toolBoard
    .getByRole("button", { name: "Periksa jawaban", exact: true })
    .click();
  await expect(
    toolBoard.getByText("Jawaban tepat.", { exact: true }),
  ).toBeVisible();
  await toolBoard.screenshot({ path: `${root}/interactive-board.png` });
  await toolBoard
    .getByRole("button", { name: "Soal berikutnya", exact: true })
    .click();
  await toolBoard
    .getByRole("button", { name: "Selesai mencoba", exact: true })
    .click();
  await expect(
    toolBoard.getByRole("heading", { name: "Semua soal selesai", exact: true }),
  ).toBeVisible();
  await toolContext.close();
  await context.close();
});
