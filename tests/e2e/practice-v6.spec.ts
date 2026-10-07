import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { PDFDocument } from "pdf-lib";
import {
  loginTeacher,
  openBoard,
  injectFixture,
  waitForShellCache,
} from "../browser/helpers";
import { readLocalPackage } from "../browser/package-state";
const origin = "http://127.0.0.1:3100";
async function call(page: Page, path: string, data: object) {
  return page.request.post(path, { headers: { Origin: origin }, data });
}
async function createDemo(page: Page, grade = 7) {
  await loginTeacher(page, { guided: true });
  await page.getByLabel("Gunakan kelas").selectOption("demo");
  await page.getByRole("button", { name: "Buat kelas", exact: true }).click();
  await page.getByLabel("Nama kelas", { exact: true }).fill("7UX");
  await page.getByLabel("Tingkat kelas", { exact: true }).fill(String(grade));
  await page.getByLabel("Jumlah siswa", { exact: true }).fill("3");
  await page.getByRole("button", { name: "Simpan kelas", exact: true }).click();
  await page.getByRole("button", { name: "Siapkan soal", exact: true }).click();
  await expect(page.getByLabel("Topik pembuka", { exact: true })).toHaveValue(
    grade === 7 ? "D1" : /^A/,
  );
}
for (const width of [360, 390])
  test(`EASY01 ${width}: one click starts prepared session; frozen topic creates editable copy and keeps history`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 844 });
    const errors: string[] = [],
      aiCalls: string[] = [];
    page.on("pageerror", () => errors.push("runtime"));
    page.on("request", (request) => {
      if (request.url().includes("/api/v1/llm/") && request.method() === "POST")
        aiCalls.push("AI");
    });
    await createDemo(page);
    await expect(
      page.getByRole("button", { name: "Buat latihan baru", exact: true }),
    ).toBeHidden();
    await expect(page.getByLabel("Materi paket", { exact: true })).toBeHidden();
    await expect(page.locator("#teacher-extras")).not.toHaveAttribute(
      "open",
      "",
    );
    await expect(page.locator("#teacher-oral > summary")).toBeHidden();
    const pdfReady = page.waitForEvent("download");
    await page
      .getByRole("button", {
        name: "Unduh Kartu Nalar · 10 baris",
        exact: true,
      })
      .click();
    const download = await pdfReady;
    expect(download.suggestedFilename()).toBe("papannalar-initial-A4.pdf");
    const pdf = await PDFDocument.load(
      await readFile((await download.path())!),
    );
    expect(pdf.getPageCount()).toBe(1);
    expect(pdf.getPage(0).getWidth()).toBeCloseTo((210 * 72) / 25.4, 4);
    expect(pdf.getPage(0).getHeight()).toBeCloseTo((297 * 72) / 25.4, 4);
    await expect(
      page.getByRole("region", { name: "Paket Sesi", exact: true }),
    ).toContainText("3 siswa: cetak 2 lembar A4");
    const prepared = await readLocalPackage(page);
    await page
      .getByRole("button", { name: "Mulai mengajar", exact: true })
      .click();
    await expect(page.getByTestId("cycle-status")).toContainText("Sesi 1");
    const frozen = await readLocalPackage(page);
    expect(frozen.id).toBe(prepared.id);
    expect(frozen.frozen).toBe(true);
    await page
      .getByText("Periksa persiapan atau ganti kelas", { exact: true })
      .click();
    await page
      .getByRole("button", { name: "Buka langkah 2: Soal", exact: true })
      .click();
    const topic = page.getByLabel("Topik pembuka", { exact: true });
    await expect(topic).toBeEnabled();
    await expect(page.locator("#opening-copy-notice")).toBeVisible();
    await topic.selectOption("C3");
    await expect(
      page.getByRole("region", {
        name: "Pertanyaan pembuka diskusi",
        exact: true,
      }),
    ).toContainText("2/3 gelas");
    const copy = await readLocalPackage(page);
    expect(copy.id).not.toBe(frozen.id);
    expect(copy.frozen).toBe(false);
    expect(copy.assessment).toEqual(frozen.assessment);
    expect(copy.activities).toEqual(frozen.activities);
    expect(await readLocalPackage(page, frozen.id)).toEqual(frozen);
    expect(copy.reviewNotice).toBe("NEEDS_REVIEW");
    await page
      .getByRole("button", { name: "Lanjutkan sesi", exact: true })
      .click();
    await expect(page.getByTestId("cycle-status")).toContainText("Sesi 1");
    expect(aiCalls).toEqual([]);
    expect(errors).toEqual([]);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
  });

