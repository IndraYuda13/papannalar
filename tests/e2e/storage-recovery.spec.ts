import { openBoard } from "../browser/helpers";
import { test, expect } from "@playwright/test";
import { readFile, writeFile } from "node:fs/promises";
import {
  loginTeacher,
  injectFixture,
  waitForShellCache,
} from "../browser/helpers";
async function fixtures(page: import("@playwright/test").Page) {
  await page.addScriptTag({
    content: await readFile(".browser-tests/sync-fixture.js", "utf8"),
  });
  await page.addScriptTag({
    content: await readFile(".browser-tests/offline-fixture.js", "utf8"),
  });
}
test("OFF02 migration retains old records, quota aborts atomically, eviction is detected and canonical pseudonyms can be restored", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", () => errors.push("runtime"));
  await loginTeacher(page);
  await fixtures(page);
  const migration = await page.evaluate(() =>
    window.__offlineFixture.migration(),
  );
  expect(migration).toMatchObject({
    version: 12,
    student: true,
    cards: 1,
    outbox: 1,
  });
  expect(migration.stores).toContain("syncArchives");
  expect(migration.stores).toEqual(
    expect.arrayContaining(["libraryCache", "libraryPending", "classPresence"]),
  );
  const ids = await page.evaluate(() => window.__syncFixture.initialize());
  const health = await page.evaluate(() => window.__offlineFixture.health());
  expect(health).toMatchObject({
    packages: 1,
    cycles: 1,
    activeClass: true,
    pending: true,
    evicted: false,
  });
  expect(await page.evaluate(() => window.__offlineFixture.safe())).toBe(false);
  const quota = await page.evaluate(
    (id) => window.__offlineFixture.quota(id),
    ids.sessionId,
  );
  expect(quota).toMatchObject({ failed: true, unchanged: true });
  expect(quota.after).toEqual(quota.before);
  await expect(
    page.getByRole("region", { name: "Kesiapan offline" }),
  ).toContainText("Penyimpanan penuh. Kartu belum tersimpan");
  expect(
    (await page.evaluate(() => window.__syncFixture.sync())).accepted,
  ).toBe(1);
  const evicted = await page.evaluate(() => window.__offlineFixture.evict());
  expect(evicted).toMatchObject({ cycles: 0, packages: 0, evicted: true });
  await page.getByLabel("Data kelas").selectOption("demo");
  await page
    .getByRole("button", { name: "Periksa kesiapan offline", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "Kesiapan offline" }),
  ).toContainText("Data lokal pernah hilang");
  await page.getByRole("button", { name: /Buka kelas 7S/ }).click();
  await page
    .getByRole("button", { name: "Muat sesi dari server", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Ambil alih sesi 1", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate((id) => window.__syncFixture.counts(id), ids.sessionId),
  ).toEqual({ events: 0, outbox: 0 });
  expect(
    (await page.evaluate(() => window.__offlineFixture.health())).cycles,
  ).toBe(1);
  expect(errors).toEqual([]);
  await page.getByRole("region", { name: "Kesiapan offline" }).screenshot({
    path: "artifacts/qa/M11/storage-status.png",
  });
  await writeFile(
    "artifacts/qa/M11/storage-browser.json",
    JSON.stringify(
      {
        test: "OFF02",
        migration,
        quota,
        evictionDetected: evicted.evicted,
        restoredCycles: 1,
        errors,
        faultInjection:
          "IDB put QuotaExceededError; test account pn-data namespace deleted",
      },
      null,
      2,
    ),
  );
});

test("OFF03 a new service worker stays waiting during class and activates only after local data is safe", async ({
  page,
}) => {
  await loginTeacher(page);
  await fixtures(page);
  await injectFixture(page);
  await waitForShellCache(page);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Beranda", exact: true }),
  ).toBeVisible();
  await fixtures(page);
  expect(
    await page.evaluate(() => Boolean(navigator.serviceWorker.controller)),
  ).toBe(true);
  const ids = await page.evaluate(() => window.__syncFixture.initialize());
  await page.getByLabel("Data kelas").selectOption("demo");
  await page.evaluate(async () => {
    // A changed script URL installs the real worker as a new version, without a mock worker.
    await navigator.serviceWorker.register(
      `/sw.js?update=${crypto.randomUUID()}`,
      {
        scope: "/",
        updateViaCache: "none",
      },
    );
  });
  await expect
    .poll(() =>
      page.evaluate(async () =>
        Boolean((await navigator.serviceWorker.getRegistration("/"))?.waiting),
      ),
    )
    .toBe(true);
  await page
    .getByRole("button", { name: "Periksa kesiapan offline", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Pasang pembaruan saat aman", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "Kesiapan offline" }),
  ).toContainText("Pembaruan ditunda");
  expect(
    await page.evaluate(async () =>
      Boolean((await navigator.serviceWorker.getRegistration("/"))?.waiting),
    ),
  ).toBe(true);
  const deleted = await page.evaluate(
    async (id) =>
      (
        await fetch(`/api/v1/classes/${id}`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ revision: 1 }),
        })
      ).status,
    ids.classId,
  );
  expect(deleted).toBe(200);
  await page.evaluate((id) => window.__syncFixture.purge(id), ids.classId);
  expect(await page.evaluate(() => window.__offlineFixture.safe())).toBe(true);
  await page
    .getByRole("button", { name: "Pasang pembaruan saat aman", exact: true })
    .click();
  await expect
    .poll(() =>
      page.evaluate(async () =>
        Boolean((await navigator.serviceWorker.getRegistration("/"))?.waiting),
      ),
    )
    .toBe(false);
  await expect(
    page.getByRole("heading", { name: "Beranda", exact: true }),
  ).toBeVisible();
});

