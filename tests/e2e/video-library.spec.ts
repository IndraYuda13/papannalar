import { test, expect, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import {
  libraryStateSchema,
  runDetailSchema,
} from "../../src/contracts/library";
import {
  openBoard,
  injectFixture,
  waitForShellCache,
  loginTeacher,
} from "../browser/helpers";
import { customFormBindingSchema } from "../../src/contracts/custom-form";
import { readFile } from "node:fs/promises";
const origin = "http://127.0.0.1:3100";
async function call(page: Page, data: object) {
  const response = await page.request.post("/api/v1/library", {
    headers: { Origin: origin },
    data,
  });
  expect(response.ok()).toBe(true);
  return response.json();
}
async function sample(page: Page) {
  await page.goto("/masuk");
  await page.getByRole("button", { name: "Coba dengan data contoh" }).click();
  await expect(page).toHaveURL(/\/guru$/);
  await expect(
    page.getByRole("heading", { name: "Siap belajar hari ini?" }),
  ).toBeVisible();
  // Explicit operator takeover is separately tested; set up one controlled context.
  const claim = await page.request.post("/api/v1/sample/control", {
    headers: { Origin: origin },
    data: { takeover: true },
  });
  expect(claim.ok()).toBe(true);
}
test("U01 sample login uses persistent teacher/classes/results on main routes", async ({
  page,
  browser,
}) => {
  await sample(page);
  const before = libraryStateSchema.parse(await call(page, { action: "list" }));
  expect(before.sample).toBe(true);
  expect(
    before.collections.filter((c) => c.source === "system").length,
  ).toBeGreaterThanOrEqual(2);
  expect(before.runs.filter((r) => r.synthetic).length).toBeGreaterThanOrEqual(
    3,
  );
  const classes = await page.request.get("/api/v1/classes?mode=demo");
  const first = await classes.json();
  expect(first.classes.map((c: { label: string }) => c.label)).toEqual(
    expect.arrayContaining(["7B", "7C"]),
  );
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Siap belajar hari ini?" }),
  ).toBeVisible();
  const other = await browser.newContext(),
    second = await other.newPage();
  await sample(second);
  const after = libraryStateSchema.parse(
    await call(second, { action: "list" }),
  );
  expect(after.runs.map((r) => r.id)).toEqual(before.runs.map((r) => r.id));
  expect(
    await (await second.request.get("/api/v1/classes?mode=demo")).json(),
  ).toEqual(first);
  await other.close();
});
test("U02 local class identity, attendance and export persist; student UUID and network remain private", async ({
  page,
}) => {
  await sample(page);
  const list = await (
    await page.request.get("/api/v1/classes?mode=demo")
  ).json();
  const cls = list.classes.find((c: { label: string }) => c.label === "7B");
  const before = await (
    await page.request.get(`/api/v1/classes/${cls.id}`)
  ).json();
  const student = before.students[0];
  const bodies: string[] = [];
  page.on("request", (r) => {
    if (r.postData()) bodies.push(r.postData()!);
  });
  await page.goto(`/guru/kelas/${cls.id}`);
  const row = page.getByRole("listitem").filter({ hasText: "Awan 01" });
  await row.getByRole("button", { name: "Edit", exact: true }).click();
  await page
    .getByLabel("Nama panggilan di perangkat ini")
    .fill("FIKTIF_LOCAL_CANARY");
  await page.getByRole("button", { name: "Simpan siswa", exact: true }).click();
  await expect(page.getByText("FIKTIF_LOCAL_CANARY")).toBeVisible();
  await page
    .getByRole("checkbox", { name: "Absen 1 hadir", exact: true })
    .uncheck();
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "Catatan hadir tersimpan di perangkat" }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByText("FIKTIF_LOCAL_CANARY")).toBeVisible();
  await expect(
    page.getByRole("checkbox", { name: "Absen 1 hadir", exact: true }),
  ).not.toBeChecked();
  const after = await (
    await page.request.get(`/api/v1/classes/${cls.id}`)
  ).json();
  expect(
    after.students.find((s: { id: string }) => s.id === student.id)
      .attendanceNumber,
  ).toBe(1);
  expect(JSON.stringify(after)).not.toContain("FIKTIF_LOCAL_CANARY");
  expect(bodies.join("\n")).not.toContain("FIKTIF_LOCAL_CANARY");
  await page.getByText("Impor dan nama lokal", { exact: true }).click();
  await page
    .getByText("Nama opsional · hanya perangkat ini", { exact: true })
    .click();
  const download = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Ekspor CSV lokal", exact: true })
    .click();
  expect((await download).suggestedFilename()).toBe("nama-lokal.csv");
});
test("U03-U05 system session plays, recovers question3 automatically and stored model survives reload", async ({
  page,
  browser,
}) => {
  test.setTimeout(90000);
  const errors: string[] = [];
  await sample(page);
  const state = libraryStateSchema.parse(await call(page, { action: "list" }));
  const set = state.collections.find(
    (c) =>
      c.source === "system" &&
      c.document.title === "Petualangan Bilangan Bulat",
  )!;
  await page.goto(`/guru/mulai?collection=${set.id}`);
  await page
    .getByRole("combobox", { name: "Kelas", exact: true })
    .selectOption({ label: "7B" });
  await page
    .getByRole("button", { name: /^(Mulai sesi|Lanjutkan sesi)$/ })
    .click();
  await expect(page).toHaveURL(/\/guru\/sesi\//);
  const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      baseURL: origin,
    }),
    board = await context.newPage();
  board.on("pageerror", (e) => errors.push(e.message));
  try {
    await openBoard(board);
    const code = (await board.getByTestId("pairing-code").innerText()).replace(
      /\s/g,
      "",
    );
    await page.getByLabel("Kode pasangan").fill(code);
    await page
      .getByRole("button", { name: "Hubungkan papan", exact: true })
      .click();
    await expect(board.getByTestId("library-board")).toBeVisible();
    // A previously used system run is resumed; drive the persisted position to3.
    for (let i = 0; i < 2; i++) {
      if (await page.getByText(/Soal 3\/3/).isVisible()) break;
      await page
        .getByRole("button", { name: "Soal berikutnya", exact: true })
        .click();
    }
    await expect(board.getByTestId("library-board")).toContainText("Soal 3/3");
    await board
      .getByRole("button", { name: "Mulai ulang", exact: true })
      .click();
    await board.getByLabel("Besar lompatan").fill("-7");
    await board.getByRole("button", { name: "Lompat", exact: true }).click();
    await board.getByRole("button", { name: "Jalankan", exact: true }).click();
    await expect(
      board.getByText("Tersimpan di papan", { exact: true }),
    ).toBeVisible();
    await board.reload();
    await expect(board.getByTestId("library-board")).toContainText("Soal 3/3");
    await expect(board.getByTestId("number-position")).toHaveText("Posisi −3");
    await page.context().setOffline(true);
    await expect(board.getByTestId("library-board")).toContainText("Soal 3/3");
    await page.context().setOffline(false);
    await expect(
      page.getByText("Layar tersambung", { exact: true }),
    ).toBeVisible();
    await expect(board.getByTestId("library-board")).toContainText("Soal 3/3");
    await page
      .getByRole("button", { name: "Putuskan layar", exact: true })
      .click();
    await expect(board.getByTestId("library-board")).toHaveCount(0);
    expect(errors).toEqual([]);
  } finally {
    await context.close();
  }
});
test("U12 actual custom-card pixels are bound to frozen form, and rescan is idempotent", async ({
  page,
}) => {
  await sample(page);
  const state = libraryStateSchema.parse(await call(page, { action: "list" }));
  const cards = state.collections.find(
    (c) =>
      c.source === "teacher" &&
      c.document.title === "Bilangan Bulat — Pertemuan 1",
  )!;
  const list = await (
    await page.request.get("/api/v1/classes?mode=demo")
  ).json();
  const cls = list.classes.find((c: { label: string }) => c.label === "7B");
  const run = await call(page, {
    action: "start",
    id: crypto.randomUUID(),
    classId: cls.id,
    collectionId: cards.id,
    version: cards.version,
    date: "2026-09-30",
    mode: "assessment",
  });
  await page.goto(`/guru/sesi/${run.id}`);
  await page.addScriptTag({
    content: await readFile(".browser-tests/card-photo.js", "utf8"),
  });
  const form = customFormBindingSchema.parse({
    intent: "custom_assessment",
    formId: run.formId,
    version: run.version,
    pageIndex: 0,
    rows: 5,
  });
  const bytes = await page.evaluate(
    (binding) =>
      window.__cardPhoto.png({
        kind: "weekly",
        attendance: 1,
        answers: ["A", "C", "D", "B", "C"],
        binding,
      }),
    form,
  );
  await page.getByLabel(/Pilih foto/).setInputFiles({
    name: "card.png",
    mimeType: "image/png",
    buffer: Buffer.from(bytes, "base64"),
  });
  await expect(
    page.getByRole("heading", { name: "Periksa jawaban", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Simpan jawaban", exact: true })
    .click();
  const detail = runDetailSchema.parse(
    await call(page, { action: "detail", id: run.id }),
  );
  expect(detail.responses[0].correct).toBe(5);
  const action = {
    action: "response",
    id: run.id,
    formId: run.formId,
    pageIndex: 0,
    version: run.version,
    studentId: detail.responses[0].studentId,
    answers: detail.responses[0].answers,
    revision: 0,
    status: "received",
  };
  const repeated = runDetailSchema.parse(await call(page, action));
  expect(repeated.responses).toHaveLength(1);
  expect(repeated.responses[0].revision).toBe(1);
  const wrong = await page.request.post("/api/v1/library", {
    headers: { Origin: origin },
    data: { ...action, version: run.version + 1 },
  });
  expect(wrong.status()).toBe(422);
});
test("U14 sample, another teacher, board and visitor cannot read each other's private data", async ({
  page,
  browser,
}) => {
  await sample(page);
  const state = libraryStateSchema.parse(await call(page, { action: "list" }));
  const otherContext = await browser.newContext({ baseURL: origin });
  const boardContext = await browser.newContext({ baseURL: origin });
  const visitorContext = await browser.newContext({ baseURL: origin });
  try {
    const teacher = await otherContext.newPage();
    await loginTeacher(teacher);
    const classId = crypto.randomUUID();
    expect(
      (
        await teacher.request.post("/api/v1/classes", {
          headers: { Origin: origin },
          data: { id: classId, label: "7A", grade: 7, count: 3, mode: "pilot" },
        })
      ).ok(),
    ).toBe(true);
    const deniedClass = await page.request.get(`/api/v1/classes/${classId}`);
    expect([403, 404]).toContain(deniedClass.status());
    const deniedHistory = await teacher.request.post("/api/v1/library", {
      headers: { Origin: origin },
      data: { action: "detail", id: state.runs[0].id },
    });
    expect([403, 404]).toContain(deniedHistory.status());
    expect((await call(teacher, { action: "list" })).runs).toEqual([]);
    const board = await boardContext.newPage();
    expect(
      (
        await board.request.post("/api/v1/board/identity", {
          headers: { Origin: origin },
          data: {},
        })
      ).ok(),
    ).toBe(true);
    for (const client of [board, await visitorContext.newPage()]) {
      expect(
        (
          await client.request.post("/api/v1/library", {
            headers: { Origin: origin },
            data: { action: "detail", id: state.runs[0].id },
          })
        ).status(),
      ).toBe(401);
      expect(
        (await client.request.get(`/api/v1/classes/${classId}`)).status(),
      ).toBe(401);
    }
    expect(
      (
        await page.request.post("/api/v1/library", {
          headers: { Origin: origin },
          data: { action: "list", nickname: "LOCAL_ONLY" },
        })
      ).status(),
    ).toBe(422);
  } finally {
    await Promise.all([
      otherContext.close(),
      boardContext.close(),
      visitorContext.close(),
    ]);
  }
});

test("U15 two cached classes open offline; revised pending response syncs once and logout locks cache", async ({
  page,
  context,
}) => {
  test.setTimeout(90000);
  await sample(page);
  const state = libraryStateSchema.parse(await call(page, { action: "list" }));
  const one = state.runs.find(
      (r) => r.classLabel === "7B" && r.mode === "assessment",
    )!,
    two = state.runs.find(
      (r) => r.classLabel === "7C" && r.mode === "assessment",
    )!;
  for (const r of [one, two]) {
    await page.goto(`/guru/sesi/${r.id}`);
    await expect(
      page.getByRole("heading", { name: r.document.title, exact: true }),
    ).toBeVisible();
  }
  await page.goto("/guru");
  await injectFixture(page);
  await waitForShellCache(page);
  await context.setOffline(true);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Kelas & materi tersimpan" }),
  ).toBeVisible();
  for (const r of [one, two]) {
    await page
      .getByRole("combobox", { name: "Sesi offline", exact: true })
      .selectOption(r.id);
    await page
      .getByRole("button", { name: "Buka sesi tersimpan", exact: true })
      .click();
    await expect(
      page.getByText(`Kelas ${r.classLabel} · Cek pemahaman`, { exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", {
        name: "Pilih kelas / materi tersimpan lain",
        exact: true,
      })
      .click();
  }
  await injectFixture(page);
  const scope = await page.evaluate(async () => {
    const grant = await window.__privacyFixture.readLocalAccess();
    return { ownerId: grant!.id, mode: "demo" as const };
  });
  const detail = runDetailSchema.parse(
    await page.evaluate(
      async ({ scope, id }) =>
        window.__privacyFixture.libraryCache(scope, "detail", id),
      { scope, id: one.id },
    ),
  );
  const student = one.roster.at(-1)!;
  const old = detail.responses.find((r) => r.studentId === student.id);
  const action = {
    action: "response" as const,
    id: one.id,
    formId: one.formId,
    pageIndex: 0 as const,
    version: one.version,
    studentId: student.id,
    answers: one.document.items.map(() => "?" as const),
    revision: old?.revision ?? 0,
    status: "received" as const,
  };
  await page.evaluate(
    async ({ scope, action }) => {
      await window.__privacyFixture.queueLibraryResponse(scope, action);
      await window.__privacyFixture.queueLibraryResponse(scope, {
        ...action,
        revision: action.revision + 1,
      });
    },
    { scope, action },
  );
  await context.setOffline(false);
  await expect
    .poll(async () => {
      const d = runDetailSchema.parse(
        await call(page, { action: "detail", id: one.id }),
      );
      return d.responses.find((r) => r.studentId === student.id)?.revision;
    })
    .toBe(
      (old?.revision ?? 0) +
        (old && old.answers.every((a) => a === "?") ? 0 : 1),
    );
  await injectFixture(page);
  await expect
    .poll(() =>
      page.evaluate(
        async (scope) =>
          (await window.__privacyFixture.pendingLibraryResponses(scope)).length,
        scope,
      ),
    )
    .toBe(0);
  await page
    .getByRole("button", { name: "Keluar akun", exact: true })
    .first()
    .click();
  await expect(page).toHaveURL(/\/masuk$/);
  await injectFixture(page);
  expect(
    await page.evaluate(async (scope) => {
      try {
        await window.__privacyFixture.libraryCache(scope, "state", "index");
        return false;
      } catch {
        return true;
      }
    }, scope),
  ).toBe(true);
});
test("U08-U13 author five cards, reuse across classes, store revise and retain historical keys", async ({
  page,
}) => {
  await sample(page);
  const title = `Latihan rekaman ${crypto.randomUUID().slice(0, 8)}`;
  await page.goto("/guru/soal/baru");
  await page.getByLabel("Nama kumpulan", { exact: true }).fill(title);
  for (let i = 1; i <= 5; i++) {
    await page
      .getByRole("button", { name: "Tambah soal", exact: true })
      .click();
    const item = page.getByRole("article", { name: `Soal ${i}`, exact: true });
    await item
      .getByLabel("Pertanyaan", { exact: true })
      .fill(`Soal ${i}: ${i} + 1 = …`);
    for (const [n, c] of ["A", "B", "C", "D"].entries())
      await item
        .getByLabel(`Pilihan ${c}`, { exact: true })
        .fill(String(i + 1 + n));
  }
  await page
    .getByRole("button", { name: "Preview soal 1", exact: true })
    .click();
  await expect(page.getByLabel("Pratinjau soal")).toBeVisible();
  await page.getByRole("button", { name: "Tutup preview" }).click();
  await expect(page.getByLabel("Nama kumpulan", { exact: true })).toHaveValue(
    title,
  );
  await page.getByRole("button", { name: "Simpan & siap digunakan" }).click();
  await expect(page.getByRole("status")).toContainText(
    "Kumpulan tersimpan dan siap digunakan",
  );
  const setId = new URL(page.url()).pathname.split("/").at(-1)!;
  await page.reload();
  await expect(page.getByLabel("Nama kumpulan", { exact: true })).toHaveValue(
    title,
  );
  await page.goto(`/guru/mulai?collection=${setId}&mode=assessment`);
  await page
    .getByRole("combobox", { name: "Kelas", exact: true })
    .selectOption({ label: "7B" });
  await page.getByRole("button", { name: "Simpan & mulai asesmen" }).click();
  await expect(page).toHaveURL(/\/guru\/sesi\//);
  const runId = new URL(page.url()).pathname.split("/").at(-1)!;
  const pdf = page.waitForEvent("download");
  await page.getByRole("button", { name: "Cetak kartu asesmen" }).click();
  expect((await pdf).suggestedFilename()).toContain("kartu-nalar");
  for (let n = 1; n <= 3; n++) {
    await page
      .getByRole("button", {
        name: /Masukkan jawaban manual|Input manual|Masukkan manual/,
      })
      .click();
    await page
      .getByRole("combobox", { name: "Nomor absen", exact: true })
      .selectOption(String(n));
    for (let i = 1; i <= 5; i++)
      await page
        .getByRole("combobox", { name: `Baris ${i}`, exact: true })
        .selectOption(n === 3 ? "?" : "A");
    await page
      .getByRole("button", { name: "Simpan jawaban", exact: true })
      .click();
    await expect(
      page
        .getByRole("status")
        .filter({ hasText: `Absen ${n}: tersimpan di database.` }),
    ).toBeVisible();
  }
  const detail = runDetailSchema.parse(
    await call(page, { action: "detail", id: runId }),
  );
  expect(detail.responses).toHaveLength(3);
  expect(detail.responses.map((r) => r.correct).sort()).toEqual([0, 5, 5]);
  const archived = detail.run.roster.find((s) => s.attendanceNumber === 1)!;
  try {
    await call(page, {
      action: "roster",
      classId: detail.run.classId,
      studentId: archived.id,
      attendanceNumber: 1,
      active: false,
    });
    const frozen = runDetailSchema.parse(
      await call(page, { action: "detail", id: runId }),
    );
    expect(frozen.run.roster).toEqual(detail.run.roster);
    expect(frozen.responses).toEqual(detail.responses);
  } finally {
    await call(page, {
      action: "roster",
      classId: detail.run.classId,
      studentId: archived.id,
      attendanceNumber: 1,
      active: true,
    });
  }
  await page.getByRole("link", { name: "Buka hasil tersimpan" }).click();
  await expect(
    page.getByRole("heading", { name: "3/32 lembar masuk" }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "3/32 lembar masuk" }),
  ).toBeVisible();
  await page.goto(`/guru/soal/${setId}`);
  await page
    .getByRole("article", { name: "Soal 1", exact: true })
    .getByLabel("Kunci jawaban")
    .selectOption("B");
  await page.getByRole("button", { name: "Simpan & siap digunakan" }).click();
  await expect(page.getByRole("status")).toContainText(
    "Kumpulan tersimpan dan siap digunakan",
  );
  const old = runDetailSchema.parse(
    await call(page, { action: "detail", id: runId }),
  );
  expect(old.run.version).toBe(1);
  expect(old.run.document.items[0]).toHaveProperty("key", "A");
  await page.goto(`/guru/mulai?collection=${setId}&mode=assessment`);
  await page
    .getByRole("combobox", { name: "Kelas", exact: true })
    .selectOption({ label: "7C" });
  await page.getByRole("button", { name: "Simpan & mulai asesmen" }).click();
  await expect(page).toHaveURL(/\/guru\/sesi\//);
  const secondId = new URL(page.url()).pathname.split("/").at(-1)!;
  expect(secondId).not.toBe(runId);
  const second = runDetailSchema.parse(
    await call(page, { action: "detail", id: secondId }),
  );
  expect(second.responses).toHaveLength(0);
  expect(second.run.classLabel).toBe("7C");
  await page.goto("/guru/asesmen");
  await page.getByRole("tab", { name: "Hasil", exact: true }).click();
  await page
    .getByRole("combobox", { name: "Kumpulan", exact: true })
    .selectOption(setId);
  await page.getByLabel("Dari tanggal", { exact: true }).fill(detail.run.date);
  await page
    .getByLabel("Sampai tanggal", { exact: true })
    .fill(detail.run.date);
  const resultLinks = page.locator('a[href^="/guru/hasil/"]');
  await page
    .getByRole("combobox", { name: "Kelas", exact: true })
    .selectOption(detail.run.classId);
  await expect(resultLinks).toHaveCount(1);
  await expect(resultLinks).toHaveAttribute("href", `/guru/hasil/${runId}`);
  await page
    .getByRole("combobox", { name: "Kelas", exact: true })
    .selectOption(second.run.classId);
  await expect(resultLinks).toHaveCount(1);
  await expect(resultLinks).toHaveAttribute("href", `/guru/hasil/${secondId}`);
  await page.getByLabel("Dari tanggal", { exact: true }).fill("2100-01-01");
  await expect(resultLinks).toHaveCount(0);
  await expect(
    page.getByText("Belum ada asesmen pada pilihan ini."),
  ).toBeVisible();
  await page.getByLabel("Dari tanggal", { exact: true }).fill(detail.run.date);
  await page
    .getByRole("combobox", { name: "Kelas", exact: true })
    .selectOption(detail.run.classId);
  await resultLinks.click();
  await page
    .getByRole("listitem")
    .filter({ hasText: "Sudah masuk · 5/5" })
    .first()
    .getByRole("button")
    .click();
  await expect(
    page.getByRole("region", { name: "Rincian jawaban", exact: true }),
  ).toContainText("Jawaban: A · Kunci: A");
});
test("U10 teacher creates real interactive/writing collection and preview retains form", async ({
  page,
}) => {
  await sample(page);
  await page.goto("/guru/soal/baru");
  await page
    .getByLabel("Nama kumpulan", { exact: true })
    .fill("Interaktif rekaman");
  await page.getByLabel("Jenis kumpulan").selectOption("interactive");
  await page.getByRole("button", { name: "Tambah soal", exact: true }).click();
  const first = page.getByRole("article", { name: "Soal 1", exact: true });
  await first
    .getByLabel("Pertanyaan", { exact: true })
    .fill("Geser dari −3 ke −8.");
  await page.getByRole("button", { name: "Tambah soal", exact: true }).click();
  const second = page.getByRole("article", { name: "Soal 2", exact: true });
  await second
    .getByRole("combobox", { name: "Aktivitas", exact: true })
    .selectOption("writing");
  await second
    .getByLabel("Pertanyaan", { exact: true })
    .fill("Tuliskan cerita gerak lift.");
  await page.getByRole("button", { name: "Simpan & siap digunakan" }).click();
  await expect(page.getByRole("status")).toContainText(
    "Kumpulan tersimpan dan siap digunakan",
  );
  await page
    .getByRole("button", { name: "Preview soal 2", exact: true })
    .click();
  await expect(page.getByLabel("Bidang tulis sementara")).toBeVisible();
  await page.getByRole("button", { name: "Tutup preview" }).click();
  await expect(
    second.getByRole("textbox", { name: "Pertanyaan", exact: true }),
  ).toHaveValue("Tuliskan cerita gerak lift.");
});
test("U16 teacher navigation fits phone and desktop with no runtime errors", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await sample(page);
  await mkdir("artifacts/qa/video-ready", { recursive: true });
  for (const [width, height] of [
    [360, 800],
    [390, 844],
    [1366, 768],
  ]) {
    await page.setViewportSize({ width, height });
    for (const path of [
      "/guru",
      "/guru/kelas",
      "/guru/soal",
      "/guru/asesmen",
    ]) {
      await page.goto(path);
      await expect(
        page.getByRole("navigation", { name: "Menu utama" }),
      ).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    }
    await page.goto("/guru");
    const box = await page
      .getByRole("link", { name: "Mulai mengajar", exact: true })
      .boundingBox();
    expect(box).toBeTruthy();
    expect(box!.y + box!.height).toBeLessThan(height);
    await page.screenshot({
      path: `artifacts/qa/video-ready/teacher-${width}.png`,
    });
  }
  expect(errors).toEqual([]);
});