test("EASY02 local preparation persists offline, resets on content edits and never changes content approval", async ({
  page,
  context,
}) => {
  await createDemo(page);
  const details = page.getByLabel("Pemeriksaan materi", { exact: true });
  await details.locator(":scope > summary").click();
  const checkboxes = details.getByRole("checkbox");
  await expect(checkboxes.first()).toBeEnabled();
  for (const checkbox of await checkboxes.all()) {
    await checkbox.check();
    await expect(checkbox).toBeEnabled();
  }
  await expect(details).toContainText("pemeriksaan Anda selesai");
  await expect(details).toContainText("bukan persetujuan peninjau materi");
  const source = await readLocalPackage(page);
  expect(source.status).toBe("draft");
  expect(source.reviewNotice).toBe("NEEDS_REVIEW");
  await injectFixture(page);
  await waitForShellCache(page);
  await context.setOffline(true);
  await page.reload();
  await expect(
    page.getByText(/Tentang materi ini.*pemeriksaan Anda selesai/),
  ).toBeVisible();
  await page.getByLabel("Topik pembuka", { exact: true }).selectOption("C3");
  await expect(
    page.getByText(/Tentang materi ini.*0\/3 diperiksa/),
  ).toBeVisible();
  expect((await readLocalPackage(page)).reviewNotice).toBe("NEEDS_REVIEW");
  await context.setOffline(false);
});

test("EASY03 oral checks need no printed answer card", async ({ page }) => {
  await createDemo(page, 2);
  await page.getByText("Siapkan soal lain", { exact: true }).click();
  await page.getByLabel("Jenis paket", { exact: true }).selectOption("oral");
  await page
    .getByRole("button", { name: "Buat latihan baru", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "Paket Sesi", exact: true }),
  ).toContainText("Tidak perlu mencetak Kartu Nalar untuk cek ini");
  await expect(
    page.getByRole("button", { name: /Unduh Kartu Nalar/ }),
  ).toHaveCount(0);
});