test("PRIV03 paired roster exists only in board RAM and disappears on offline reload", async ({
  page,
  browser,
}) => {
  await loginTeacher(page);
  const headers = { Origin: "http://127.0.0.1:3100" },
    classId = crypto.randomUUID();
  expect(
    (
      await page.request.post("/api/v1/classes", {
        headers,
        data: { id: classId, label: "7R", grade: 7, count: 3, mode: "demo" },
      })
    ).status(),
  ).toBe(201);
  const context = await browser.newContext({
      baseURL: "http://127.0.0.1:3100",
    }),
    board = await context.newPage();
  await openBoard(board);
  await injectFixture(board);
  await waitForShellCache(board);
  const code = (await board.getByTestId("pairing-code").textContent())!.replace(
    /\s/g,
    "",
  );
  const groupId = crypto.randomUUID();
  expect(
    (
      await page.request.post("/api/v1/pairing", {
        headers,
        data: {
          action: "claim",
          classId,
          sessionId: crypto.randomUUID(),
          code,
          payload: {
            schemaVersion: 1,
            mode: "groups",
            question: 1,
            taskEpoch: crypto.randomUUID(),
            groups: [
              {
                id: groupId,
                label: "Segitiga Biru",
                attendanceNumbers: [1, 2, 3],
              },
            ],
          },
        },
      })
    ).status(),
  ).toBe(200);
  await expect(board.getByTestId("board-connection")).toContainText(
    "Tersambung",
  );
  await expect(board.getByText("Segitiga Biru", { exact: true })).toBeVisible();
  expect(await board.evaluate(() => Object.keys(localStorage))).toEqual([
    "pn-board-appearance-v1",
  ]);
  expect(await board.evaluate(() => Object.keys(sessionStorage))).toEqual([]);
  const stored = await board.evaluate(async () => {
    const databases = await indexedDB.databases();
    return Promise.all(
      databases.map(async (info) => {
        const db = await new Promise<IDBDatabase>((resolve, reject) => {
          const request = indexedDB.open(info.name!);
          request.onsuccess = () => resolve(request.result);
          request.onerror = () =>
            reject(new Error("Cannot inspect board storage"));
        });
        try {
          const stores = await Promise.all(
            Array.from(db.objectStoreNames).map(async (name) => {
              const values = await new Promise<unknown[]>((resolve, reject) => {
                const request = db.transaction(name).objectStore(name).getAll();
                request.onsuccess = () => resolve(request.result);
                request.onerror = () =>
                  reject(new Error("Cannot inspect board records"));
              });
              return { name, values };
            }),
          );
          return { name: info.name, stores };
        } finally {
          db.close();
        }
      }),
    );
  });
  // The allowlisted content cache exists; without an uploaded package every
  // store must be empty. No roster, pairing state or teacher database is allowed.
  expect(stored).toEqual([
    {
      name: "papannalar-board-content-v1",
      stores: [{ name: "packages", values: [] }],
    },
  ]);
  const cached = await board.evaluate(async () => {
    const values: string[] = [];
    for (const key of await caches.keys()) {
      const cache = await caches.open(key);
      for (const request of await cache.keys())
        values.push(await (await cache.match(request))!.text());
    }
    return values.join("");
  });
  expect(cached).not.toContain(groupId);
  await context.setOffline(true);
  await openBoard(board);
  await expect(
    board.getByRole("heading", { name: "Layar Kelas menunggu." }),
  ).toBeVisible();
  await expect(board.getByText("Segitiga Biru", { exact: true })).toHaveCount(
    0,
  );
  await context.close();
});
