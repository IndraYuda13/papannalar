import type { LibraryAction } from "../../src/contracts/library";
import { test, expect, type Page } from "@playwright/test";
import { classListSchema } from "../../src/contracts/classes";
import {
  libraryStateSchema,
  runSchema,
  runDetailSchema,
} from "../../src/contracts/library";
import { injectFixture } from "../browser/helpers";
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
  await page
    .getByRole("button", { name: "Coba dengan data contoh", exact: true })
    .click();
  await expect(page).toHaveURL(/\/guru$/);
  expect(
    (
      await page.request.post("/api/v1/sample/control", {
        headers: { Origin: origin },
        data: { takeover: true },
      })
    ).ok(),
  ).toBe(true);
  const classes = classListSchema.parse(
    await (await page.request.get("/api/v1/classes?mode=demo")).json(),
  );
  return classes.classes.find((c) => c.label === "7B")!;
}
async function assessment(page: Page) {
  const cls = await sample(page);
  const state = libraryStateSchema.parse(await call(page, { action: "list" }));
  const source = state.collections.find(
    (c) => c.document.kind === "cards" && c.status === "ready",
  )!;
  const id = crypto.randomUUID();
  const collection = await call(page, {
    action: "save",
    id,
    revision: 0,
    ready: true,
    document: { ...source.document, title: "Latihan QA alur" },
  });
  const run = runSchema.parse(
    await call(page, {
      action: "start",
      id: crypto.randomUUID(),
      classId: cls.id,
      collectionId: id,
      version: collection.version,
      date: "2026-10-01",
      mode: "assessment",
    }),
  );
  return run;
}

