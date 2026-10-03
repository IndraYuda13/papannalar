import { test, expect, type Page } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { loginTeacher, openBoard } from "../browser/helpers";
import { fromPackageRecipe } from "../../src/contracts/sync-package";
import type { TeacherPackage } from "../../src/core/package/build";
const origin = "http://127.0.0.1:3100";
async function savedPackage(page: Page): Promise<TeacherPackage> {
  return page.evaluate(async () => {
    const database = (await indexedDB.databases()).find((d) =>
      d.name?.startsWith("pn-data:demo:"),
    );
    if (!database?.name) throw new Error("Package database unavailable");
    const classId = new URL(location.href).searchParams.get("class");
    return new Promise((resolve, reject) => {
      const opened = indexedDB.open(database.name!);
      opened.onerror = () => reject(new Error("Package database unavailable"));
      opened.onsuccess = () => {
        const db = opened.result;
        const transaction = db.transaction(["localMeta", "packages"]);
        const pointer = transaction
          .objectStore("localMeta")
          .get(`package:class:${classId}`);
        pointer.onsuccess = () => {
          const read = transaction
            .objectStore("packages")
            .get(pointer.result.value);
          read.onsuccess = () => resolve(read.result);
        };
        transaction.oncomplete = () => db.close();
        transaction.onerror = () => {
          db.close();
          reject(new Error("Package read failed"));
        };
      };
    });
  });
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
  await page
    .getByRole("navigation", { name: "Menu utama" })
    .getByRole("link", { name: "Latihan & AI", exact: true })
    .click();
}
for (const width of [360, 390, 1366])
  test(`PRACTICE01 ${width}: preview is reversible, selected stories persist in tasks/PDF, one session uses that package`, async ({
    page,
  }) => {
    test.setTimeout(90000);
    await page.setViewportSize({ width, height: 844 });
    const errors: string[] = [];
    page.on("pageerror", () => errors.push("runtime"));
    await loginTeacher(page, { guided: true });
    await page.getByLabel("Gunakan kelas").selectOption("demo");
    await page.getByRole("button", { name: "Buat kelas", exact: true }).click();
    await page.getByLabel("Nama kelas", { exact: true }).fill("7UI");
    await page.getByLabel("Jumlah siswa", { exact: true }).fill("3");
    await page
      .getByRole("button", { name: "Simpan kelas", exact: true })
      .click();
    const prepare = page.getByRole("button", {
      name: "Siapkan soal",
      exact: true,
    });
    const box = await prepare.boundingBox();
    expect(box?.height).toBe(48);
    expect(box?.width).toBeLessThan(250);
    await prepare.click();
    await expect(page.getByLabel("Topik pembuka", { exact: true })).toHaveValue(
      "D1",
    );
    const original = await savedPackage(page);
    await page.getByLabel("Topik pembuka", { exact: true }).selectOption("C3");
    await expect(
      page.getByRole("region", {
        name: "Pertanyaan pembuka diskusi",
        exact: true,
      }),
    ).toContainText("2/3 gelas");
    const updatedOpening = await savedPackage(page);
    expect(updatedOpening.assessment).toEqual(original.assessment);
    expect(updatedOpening.activities).toEqual(original.activities);
    await page
      .getByRole("button", { name: "Tambahkan cerita AI", exact: true })
      .click();
    await expect(page.locator("#teacher-prepare")).not.toHaveAttribute(
      "open",
      "",
    );
    await expect(page.locator("#teacher-teach")).not.toHaveAttribute(
      "open",
      "",
    );
    await expect(page.locator("#teacher-ai")).toContainText(
      "tugas mandiri dan PDF",
    );
    await expect(
      page.getByRole("button", {
        name: "Mulai sesi untuk meminta saran AI",
        exact: true,
      }),
    ).toBeVisible();
    // UI-only synthetic response. Native provider/ledger behavior is covered by
    // real loopback HTTP + PostgreSQL integration tests, never a paid/live call.
    const inputs: { stepId: string; context?: string }[] = [];
    await page.route("**/api/v1/llm/enrich", async (route) => {
      const input = route.request().postDataJSON();
      inputs.push({ stepId: input.stepId, context: input.context });
      const pkg = fromPackageRecipe(input.recipe, false);
      const activity = pkg.activities.find((a) => a.stepId === input.stepId)!;
      await route.fulfill({
        json: {
          requestId: input.requestId,
          packageId: pkg.id,
          revision: pkg.revision,
          status: "ai",
          reason: "none",
          durationMs: 1,
          stories: activity.independent.map((q, i) => ({
            questionId: q.id,
            choice: {
              frameId:
                input.context ??
                ["lift-down-v1", "temperature-drop-v1", "diver-down-v1"][i],
              variant: 0,
            },
          })),
        },
      });
    });
    await page
      .getByRole("button", { name: "Buat pilihan cerita", exact: true })
      .click();
    const comparison = page.getByRole("region", {
      name: "Bandingkan pilihan cerita",
      exact: true,
    });
    await expect(comparison.locator("article")).toHaveCount(3);
    await expect(comparison).toContainText("Perubahan suhu");
    await expect(comparison).toContainText("Kedalaman laut");
    expect(await savedPackage(page)).toEqual(updatedOpening);
    await page
      .getByRole("button", {
        name: "Batal · pertahankan soal semula",
        exact: true,
      })
      .click();
    expect(await savedPackage(page)).toEqual(updatedOpening);
    await page
      .getByLabel("Tema cerita", { exact: true })
      .selectOption("temperature-drop-v1");
    await page
      .getByRole("button", { name: "Buat pilihan cerita", exact: true })
      .click();
    await expect(comparison.locator("article")).toHaveCount(3);
    await comparison.getByRole("checkbox").nth(1).uncheck();
    await comparison.getByRole("checkbox").nth(2).uncheck();
    await page
      .getByRole("button", { name: "Simpan 1 soal cerita", exact: true })
      .click();
    await expect(
      page.getByLabel("Cerita Paket Sesi", { exact: true }),
    ).toContainText("1 soal cerita tersimpan");
    const saved = await savedPackage(page);
    expect(saved.assessment).toEqual(updatedOpening.assessment);
    expect(saved.opening).toEqual(updatedOpening.opening);
    expect(
      saved.activities.flatMap((a) => a.independent).filter((q) => q.story),
    ).toHaveLength(1);
    saved.activities.forEach((a, i) =>
      a.independent.forEach((q, j) => {
        const before = updatedOpening.activities[i].independent[j];
        expect(q.params).toEqual(before.params);
        expect(q.options).toEqual(before.options);
        expect(q.answerKey).toBe(before.answerKey);
        expect(q.mathFingerprint).toBe(before.mathFingerprint);
      }),
    );
    await page
      .getByRole("button", {
        name: "Lihat tugas dengan cerita tersimpan",
        exact: true,
      })
      .click();
    await expect(page.locator("#teacher-ai")).not.toHaveAttribute("open", "");
    await expect(page.locator("#practice-independent")).toHaveAttribute(
      "open",
      "",
    );
    await expect(page.locator("#practice-independent > summary")).toBeFocused();
    await expect(page.locator("#practice-independent")).toContainText(
      "Suhu mula-mula",
    );
    const downloaded = page.waitForEvent("download");
    await page
      .getByRole("button", { name: "Unduh tugas mandiri PDF", exact: true })
      .click();
    expect((await downloaded).suggestedFilename()).toBe(
      "papannalar-tugas-mandiri.pdf",
    );
    await page
      .getByRole("button", { name: "Mulai mengajar", exact: true })
      .click();
    await expect(page.locator("#teacher-prepare")).not.toHaveAttribute(
      "open",
      "",
    );
    await expect(page.getByTestId("cycle-status")).toContainText("Sesi 1");
    expect((await savedPackage(page)).frozen).toBe(true);
    await expect(
      page.getByLabel("Topik pembuka", { exact: true }),
    ).toBeEnabled();
    await expect(page.getByLabel("Kode pasangan", { exact: true })).toHaveCount(
      1,
    );
    await expect(
      page.getByRole("button", { name: "Jalankan contoh sesi", exact: true }),
    ).toHaveCount(0);
    await page.locator("#teacher-teach > summary").click();
    await page.locator("#teacher-ai > summary").click();
    await expect(page.locator("#teacher-teach")).not.toHaveAttribute(
      "open",
      "",
    );
    await expect(
      page.getByRole("button", { name: "Minta saran AI", exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Minta saran AI", exact: true })
      .click();
    await expect(
      page.getByLabel("Kendali Bisik", { exact: true }),
    ).toContainText("Layanan AI belum diaktifkan");
    expect(inputs).toEqual([
      { stepId: "D1" },
      { stepId: "D1", context: "temperature-drop-v1" },
    ]);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect(errors).toEqual([]);
    await page.screenshot({
      path: test.info().outputPath(`practice-${width}.png`),
      fullPage: true,
    });
  });
test("PRACTICE02 correct code recovers an expired own sample lease; a different active controller is never taken over automatically", async ({
  page,
  browser,
}) => {
  test.setTimeout(90000);
  await sample(page);
  await page.getByRole("button", { name: "Siapkan soal", exact: true }).click();
  await page
    .getByRole("button", { name: "Mulai mengajar", exact: true })
    .click();
  const boardContext = await browser.newContext({
    baseURL: origin,
    viewport: { width: 1920, height: 1080 },
  });
  const board = await boardContext.newPage();
  await openBoard(board);
  const code = (await board.getByTestId("pairing-code").innerText()).replace(
    /\s/g,
    "",
  );
  let expired = false;
  await page.route("**/api/v1/pairing", (route) => {
    if (!expired && route.request().postDataJSON()?.action === "claim") {
      execFileSync(
        process.env.PSQL_BIN ?? "psql",
        [
          "postgresql://postgres@127.0.0.1:55432/pn_m01c_test",
          "-X",
          "-q",
          "-c",
          "update pn_private.sample_accounts set lease_until=now()-interval '1 second' where owner_id='7b000001-0000-4000-8000-000000000001'",
        ],
        { stdio: "ignore" },
      );
      expired = true;
    }
    return route.continue();
  });
  const claims: number[] = [];
  page.on("response", (r) => {
    if (
      r.url().endsWith("/api/v1/pairing") &&
      r.request().postDataJSON()?.action === "claim"
    )
      claims.push(r.status());
  });
  await page.getByLabel("Kode pasangan", { exact: true }).fill(code);
  await page
    .getByRole("button", { name: "Hubungkan papan", exact: true })
    .click();
  await expect(page.getByTestId("pairing-status")).toContainText(
    "Layar tersambung",
  );
  expect(claims).toEqual([409, 200]);
  await expect(page.getByLabel("Kode pasangan", { exact: true })).toHaveCount(
    0,
  );
  await expect(
    page.getByRole("button", { name: "Putuskan layar", exact: true }),
  ).toHaveCount(1);
  await page
    .getByRole("button", { name: "Putuskan layar", exact: true })
    .click();
  await expect(page.getByLabel("Kode pasangan", { exact: true })).toHaveCount(
    1,
  );
  const otherContext = await browser.newContext({ baseURL: origin });
  const other = await otherContext.newPage();
  await other.goto("/masuk");
  await other
    .getByRole("button", { name: "Coba dengan data contoh", exact: true })
    .click();
  await expect(other).toHaveURL(/\/guru$/);
  expect(
    (
      await other.request.post("/api/v1/sample/control", {
        headers: { Origin: origin },
        data: { takeover: true },
      })
    ).ok(),
  ).toBe(true);
  const fresh = await (
    await board.request.post("/api/v1/board/pairing", {
      headers: { Origin: origin },
      data: { action: "create" },
    })
  ).json();
  const renewals: boolean[] = [];
  page.on("request", (r) => {
    if (r.url().endsWith("/api/v1/sample/control"))
      renewals.push(r.postDataJSON().takeover);
  });
  await page.getByLabel("Kode pasangan", { exact: true }).fill(fresh.code);
  await page
    .getByRole("button", { name: "Hubungkan papan", exact: true })
    .click();
  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: "Data contoh sedang dikendalikan perangkat lain" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Ambil alih kendali", exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Kode pasangan", { exact: true })).toHaveCount(
    1,
  );
  expect(claims).toEqual([409, 200, 409]);
  expect(renewals.length).toBeGreaterThan(0);
  expect(renewals.every((takeover) => takeover === false)).toBe(true);
  await otherContext.close();
  await boardContext.close();
});