for (const offline of [false, true])
  test(`RESET ${offline ? "offline/reload" : "lost response"}: old board escapes, history remains and fresh session pairs`, async ({
    page,
    browser,
  }) => {
    test.setTimeout(90000);
    await loginTeacher(page);
    const classId = crypto.randomUUID();
    expect(
      (
        await call(page, "/api/v1/classes", {
          id: classId,
          label: "7R",
          grade: 7,
          count: 3,
          mode: "pilot",
        })
      ).ok(),
    ).toBe(true);
    const document = {
      title: "Tulis gerak",
      kind: "interactive",
      items: [
        {
          id: crypto.randomUUID(),
          kind: "writing",
          prompt: "Tulis gerak dari −1 ke 3.",
        },
      ],
    };
    const collection = await (
      await call(page, "/api/v1/library", {
        action: "save",
        id: crypto.randomUUID(),
        revision: 0,
        ready: true,
        document,
      })
    ).json();
    async function startRun() {
      const response = await call(page, "/api/v1/library", {
        action: "start",
        id: crypto.randomUUID(),
        classId,
        collectionId: collection.id,
        version: collection.version,
        date: "2026-10-03",
        mode: "teach",
      });
      expect(response.ok()).toBe(true);
      return response.json();
    }
    const run = await startRun();
    const context = await browser.newContext({
      baseURL: origin,
      viewport: { width: 1366, height: 768 },
    });
    const board = await context.newPage();
    const boardErrors: string[] = [];
    board.on("pageerror", () => boardErrors.push("runtime"));
    try {
      await openBoard(board);
      await expect(board.getByTestId("pairing-code")).toBeVisible();
      const code = (
        await board.getByTestId("pairing-code").innerText()
      ).replace(/\s/g, "");
      const payload = {
        schemaVersion: 1,
        mode: "opening",
        question: 1,
        taskEpoch: crypto.randomUUID(),
        groups: [],
      };
      const first = await (
        await call(page, "/api/v1/pairing", {
          action: "claim",
          code,
          classId,
          sessionId: run.id,
          payload,
        })
      ).json();
      await expect(board.getByTestId("library-board")).toBeVisible();
      const canvas = board.getByLabel("Bidang tulis sementara");
      await expect(canvas).toBeVisible();
      const undo = board.getByRole("button", {
        name: "Urungkan goresan",
        exact: true,
      });
      await expect(undo).toBeDisabled();
      const area = await canvas.boundingBox();
      expect(area).not.toBeNull();
      await board.mouse.move(area!.x + 30, area!.y + 30);
      await board.mouse.down();
      await board.mouse.move(area!.x + 80, area!.y + 60, { steps: 5 });
      await board.mouse.up();
      await expect(undo).toBeEnabled();
      await board.locator(".board-menu > summary").click();
      const reset = board.getByRole("button", {
        name: "Reset sesi di papan",
        exact: true,
      });
      board.on("dialog", (dialog) => void dialog.accept());
      let failedResetId: string | undefined;
      if (offline) {
        await injectFixture(board);
        await waitForShellCache(board);
        await context.setOffline(true);
      } else {
        await board.route("**/api/v1/board/pairing", async (route) => {
          const input = route.request().postDataJSON();
          if (input.action !== "reset" || failedResetId)
            return route.continue();
          failedResetId = input.resetId;
          const actual = await route.fetch();
          expect(actual.ok()).toBe(true);
          await route.fulfill({ status: 503, json: {} });
        });
      }
      await reset.click();
      await expect(board.getByTestId("library-board")).toHaveCount(0);
      await expect(board.getByTestId("pairing-code")).toHaveCount(0);
      await expect(
        board.getByRole("status").filter({
          hasText: offline
            ? "Sambungkan internet agar sesi lama diputus"
            : "Sambungan lama belum dapat diputus",
        }),
      ).toBeVisible();
      expect(
        await board.evaluate(() =>
          localStorage.getItem("pn-board-reset-pending-v1"),
        ),
      ).toBeTruthy();
      await board.reload();
      await expect(board.getByTestId("library-board")).toHaveCount(0);
      if (offline) await context.setOffline(false);
      await expect(board.getByTestId("pairing-code")).toBeVisible({
        timeout: 20000,
      });
      expect(
        await board.evaluate(() =>
          localStorage.getItem("pn-board-reset-pending-v1"),
        ),
      ).toBeNull();
      expect(
        (
          await call(page, "/api/v1/pairing", {
            action: "snapshot",
            presentationId: first.envelope.presentationId,
          })
        ).status(),
      ).toBe(403);
      const detail = await (
        await call(page, "/api/v1/library", { action: "detail", id: run.id })
      ).json();
      expect(detail.run.status).toBe("active");
      expect(detail.run.document).toEqual(document);
      const next = await startRun();
      expect(next.id).not.toBe(run.id);
      const newCode = (
        await board.getByTestId("pairing-code").innerText()
      ).replace(/\s/g, "");
      const claim = await call(page, "/api/v1/pairing", {
        action: "claim",
        code: newCode,
        classId,
        sessionId: next.id,
        payload: { ...payload, taskEpoch: crypto.randomUUID() },
      });
      expect(claim.ok()).toBe(true);
      expect((await claim.json()).envelope.presentationId).not.toBe(
        first.envelope.presentationId,
      );
      await expect(board.getByTestId("library-board")).toBeVisible();
      await expect(undo).toBeDisabled();
      expect(boardErrors).toEqual([]);
    } finally {
      await context.close();
    }
  });

