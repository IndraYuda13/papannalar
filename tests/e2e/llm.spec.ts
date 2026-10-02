import { openBoard } from "../browser/helpers";
import { expect, test } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { loginTeacher } from "../browser/helpers";
import { buildPackage } from "../../src/core/package/build";
import { toPackageRecipe } from "../../src/contracts/sync-package";
test.use({ trace: "off" });
test("LLM01 real teacher UI keeps name/raw question local, shows honest fallback, stores feedback and preserves board privacy", async ({
  page,
  browser,
}) => {
  test.setTimeout(90000);
  const errors: string[] = [],
    canary = "LOCAL_BISIK_CANARY";
  let leaked = false,
    llmCalls = 0;
  page.on("pageerror", () => errors.push("teacher-runtime"));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push("teacher-console");
  });
  page.on("request", (r) => {
    if ((r.url() + (r.postData() ?? "")).includes(canary)) leaked = true;
    if (r.method() === "POST" && r.url().includes("/api/v1/llm/")) llmCalls++;
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await loginTeacher(page);
  await page.getByLabel("Data kelas").selectOption("demo");
  await page.getByRole("button", { name: "Buat kelas", exact: true }).click();
  await page.getByLabel("Nama rombel", { exact: true }).fill("7V");
  await page.getByRole("button", { name: "Simpan kelas", exact: true }).click();
  await page.getByRole("button", { name: /Buka kelas 7V/ }).click();
  await page
    .getByRole("button", { name: "Siapkan Paket Sesi", exact: true })
    .click();
  const story = page.getByLabel("Cerita Paket Sesi", { exact: true });
  const storyStart = Date.now();
  await story
    .getByRole("button", { name: "Pratinjau cerita AI", exact: true })
    .click();
  await expect(story).toContainText("Cerita AI belum tersedia");
  const storyMs = Date.now() - storyStart;
  await page
    .getByText("Nama opsional · hanya perangkat ini", { exact: true })
    .click();
  await page
    .getByLabel("Nama atau panggilan lokal", { exact: true })
    .fill(canary);
  await page
    .getByRole("button", { name: "Simpan nama lokal", exact: true })
    .click();
  await expect(
    page.getByText("Nama lokal disimpan. Kosongkan isian untuk menghapusnya.", {
      exact: true,
    }),
  ).toBeVisible();
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
  await page
    .getByLabel("Kode pasangan", { exact: true })
    .fill(
      (await board.getByTestId("pairing-code").innerText()).replace(/\s/g, ""),
    );
  await page
    .getByRole("button", { name: "Hubungkan papan", exact: true })
    .click();
  await expect(page.getByTestId("pairing-status")).toContainText(
    "Layar tersambung",
  );
  const station = page.getByRole("region", {
    name: "Kendali Stasiun",
    exact: true,
  });
  await station
    .getByRole("button", { name: "Mulai rotasi", exact: true })
    .click();
  const bisik = station.getByLabel("Kendali Bisik", { exact: true });
  await expect(bisik).toBeVisible();
  const start = Date.now();
  await bisik
    .getByRole("button", { name: "Sesuaikan kartu Bisik online", exact: true })
    .click();
  await expect(bisik).toContainText("AI belum tersedia untuk kartu ini");
  const bisikMs = Date.now() - start;
  const beforePreview = llmCalls;
  await bisik
    .getByLabel("Pertanyaan Bisik lokal", { exact: true })
    .fill(`${canary} bingung mengurangkan.`);
  await bisik
    .getByRole("button", { name: "Periksa pratinjau lokal", exact: true })
    .click();
  await expect(bisik).toContainText("Hapus identitas");
  await expect(
    bisik.getByLabel("Pratinjau Bisik", { exact: true }),
  ).toHaveCount(0);
  await bisik
    .getByLabel("Pertanyaan Bisik lokal", { exact: true })
    .fill("Mengapa −3 − 5 = −8?");
  await bisik
    .getByRole("button", { name: "Periksa pratinjau lokal", exact: true })
    .click();
  await expect(
    bisik.getByLabel("Pratinjau Bisik", { exact: true }),
  ).toContainText("Mengapa");
  await expect(
    bisik.getByRole("button", {
      name: "Kirim pertanyaan tanpa identitas",
      exact: true,
    }),
  ).toBeDisabled();
  expect(llmCalls).toBe(beforePreview);
  expect(leaked).toBe(false);
  await bisik.getByLabel("Pertanyaan Bisik lokal", { exact: true }).fill("");
  await bisik.getByRole("button", { name: "Berguna", exact: true }).click();
  await expect(bisik).toContainText("Penilaian saran tersimpan lokal");
  const feedback = await page.evaluate(async () => {
    const name = (await indexedDB.databases()).find((d) =>
      d.name?.startsWith("pn-data:demo:"),
    )?.name;
    if (!name) return false;
    return new Promise<boolean>((resolve, reject) => {
      const open = indexedDB.open(name);
      open.onerror = () => reject(new Error("DB"));
      open.onsuccess = () => {
        const db = open.result,
          read = db.transaction("localMeta").objectStore("localMeta").getAll();
        read.onsuccess = () => {
          const rows: { key: string; value: string }[] = read.result;
          const value = rows.find((r) => r.key.startsWith("bisik-feedback:"));
          const result = value ? JSON.parse(value.value) : null;
          resolve(
            result?.helpful === true &&
              Object.keys(result).sort().join(",") ===
                "classId,code,helpful,requestId,sessionId",
          );
          db.close();
        };
      };
    });
  });
  expect(feedback).toBe(true);
  await expect(board.locator("body")).not.toContainText(canary);
  await expect(board.locator("body")).not.toContainText("D1.2");
  await mkdir("artifacts/qa/M13", { recursive: true });
  // Only the cleared Bisik controls; no teacher roster/name area in screenshot.
  expect(
    await bisik.evaluate((root) => {
      const box = root.getBoundingClientRect();
      return Array.from(root.querySelectorAll("button")).every((button) => {
        const rect = button.getBoundingClientRect();
        return (
          rect.left >= box.left - 1 &&
          rect.right <= box.right + 1 &&
          rect.height >= 48
        );
      });
    }),
  ).toBe(true);
  await bisik.screenshot({ path: "artifacts/qa/M13/bisik-controls.png" });
  await page.context().setOffline(true);
  await bisik
    .getByRole("button", { name: "Sesuaikan kartu Bisik online", exact: true })
    .click();
  await expect(bisik).toContainText(
    "Tanpa internet: menampilkan kartu strategi yang tersimpan",
  );
  await page.context().setOffline(false);
  await page.reload();
  expect(leaked).toBe(false);
  expect(errors).toEqual([]);
  await writeFile(
    "artifacts/qa/M13/llm-browser.json",
    JSON.stringify(
      {
        status: "PASS_LOCAL_DISABLED_PROVIDER",
        sampleCount: 1,
        liveProviderCalls: 0,
        localPreviewNoRequests: true,
        nameLeak: false,
        feedbackLocal: feedback,
        errors,
        fallbackLatencyMs: { enrichment: storyMs, bisik: bisikMs },
        note: "Fallback timing only; paid provider SLA and human privacy review NOT_RUN.",
      },
      null,
      2,
    ),
  );
  await boardContext.close();
});

