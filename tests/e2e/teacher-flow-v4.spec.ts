import { test, expect, type Page } from "@playwright/test";
import {
  loginTeacher,
  injectFixture,
  waitForShellCache,
} from "../browser/helpers";
const origin = "http://127.0.0.1:3100";
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
}

for (const width of [360, 390])
  test(`FLOW01 beginner reaches practice and AI from home at ${width}; class data, drafts and session survive disclosure`, async ({
    page,
    context,
  }) => {
    test.setTimeout(90000);
    await page.setViewportSize({ width, height: 844 });
    const errors: string[] = [];
    page.on("pageerror", () => errors.push("runtime"));
    const aiRequests: string[] = [];
    const classModes: string[] = [];
    page.on("request", (r) => {
      if (r.method() === "POST" && r.url().endsWith("/api/v1/llm/enrich"))
        aiRequests.push(r.postData() ?? "");
      if (r.url().includes("/api/v1/classes?"))
        classModes.push(new URL(r.url()).searchParams.get("mode") ?? "");
    });
    await sample(page);
    await expect(
      page.getByRole("heading", {
        name: "Siap belajar hari ini?",
        exact: true,
      }),
    ).toBeVisible();
    const allRuns = await (
      await page.request.post("/api/v1/library", {
        headers: { Origin: origin },
        data: { action: "list" },
      })
    ).json();
    const activeCount = allRuns.runs.filter(
      (run: { status: string }) => run.status === "active",
    ).length;
    const resume = page.locator("#teacher-home-resume");
    await expect(resume.locator(":scope > ul > li")).toHaveCount(
      Math.min(activeCount, 3),
    );
    if (activeCount > 3) {
      await expect(resume.locator("details")).not.toHaveAttribute("open", "");
      await resume.locator("summary").click();
      await expect(resume.locator("details li")).toHaveCount(activeCount - 3);
      await resume.locator("summary").click();
    }
    const menu = page.getByRole("navigation", { name: "Menu utama" });
    await expect(
      menu.getByRole("link", { name: "Latihan & AI", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Sinkronkan jawaban", exact: true }),
    ).toBeHidden();
    await page
      .getByRole("link", { name: "Buka latihan & AI", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Latihan & bantuan AI", exact: true }),
    ).toBeVisible();
    await expect(
      menu.getByRole("link", { name: "Latihan & AI", exact: true }),
    ).toHaveAttribute("aria-current", "page");
    await expect(
      page.getByRole("button", { name: /Buka kelas 7B/ }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByLabel("Gunakan kelas")).toHaveCount(0);
    await expect(page.locator("#teacher-device")).not.toHaveAttribute(
      "open",
      "",
    );
    await expect(
      page.getByRole("region", { name: "Kesiapan offline" }),
    ).toBeHidden();
    await expect(
      page.getByRole("button", {
        name: "Tinjau konflik sinkronisasi",
        exact: true,
      }),
    ).toBeHidden();
    expect(classModes.every((mode) => mode === "demo")).toBe(true);
    await page.screenshot({
      path: test.info().outputPath("practice-first-use.png"),
      fullPage: true,
    });
    await page.locator("#teacher-ai > summary").click();
    await expect(page.locator("#teacher-ai")).toContainText(
      "AI belum diaktifkan",
    );
    await expect(
      page.getByRole("button", { name: "Siapkan latihan dahulu", exact: true }),
    ).toBeVisible();
    expect(aiRequests).toHaveLength(0);
    await page
      .getByRole("button", { name: "Siapkan latihan dahulu", exact: true })
      .click();
    await expect(page.locator("#teacher-prepare > summary")).toBeFocused();
    await page
      .getByRole("button", { name: "Siapkan soal", exact: true })
      .click();
    await expect(page.locator("#teacher-prepare")).toContainText(
      "Latihan tersimpan di perangkat ini",
    );
    await page
      .getByRole("button", { name: "Tambahkan cerita AI", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Buat pilihan cerita", exact: true })
      .click();
    await expect(
      page.getByLabel("Cerita Paket Sesi", { exact: true }),
    ).toContainText("Layanan AI belum diaktifkan");
    expect(aiRequests).toHaveLength(1);
    const recipe = JSON.parse(aiRequests[0]).recipe;
    expect(recipe.grade).toBe(7);
    await expect(
      page.getByRole("button", {
        name: "Simpan 3 soal cerita",
        exact: true,
      }),
    ).toHaveCount(0);
    const source = page.getByLabel("Kode Bisik", { exact: true });
    await source.selectOption("D1.2");
    await expect(
      page.getByRole("region", { name: "Bisik statis", exact: true }),
    ).toContainText("Pengurangan dari bilangan negatif");
    expect(await source.locator("option:checked").innerText()).not.toBe("D1.2");
    await expect(
      page.getByRole("button", { name: "Buat latihan baru", exact: true }),
    ).toBeHidden();
    await page.locator("#teacher-prepare > summary").click();
    await expect(page.locator("#teacher-prepare")).toContainText("Versi 2");
    await page.getByText("Ganti kelas", { exact: true }).click();
    await page.getByRole("button", { name: /Buka kelas 7C/ }).click();
    await expect(
      page.getByRole("button", { name: "Siapkan latihan dahulu", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Buat pilihan cerita", exact: true }),
    ).toHaveCount(0);
    await page.getByText("Ganti kelas", { exact: true }).click();
    await page.getByRole("button", { name: /Buka kelas 7B/ }).click();
    await expect(page.locator("#teacher-prepare")).toContainText("Versi 2");
    await page
      .getByRole("button", { name: "Mulai mengajar", exact: true })
      .click();
    const cycle = page.getByRole("region", {
      name: "Siklus kelas",
      exact: true,
    });
    await expect(cycle.getByTestId("cycle-status")).toContainText("Sesi 1");
    await page.locator("#teacher-teach > summary").click();
    await page.locator("#teacher-teach > summary").click();
    await expect(cycle.getByTestId("cycle-status")).toContainText("Sesi 1");
    await expect(page.locator("#teacher-rehearsal")).toHaveCount(0);
    await expect(page.getByLabel("Kode pasangan", { exact: true })).toHaveCount(
      1,
    );
    await context.setOffline(true);
    await expect(page.locator("#teacher-ai")).toContainText(
      "Tanpa internet: gunakan kartu saran",
    );
    await expect(
      page.getByRole("button", { name: "Buat pilihan cerita", exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByLabel("Cerita Paket Sesi", { exact: true }),
    ).toContainText("Soal sudah digunakan dalam sesi");
    expect(aiRequests).toHaveLength(1);
    await context.setOffline(false);
    await expect(page.locator("#teacher-ai")).toContainText(
      "AI belum diaktifkan",
    );
    await page.reload();
    await expect(
      page.getByRole("button", { name: /Buka kelas 7B/ }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator("#teacher-device")).not.toHaveAttribute(
      "open",
      "",
    );
    await expect(page.getByTestId("cycle-status")).toContainText("Sesi 1");
    expect(
      await menu.getByRole("link").evaluateAll((links) =>
        links.every((link) => {
          const b = link.getBoundingClientRect();
          return b.width >= 48 && b.height >= 48;
        }),
      ),
    ).toBe(true);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect(errors).toEqual([]);
  });

test("FLOW02 empty pages offer a next action; personal and example classes remain separate", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await loginTeacher(page, { guided: true });
  await expect(page.getByLabel("Gunakan kelas")).toHaveValue("pilot");
  await expect(page.locator("#teacher-device")).not.toHaveAttribute("open", "");
  await page.goto("/guru/mulai");
  await expect(
    page.getByRole("heading", {
      name: "Tambahkan kelas untuk memulai",
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Tambahkan kelas", exact: true })
    .click();
  await expect(page).toHaveURL(/\/guru\/kelas$/);
  await page
    .getByRole("navigation", { name: "Menu utama" })
    .getByRole("link", { name: "Latihan & AI", exact: true })
    .click();
  await page.getByLabel("Gunakan kelas").selectOption("demo");
  await page.getByRole("button", { name: "Buat kelas", exact: true }).click();
  await page.getByLabel("Nama rombel", { exact: true }).fill("7UX");
  await page.getByLabel("Jumlah siswa", { exact: true }).fill("3");
  await page.getByRole("button", { name: "Simpan kelas", exact: true }).click();
  await expect(
    page.getByRole("button", { name: /Buka kelas 7UX/ }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByLabel("Gunakan kelas").selectOption("pilot");
  await expect(
    page.getByRole("button", { name: /Buka kelas 7UX/ }),
  ).toHaveCount(0);
  await page.getByLabel("Gunakan kelas").selectOption("demo");
  await expect(
    page.getByRole("button", { name: /Buka kelas 7UX/ }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.locator("#teacher-extras > summary").click();
  await page.locator("#teacher-class > summary").click();
  await expect(page.getByLabel("Daftar absen")).toContainText("Absen 1");
  await page.locator("#teacher-device > summary").click();
  await expect(
    page.getByRole("button", { name: "Sinkronkan jawaban", exact: true }),
  ).toBeVisible();
  const selectedClass = new URL(page.url()).searchParams.get("class");
  expect(selectedClass).toBeTruthy();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Hapus kelas", exact: true }).click();
  await expect(
    page.getByRole("button", { name: /Buka kelas 7UX/ }),
  ).toHaveCount(0);
  const cached = await page.evaluate(async (id) => {
    const database = (await indexedDB.databases()).find((db) =>
      db.name?.startsWith("pn-data:demo:"),
    );
    if (!database?.name) throw new Error("Missing database");
    return new Promise<boolean>((resolve, reject) => {
      const open = indexedDB.open(database.name!);
      open.onerror = () => reject(new Error("Cache unavailable"));
      open.onsuccess = () => {
        const db = open.result;
        const get = db
          .transaction("libraryCache")
          .objectStore("libraryCache")
          .get(`classDetail:${id}`);
        get.onsuccess = () => {
          resolve(Boolean(get.result));
          db.close();
        };
        get.onerror = () => {
          db.close();
          reject(new Error("Read failed"));
        };
      };
    });
  }, selectedClass);
  expect(cached).toBe(false);
});

test("FLOW04 selected class reopens offline through canonical shell; essential storage warning stays visible", async ({
  page,
  context,
}) => {
  test.setTimeout(60000);
  await page.setViewportSize({ width: 390, height: 844 });
  await loginTeacher(page, { guided: true });
  await page.getByLabel("Gunakan kelas").selectOption("demo");
  await page.getByRole("button", { name: "Buat kelas", exact: true }).click();
  await page.getByLabel("Nama rombel", { exact: true }).fill("7OFF");
  await page.getByRole("button", { name: "Simpan kelas", exact: true }).click();
  await expect(
    page.getByRole("button", { name: /Buka kelas 7OFF/ }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Siapkan soal", exact: true }).click();
  await expect(page.locator("#teacher-prepare")).toContainText(
    "Latihan tersimpan di perangkat ini",
  );
  await injectFixture(page);
  await waitForShellCache(page);
  const classId = new URL(page.url()).searchParams.get("class");
  expect(classId).toBeTruthy();
  await context.setOffline(true);
  await page.reload();
  await expect(
    page.getByRole("button", { name: /Buka kelas 7OFF/ }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#teacher-prepare")).toContainText("Versi 2");
  await expect(page.locator("#teacher-device")).not.toHaveAttribute("open", "");
  expect(
    await page.evaluate(async (id) => {
      for (const name of await caches.keys()) {
        for (const request of await (await caches.open(name)).keys()) {
          if (request.url.includes(id!)) return false;
        }
      }
      return true;
    }, classId),
  ).toBe(true);
  await page.evaluate(() =>
    window.dispatchEvent(
      new CustomEvent("pn-local-storage-error", { detail: "QUOTA" }),
    ),
  );
  await expect(
    page.getByRole("alert").filter({ hasText: "Penyimpanan penuh" }),
  ).toBeVisible();
  await expect(page.locator("#teacher-device")).not.toHaveAttribute("open", "");
  await page
    .getByRole("button", { name: "Periksa data tersimpan", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "Kesiapan offline" }),
  ).toContainText("Penyimpanan penuh");
  await context.setOffline(false);
});

test("FLOW03 AI status never claims tested readiness; changing source clears the previous lesson", async ({
  page,
}) => {
  test.setTimeout(60000);
  await sample(page);
  await page
    .getByRole("navigation", { name: "Menu utama" })
    .getByRole("link", { name: "Latihan & AI", exact: true })
    .click();
  await page.locator("#teacher-ai > summary").click();
  for (const contentEligible of [false, true]) {
    await page.route("**/api/v1/llm/status", (route) =>
      route.fulfill({
        json: {
          enabled: true,
          freeText: false,
          configuration: "valid",
          configured: true,
          connectionTested: false,
          contentEligible,
          privacyReviewed: false,
          budgetEnabled: true,
          budgetReason: "none",
        },
      }),
    );
    await page.reload();
    await expect(page.locator("#teacher-ai")).toContainText(
      contentEligible
        ? "Hasil setiap permintaan tetap perlu diperiksa"
        : "Materi perlu ditinjau",
    );
    await expect(page.locator("#teacher-ai")).not.toContainText(
      "AI siap digunakan",
    );
    await page.unroute("**/api/v1/llm/status");
  }
  await page.route("**/api/v1/llm/status", (route) =>
    route.fulfill({ status: 503, body: "" }),
  );
  await page.reload();
  await expect(page.locator("#teacher-ai")).toContainText(
    "Status AI belum dapat diperiksa",
  );
  await page.unroute("**/api/v1/llm/status");
  await page.goto("/guru/mulai");
  const collection = page.getByRole("combobox", {
    name: "Kumpulan soal",
    exact: true,
  });
  const value = await collection.locator("option").nth(1).getAttribute("value");
  expect(value).toBeTruthy();
  await collection.selectOption(value!);
  await expect(
    page.getByRole("button", { name: /^Mulai sesi$|^Lanjutkan sesi$/ }),
  ).toBeEnabled();
  await expect(page.getByRole("tablist", { name: "Sumber soal" })).toHaveCount(
    0,
  );
  await collection.selectOption("");
  await expect(collection).toHaveValue("");
  await expect(
    page.getByRole("button", { name: "Mulai sesi", exact: true }),
  ).toBeDisabled();
});