test("FLOW08 an unfinished answer remains a draft after reload, never becomes unknown answers or a submitted score", async ({
  page,
}) => {
  const run = await assessment(page);
  await page.goto(`/guru/sesi/${run.id}`);
  await page.getByRole("button", { name: "Input manual", exact: true }).click();
  await expect(page.getByLabel("Baris 1", { exact: true })).toHaveValue("");
  await page.getByLabel("Baris 1", { exact: true }).selectOption("C");
  await injectFixture(page);
  await expect
    .poll(() =>
      page.evaluate(async (id) => {
        const f = window.__privacyFixture;
        const access = await f.readLocalAccess();
        return (
          await f.libraryCache(
            { ownerId: access!.id, mode: "demo" },
            "answerDraft",
            id,
          )
        )?.answers[0];
      }, run.id),
    )
    .toBe("C");
  page.once("dialog", (dialog) => dialog.accept());
  await page.reload();
  await expect(page.getByLabel("Baris 1", { exact: true })).toHaveValue("C");
  await expect(page.getByLabel("Baris 2", { exact: true })).toHaveValue("");
  expect(
    runDetailSchema.parse(await call(page, { action: "detail", id: run.id }))
      .responses,
  ).toHaveLength(0);
  await page.getByRole("button", { name: "Batal", exact: true }).click();
  await page.getByRole("button", { name: "Input manual", exact: true }).click();
  await expect(page.getByLabel("Baris 1", { exact: true })).toHaveValue("");
});
test("FLOW01 filled example and fresh practice coexist; repeated start resumes, without changing 29 example answers", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const cls = await sample(page);
  await page.goto(`/guru/simulasi?mode=demo&class=${cls.id}`);
  await page
    .getByRole("button", { name: "Jalankan contoh sesi", exact: true })
    .click();
  await expect(page.getByTestId("scan-count")).toContainText("29/32");
  await page.goto(`/guru/latihan?mode=demo&class=${cls.id}`);
  await page.getByRole("button", { name: "Siapkan soal", exact: true }).click();
  await page
    .getByRole("button", { name: "Mulai mengajar", exact: true })
    .click();
  await expect(page.getByTestId("cycle-status")).toContainText("Sesi 1");
  await expect(page.getByTestId("cycle-scan-count")).toContainText("0/32");
  await injectFixture(page);
  const count = await page.evaluate(async (classId) => {
    const access = await window.__privacyFixture.readLocalAccess();
    const repo = window.__privacyFixture.createCycleRepository({
      ownerId: access!.id,
      mode: "demo",
    });
    try {
      const before = await repo.list(classId);
      const data = await repo.read(before[0].id);
      const retry = await repo.start({
        id: crypto.randomUUID(),
        packageId: data.package.id,
        classroom: data.parent.context.classroom,
        students: data.parent.context.roster.map((s) => ({
          schemaVersion: 1,
          id: s.id,
          classId,
          attendanceNumber: s.attendanceNumber,
          active: true,
        })),
      });
      return {
        size: (await repo.list(classId)).length,
        same: retry.id === before[0].id,
        history: (await repo.history(classId)).map(
          (b) => b.context.session.sessionId,
        ),
      };
    } finally {
      repo.close();
    }
  }, cls.id);
  expect(count.size).toBe(1);
  expect(count.same).toBe(true);
  expect(new Set(count.history).size).toBe(1);
  await page.goto(`/guru/simulasi?mode=demo&class=${cls.id}`);
  await expect(page.getByTestId("scan-count")).toContainText("29/32");
});
test("FLOW02 manual correction preserves first/middle/last answers; cancel/reopen, failed save and finish lead to results", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 800 });
  const run = await assessment(page);
  const answers = run.document.items.map(
    (_, i) => ["A", "C", "D", "B", "C"][i],
  );
  for (const i of [0, 15, 31])
    await call(page, {
      action: "response",
      id: run.id,
      formId: run.formId,
      pageIndex: 0,
      version: run.version,
      studentId: run.roster[i].id,
      answers,
      revision: 0,
      status: "review",
    });
  await page.goto(`/guru/sesi/${run.id}`);
  await page.getByRole("button", { name: /Input manual/ }).click();
  for (const i of [0, 15, 31]) {
    await page
      .getByLabel("Nomor absen", { exact: true })
      .selectOption(String(run.roster[i].attendanceNumber));
    for (let row = 0; row < answers.length; row++)
      await expect(
        page.getByLabel(`Baris ${row + 1}`, { exact: true }),
      ).toHaveValue(answers[row]);
    await expect(
      page.getByLabel("Masih perlu dicek", { exact: true }),
    ).toBeChecked();
  }
  await page.getByLabel("Baris 1", { exact: true }).selectOption("B");
  await page.getByRole("button", { name: "Batal", exact: true }).click();
  await page.getByRole("button", { name: /Input manual/ }).click();
  await expect(page.getByLabel("Baris 1", { exact: true })).toHaveValue("A");
  await page.getByLabel("Baris 1", { exact: true }).selectOption("B");
  await page.route("**/api/v1/library", async (route) =>
    route.request().postDataJSON()?.action === "response"
      ? route.fulfill({ status: 503, body: "{}" })
      : route.continue(),
  );
  await page
    .getByRole("button", { name: "Simpan jawaban", exact: true })
    .click();
  await expect(page.getByLabel("Baris 1", { exact: true })).toHaveValue("B");
  await expect(
    page.getByText(
      "Jawaban belum tersimpan. Periksa sambungan dan coba kembali.",
      { exact: true },
    ),
  ).toBeVisible();
  await page.unroute("**/api/v1/library");
  await page
    .getByRole("button", { name: "Simpan jawaban", exact: true })
    .click();
  await expect(page.getByLabel("Baris 1", { exact: true })).toBeHidden();
  const stored = runDetailSchema.parse(
    await call(page, { action: "detail", id: run.id }),
  );
  expect(
    stored.responses.find((r) => r.studentId === run.roster[31].id)?.answers,
  ).toEqual(["B", ...answers.slice(1)]);
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Akhiri sesi", exact: true }).click();
  await expect(page).toHaveURL(`/guru/hasil/${run.id}`);
  await page.getByRole("button", { name: /32.*Perlu dicek/ }).click();
  await expect(
    page.getByRole("region", { name: "Rincian jawaban", exact: true }),
  ).toBeInViewport();
});
test("FLOW03 session date is explicit, preview uses one question, and cached 503 never bypasses 403", async ({
  page,
}) => {
  const run = await assessment(page);
  await page.goto(
    `/guru/mulai?mode=assessment&class=${run.classId}&collection=${run.collectionId}`,
  );
  await expect(
    page.getByText(/Sesi 01\/10\/2026 masih berjalan pada soal/),
  ).toBeVisible();
  await page
    .getByText("Sesi 01/10/2026 masih berjalan", { exact: true })
    .click();
  await expect(page.getByLabel("Tanggal", { exact: true })).toBeDisabled();
  await page
    .getByRole("button", { name: "Preview materi", exact: true })
    .click();
  await expect(page.locator("[data-library-preview]")).toHaveCount(1);
  await page
    .getByRole("button", { name: "Lanjutkan sesi", exact: true })
    .click();
  await expect(page).toHaveURL(`/guru/sesi/${run.id}`);
  await expect(
    page.getByRole("heading", { name: run.document.title, exact: true }),
  ).toBeVisible();
  await page.route("**/api/v1/library", async (route) =>
    route.request().postDataJSON()?.action === "detail"
      ? route.fulfill({ status: 503, body: "{}" })
      : route.continue(),
  );
  await page.reload();
  await expect(
    page.getByRole("heading", { name: run.document.title, exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "Sambungan terganggu. Menampilkan jawaban yang tersimpan di perangkat ini.",
      { exact: true },
    ),
  ).toBeVisible();
  await page.unroute("**/api/v1/library");
  await page.route("**/api/v1/library", async (route) =>
    route.request().postDataJSON()?.action === "detail"
      ? route.fulfill({ status: 403, body: "{}" })
      : route.continue(),
  );
  await page.reload();
  await expect(
    page.getByRole("heading", { name: run.document.title, exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Coba lagi", exact: true }),
  ).toBeVisible();
});
test("FLOW04 student editor opens inline with focus; collection draft survives back/reload and deletion has undo", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const cls = await sample(page);
  await page.goto(`/guru/kelas/${cls.id}`);
  for (const n of [0, 15, 31]) {
    await page
      .getByRole("button", { name: "Edit", exact: true })
      .nth(n)
      .click();
    const editor = page.getByRole("form", {
      name: `Edit siswa absen ${n + 1}`,
    });
    await expect(
      editor.getByLabel("Nomor absen", { exact: true }),
    ).toBeFocused();
    await expect(
      editor.getByLabel("Nomor absen", { exact: true }),
    ).toBeInViewport();
    await editor.getByRole("button", { name: "Batal", exact: true }).click();
  }
  await page.goto("/guru/soal/baru");
  await page
    .getByLabel("Nama kumpulan", { exact: true })
    .fill("Draft alur guru");
  await page.getByRole("button", { name: "Tambah soal", exact: true }).click();
  await page
    .getByLabel("Pertanyaan", { exact: true })
    .fill("Berapa hasil 2 + 3?");
  await expect(
    page.getByText("Draft tersimpan di perangkat ini.", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Pertanyaan", { exact: true })).toHaveValue(
    "Berapa hasil 2 + 3?",
  );
  await page.getByRole("button", { name: "Hapus soal 1", exact: true }).click();
  await page
    .getByRole("button", { name: "Batalkan penghapusan", exact: true })
    .click();
  await expect(page.getByLabel("Pertanyaan", { exact: true })).toHaveValue(
    "Berapa hasil 2 + 3?",
  );
});
test("FLOW05 first-use board shows pairing without setup; appearance cancel preserves pairing", async ({
  page,
}) => {
  await page.goto("/layar");
  await expect(page.getByTestId("pairing-code")).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Tes Kemampuan Papan", exact: true }),
  ).toHaveCount(0);
  const code = await page.getByTestId("pairing-code").innerText();
  await page
    .getByRole("button", { name: "Ubah tampilan", exact: true })
    .click();
  await page.getByRole("button", { name: "Batal", exact: true }).click();
  await expect(page.getByTestId("pairing-code")).toHaveText(code);
});

test("FLOW06 a conflicting answer never blocks another student; in-flight edits keep their newest values and require an explicit conflict choice", async ({
  page,
}) => {
  const run = await assessment(page);
  const answers = run.document.items.map(() => "A" as const);
  const first = {
    action: "response" as const,
    id: run.id,
    formId: run.formId,
    pageIndex: 0 as const,
    version: run.version,
    studentId: run.roster[0].id,
    answers,
    revision: 0,
    status: "received" as const,
  };
  await call(page, first);
  await page.goto(`/guru/sesi/${run.id}`);
  await expect(
    page.getByRole("heading", { name: run.document.title, exact: true }),
  ).toBeVisible();
  await injectFixture(page);
  const result = await page.evaluate(
    async ({ first, second }) => {
      const f = window.__privacyFixture;
      const scope = {
        ownerId: (await f.readLocalAccess())!.id,
        mode: "demo" as const,
      };
      await f.queueLibraryResponse(scope, {
        ...first,
        answers: first.answers.map(() => "B"),
      });
      await f.queueLibraryResponse(scope, {
        ...first,
        studentId: second,
        answers: first.answers.map(() => "C"),
      });
      const accepted = await f.syncLibraryResponses(scope, async (action) => {
        const response = await fetch("/api/v1/library", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(action),
        });
        if (!response.ok)
          throw new Error(
            response.status === 409 ? "CONFLICT" : "REQUEST_FAILED",
          );
        return response.json();
      });
      return {
        accepted,
        pending: await f.pendingLibraryResponses(scope),
        conflicts: await f.libraryResponseConflicts(scope),
      };
    },
    { first, second: run.roster[1].id },
  );
  expect(result.accepted).toBe(1);
  expect(result.pending).toHaveLength(1);
  expect(result.conflicts).toHaveLength(1);
  const region = page.getByRole("region", {
    name: "Bandingkan jawaban",
    exact: true,
  });
  await expect(region).toBeVisible();
  await expect(
    region.getByRole("heading", { name: "Absen 1", exact: true }),
  ).toBeVisible();
  await expect(region).toContainText(
    `Di perangkat ini: ${answers.map(() => "B").join(" · ")}`,
  );
  await region
    .getByRole("button", {
      name: "Gunakan jawaban yang sudah tersimpan",
      exact: true,
    })
    .click();
  await expect(region).toBeHidden();
  const race = await page.evaluate(
    async ({ first, third }) => {
      const f = window.__privacyFixture;
      const scope = {
        ownerId: (await f.readLocalAccess())!.id,
        mode: "demo" as const,
      };
      const initial = { ...first, studentId: third };
      await f.queueLibraryResponse(scope, initial);
      const send = async (
        action: Extract<LibraryAction, { action: "response" }>,
      ) => {
        const response = await fetch("/api/v1/library", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(action),
        });
        if (!response.ok) throw new Error("REQUEST_FAILED");
        return response.json();
      };
      await f.syncLibraryResponses(scope, async (action) => {
        if (action.action !== "response") throw new Error("Unexpected action");
        await f.queueLibraryResponse(scope, {
          ...initial,
          answers: initial.answers.map(() => "D"),
        });
        return send(action);
      });
      const pending = await f.pendingLibraryResponses(scope);
      const projected = await f.libraryCache(scope, "detail", first.id);
      await f.syncLibraryResponses(scope, async (action) => {
        if (action.action !== "response") throw new Error("Unexpected action");
        return send(action);
      });
      return {
        pending,
        visible: projected?.responses.find((r) => r.studentId === third)
          ?.answers,
        remaining: await f.pendingLibraryResponses(scope),
      };
    },
    { first, third: run.roster[2].id },
  );
  expect(race.pending).toHaveLength(1);
  expect(race.pending[0].revision).toBe(1);
  expect(race.visible).toEqual(answers.map(() => "D"));
  expect(race.remaining).toHaveLength(0);
  const detail = runDetailSchema.parse(
    await call(page, { action: "detail", id: run.id }),
  );
  expect(
    detail.responses.find((r) => r.studentId === run.roster[0].id)?.answers,
  ).toEqual(answers);
  expect(
    detail.responses.find((r) => r.studentId === run.roster[1].id)?.answers,
  ).toEqual(answers.map(() => "C"));
  expect(
    detail.responses.find((r) => r.studentId === run.roster[2].id)?.answers,
  ).toEqual(answers.map(() => "D"));
});

test("FLOW07 read-only sample control disables changes while keeping preview available", async ({
  page,
  browser,
}) => {
  const run = await assessment(page);
  const other = await browser.newContext({ baseURL: origin });
  try {
    await sample(await other.newPage());
    await page.goto(`/guru/sesi/${run.id}`);
    await expect(
      page
        .getByRole("alert")
        .filter({ hasText: "Data contoh sedang dikendalikan perangkat lain" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Akhiri sesi", exact: true }),
    ).toBeDisabled();
    await expect(
      page.getByRole("button", { name: "Soal berikutnya", exact: true }),
    ).toBeDisabled();
    await expect(
      page.getByRole("button", { name: "Input manual", exact: true }),
    ).toBeDisabled();
    await expect(
      page.getByRole("button", { name: "Preview papan", exact: true }),
    ).toBeEnabled();
  } finally {
    await other.close();
  }
});