test("AUTHOR: ready save returns to own list, own cards appear in assessment and interactive copy requires real answers", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await loginTeacher(page);
  const classId = crypto.randomUUID();
  expect(
    (
      await call(page, "/api/v1/classes", {
        id: classId,
        label: "7A",
        grade: 7,
        count: 3,
        mode: "pilot",
      })
    ).ok(),
  ).toBe(true);
  const interactive = {
    title: "Gerak lift",
    kind: "interactive",
    items: [
      {
        id: crypto.randomUUID(),
        kind: "writing",
        prompt: "Lift naik dari −1 ke 3.",
      },
    ],
  };
  const original = await (
    await call(page, "/api/v1/library", {
      action: "save",
      id: crypto.randomUUID(),
      revision: 0,
      ready: true,
      document: interactive,
    })
  ).json();
  await page.goto(`/guru/mulai?class=${classId}&mode=assessment`);
  const choices = page.getByRole("combobox", {
    name: "Kumpulan soal",
    exact: true,
  });
  await expect(choices.locator(`option[value="${original.id}"]`)).toHaveCount(
    0,
  );
  await page.getByText(/Soal saya belum muncul/).click();
  await page
    .getByRole("link", { name: "Buat versi untuk Kartu Nalar", exact: true })
    .click();
  await expect(
    page.getByRole("textbox", { name: "Pertanyaan", exact: true }),
  ).toHaveValue(interactive.items[0].prompt);
  await expect(page.getByLabel("Pilihan A", { exact: true })).toBeEmpty();
  await page
    .getByRole("button", { name: "Simpan & siap digunakan", exact: true })
    .click();
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "Draft tersimpan. Lengkapi isian" }),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/guru\/soal\/[a-f0-9-]{36}$/);
  for (const [index, choice] of ["A", "B", "C", "D"].entries())
    await page
      .getByLabel(`Pilihan ${choice}`, { exact: true })
      .fill(String(index + 1));
  await page
    .getByRole("combobox", { name: "Kunci jawaban", exact: true })
    .selectOption("D");
  await page.route("**/api/v1/library", (route) =>
    route.request().postDataJSON()?.action === "save"
      ? route.fulfill({ status: 503, json: {} })
      : route.continue(),
  );
  const draftUrl = page.url();
  await page
    .getByRole("button", { name: "Simpan & siap digunakan", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Belum tersimpan" }),
  ).toBeVisible();
  await expect(page).toHaveURL(draftUrl);
  await expect(
    page.getByRole("combobox", { name: "Kunci jawaban", exact: true }),
  ).toHaveValue("D");
  await page.unroute("**/api/v1/library");
  await page
    .getByRole("button", { name: "Simpan & siap digunakan", exact: true })
    .click();
  await expect(page).toHaveURL(/\/guru\/soal\?tab=teacher&saved=/);
  const copyId = new URL(page.url()).searchParams.get("saved")!;
  await expect(
    page.getByRole("button", { name: "Soal Saya", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "Kumpulan tersimpan dan siap digunakan" }),
  ).toBeVisible();
  const state = await (
    await call(page, "/api/v1/library", { action: "list" })
  ).json();
  expect(
    state.collections.find((c: { id: string }) => c.id === original.id),
  ).toEqual(original);
  expect(copyId).not.toBe(original.id);
  expect(
    state.collections.find((c: { id: string }) => c.id === copyId),
  ).toMatchObject({ status: "ready", document: { kind: "cards" } });
  await page.goto(`/guru/mulai?class=${classId}&mode=assessment`);
  await expect(choices.locator(`option[value="${copyId}"]`)).toHaveText(
    "Gerak lift · Kartu Nalar",
  );
  await expect(page.getByRole("group", { name: "Sumber soal" })).toHaveCount(0);
  await choices.selectOption(copyId);
  await page
    .getByRole("button", { name: "Simpan & mulai asesmen", exact: true })
    .click();
  await expect(page).toHaveURL(/\/guru\/sesi\//);
  await expect(
    page.getByRole("button", { name: "Cetak kartu asesmen", exact: true }),
  ).toBeVisible();
});