test("LLM API rejects unowned/extra fields and remains disabled without credentials", async ({
  browser,
}) => {
  const context = await browser.newContext(),
    page = await context.newPage();
  await loginTeacher(page);
  const origin = { Origin: "http://127.0.0.1:3100" },
    classId = crypto.randomUUID();
  const created = await page.request.post("/api/v1/classes", {
    headers: origin,
    data: { id: classId, label: "7W", grade: 7, count: 3, mode: "demo" },
  });
  expect(created.ok()).toBe(true);
  const input = {
    requestId: crypto.randomUUID(),
    classId,
    sessionId: crypto.randomUUID(),
    code: "D1.2",
  };
  const disabled = await page.request.post("/api/v1/llm/bisik", {
    headers: origin,
    data: input,
  });
  expect(disabled.status()).toBe(200);
  expect((await disabled.json()).status).toBe("static");
  expect((await disabled.json()).reason).toBe("disabled");
  const extra = await page.request.post("/api/v1/llm/bisik", {
    headers: origin,
    data: { ...input, studentName: true },
  });
  expect(extra.status()).toBe(422);
  const gate = await page.request.post("/api/v1/llm/bisik", {
    headers: origin,
    data: { ...input, question: "Mengapa mengurangi bergerak ke kiri?" },
  });
  expect((await gate.json()).reason).toBe("privacy");
  const recipe = toPackageRecipe(
    buildPackage({
      id: crypto.randomUUID(),
      classId,
      grade: 7,
      variant: "initial",
      seed: 1,
      occupied: [],
    }),
  );
  const invalid = await page.request.post("/api/v1/llm/enrich", {
    headers: origin,
    data: {
      requestId: crypto.randomUUID(),
      recipe: { ...recipe, approved: true },
    },
  });
  expect(invalid.status()).toBe(422);
  const otherContext = await browser.newContext(),
    other = await otherContext.newPage();
  await loginTeacher(other);
  expect(
    (
      await other.request.post("/api/v1/llm/bisik", {
        headers: origin,
        data: input,
      })
    ).status(),
  ).toBe(404);
  expect(
    (
      await other.request.post("/api/v1/llm/enrich", {
        headers: origin,
        data: { requestId: crypto.randomUUID(), recipe },
      })
    ).status(),
  ).toBe(404);
  const anon = await browser.newContext();
  expect(
    (
      await anon.request.post("http://127.0.0.1:3100/api/v1/llm/bisik", {
        headers: origin,
        data: input,
      })
    ).status(),
  ).toBe(401);
  await anon.close();
  await otherContext.close();
  await context.close();
});
