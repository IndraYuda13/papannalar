import { test, expect } from "@playwright/test";
import { readFile, writeFile } from "node:fs/promises";
import { loginTeacher, chooseTeacherMode } from "../browser/helpers";

for (const status of [401, 409])
  test(`SYNC04 automatic ${status} raises an actionable notice while device settings stay collapsed and answers remain durable`, async ({
    page,
  }) => {
    await page.clock.install();
    await loginTeacher(page, { guided: true });
    await page.getByLabel("Gunakan kelas").selectOption("demo");
    await expect(page.getByLabel("Gunakan kelas")).toBeEnabled();
    const device = page.locator("#teacher-device");
    await expect(device).not.toHaveAttribute("open", "");
    await expect(
      page.getByRole("button", { name: "Sinkronkan jawaban", exact: true }),
    ).toBeHidden();
    await page.addScriptTag({
      content: await readFile(".browser-tests/sync-fixture.js", "utf8"),
    });
    const ids = await page.evaluate(() => window.__syncFixture.initialize());
    const before = await page.evaluate(() => window.__syncFixture.queue());
    expect(before).toHaveLength(1);
    await page.route("**/api/v1/sync", (route) =>
      route.fulfill({
        status,
        json: { error: { code: status === 401 ? "UNAUTHORIZED" : "CONFLICT" } },
      }),
    );
    await page.clock.runFor(16000);
    const notice = page.getByRole("main").getByRole("alert");
    await expect(notice).toContainText(
      status === 401 ? "Masuk kembali" : "jawaban berbeda",
    );
    await expect(device).not.toHaveAttribute("open", "");
    const held = await page.evaluate(() => window.__syncFixture.queue());
    expect(held).toHaveLength(1);
    expect(held[0].state).toBe(status === 401 ? "login" : "review");
    expect(held[0].mutation).toEqual(before[0].mutation);
    expect(
      await page.evaluate(
        (id) => window.__syncFixture.counts(id),
        ids.sessionId,
      ),
    ).toEqual({ events: 1, outbox: 1 });
    await notice
      .getByRole("button", { name: "Periksa data tersimpan", exact: true })
      .click();
    await expect(device).toHaveAttribute("open", "");
    await expect(
      page.getByRole("button", { name: "Sinkronkan jawaban", exact: true }),
    ).toBeVisible();
  });

test("SYNC01 offline queue survives restart, lost ACK retry is idempotent and late correction stays pending until accepted", async ({
  page,
  context,
}) => {
  await loginTeacher(page);
  const errors: string[] = [],
    requests: string[] = [];
  page.on("pageerror", () => errors.push("runtime"));
  page.on("request", (r) => {
    if (r.url().includes("/api/v1/sync") && r.method() === "POST")
      requests.push(r.postData() ?? "");
  });
  const fixture = await readFile(".browser-tests/sync-fixture.js", "utf8");
  await page.addScriptTag({ content: fixture });
  const ids = await page.evaluate(() => window.__syncFixture.initialize());
  await context.setOffline(true);
  const queued = await page.evaluate(() => window.__syncFixture.queue());
  expect(queued).toHaveLength(1);
  expect(
    await page.evaluate((id) => window.__syncFixture.counts(id), ids.sessionId),
  ).toEqual({ events: 1, outbox: 1 });
  // Reopen the repository in a new page without loading a new application over the network.
  await context.setOffline(false);
  await page.reload();
  await page.addScriptTag({ content: fixture });
  expect(
    (await page.evaluate(() => window.__syncFixture.queue()))[0].mutation,
  ).toEqual(queued[0].mutation);
  let lost = false;
  await page.route("**/api/v1/sync", async (route) => {
    if (route.request().method() === "POST" && !lost) {
      lost = true;
      const response = await route.fetch();
      expect(response.status()).toBe(200);
      expect((await response.json()).acknowledgements[0].status).toBe(
        "accepted",
      );
      await route.abort("failed");
    } else await route.continue();
  });
  const lostResult = await page.evaluate(() => window.__syncFixture.sync());
  expect(lostResult.accepted).toBe(0);
  expect(lostResult.entries[0].state).toBe("retry");
  // Correction after delivery but before ACK must not be removed with the older snapshot.
  expect(
    (
      await page.evaluate(
        (id) => window.__syncFixture.correct(id),
        ids.sessionId,
      )
    ).status,
  ).toBe("saved");
  await page.unroute("**/api/v1/sync");
  const retry = await page.evaluate(() => window.__syncFixture.sync());
  expect(retry.accepted).toBe(1);
  expect(
    await page.evaluate((id) => window.__syncFixture.counts(id), ids.sessionId),
  ).toEqual({ events: 2, outbox: 1 });
  const server1 = await page.evaluate(
    (id) => window.__syncFixture.canonical(id),
    ids.classId,
  );
  expect(server1.records[0].revision).toBe(1);
  expect(server1.records[0].payload.cards[0].revision).toBe(1);
  expect(
    (await page.evaluate(() => window.__syncFixture.sync())).accepted,
  ).toBe(1);
  const server2 = await page.evaluate(
    (id) => window.__syncFixture.canonical(id),
    ids.classId,
  );
  expect(server2.records[0].revision).toBe(2);
  expect(server2.records[0].payload.cards[0].revision).toBe(2);
  expect(server2.records[0].payload.cards[0].choices[0]).toBe("?");
  expect(
    await page.evaluate((id) => window.__syncFixture.counts(id), ids.sessionId),
  ).toEqual({ events: 2, outbox: 0 });
  expect((await page.evaluate(() => window.__syncFixture.queue())).length).toBe(
    0,
  );
  expect(requests[1]).toBe(requests[0]);
  for (const forbidden of [
    '"name"',
    "nickname",
    "mastery",
    "answerKey",
    "graded",
  ])
    expect(requests.join("")).not.toContain(forbidden);
  await chooseTeacherMode(page, "demo");
  await page
    .getByRole("button", { name: "Sinkronkan jawaban", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "Sinkronisasi" }),
  ).toContainText("Nama tetap hanya");
  await page.screenshot({ path: "artifacts/qa/M11/sync-teacher.png" });
  expect(errors).toEqual([]);
  await writeFile(
    "artifacts/qa/M11/sync-browser.json",
    JSON.stringify(
      {
        test: "SYNC01",
        requests: requests.length,
        lostAckRetryIdentical: requests[1] === requests[0],
        finalRevision: server2.records[0].revision,
        errors,
        mode: "LOCAL_PROVIDER_REAL_POSTGRES",
      },
      null,
      2,
    ),
  );
});

test("SYNC02 401/409/429/503 retain durable data; class deletion purges the local dependency group", async ({
  page,
}) => {
  await loginTeacher(page);
  await page.addScriptTag({
    content: await readFile(".browser-tests/sync-fixture.js", "utf8"),
  });
  const ids = await page.evaluate(() => window.__syncFixture.initialize());
  const original = (await page.evaluate(() => window.__syncFixture.queue()))[0]
    .mutation;
  await page.clock.install();
  for (const status of [429, 503, 401]) {
    await page.route("**/api/v1/sync", (route) =>
      route.fulfill({
        status,
        headers: { "Retry-After": "120" },
        json: { error: { code: "TEST_FAILURE" } },
      }),
    );
    const result = await page.evaluate(() => window.__syncFixture.sync());
    expect(result.accepted).toBe(0);
    expect(result.entries[0].mutation).toEqual(original);
    expect(result.entries[0].state).toBe(status === 401 ? "login" : "retry");
    if (status === 429)
      expect(result.entries[0].nextAttempt).toBeGreaterThan(
        Date.now() + 110000,
      );
    await page.unroute("**/api/v1/sync");
    if (status === 429)
      await page.clock.setSystemTime(new Date(Date.now() + 121000));
  }
  expect(
    (await page.evaluate(() => window.__syncFixture.sync())).accepted,
  ).toBe(1);
  await page.evaluate((id) => window.__syncFixture.correct(id), ids.sessionId);
  await page.route("**/api/v1/sync", (route) =>
    route.fulfill({ status: 409, json: { error: { code: "CONFLICT" } } }),
  );
  const conflict = await page.evaluate(() => window.__syncFixture.sync());
  expect(conflict.entries[0].state).toBe("review");
  expect(
    await page.evaluate((id) => window.__syncFixture.counts(id), ids.sessionId),
  ).toEqual({ events: 2, outbox: 1 });
  await page.unroute("**/api/v1/sync");
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
  expect(await page.evaluate(() => window.__syncFixture.queue())).toEqual([]);
});
test("SYNC03 two teacher devices enforce read-only import, explicit takeover and reviewed conflict", async ({
  page,
  context,
  browser,
}) => {
  await loginTeacher(page);
  const fixture = await readFile(".browser-tests/sync-fixture.js", "utf8");
  await page.addScriptTag({ content: fixture });
  const ids = await page.evaluate(() => window.__syncFixture.initialize());
  expect(
    (await page.evaluate(() => window.__syncFixture.sync())).accepted,
  ).toBe(1);
  await chooseTeacherMode(page, "demo");
  const otherContext = await browser.newContext({
    storageState: await context.storageState(),
    baseURL: "http://127.0.0.1:3100",
  });
  const other = await otherContext.newPage(),
    errors: string[] = [];
  other.on("pageerror", () => errors.push("device2-runtime"));
  page.on("pageerror", () => errors.push("device1-runtime"));
  await other.goto("/guru/latihan");
  await chooseTeacherMode(other, "demo");
  await other.getByRole("button", { name: /Buka kelas 7S/ }).click();
  await other
    .getByRole("button", { name: "Muat sesi dari server", exact: true })
    .click();
  await expect(
    other.getByRole("button", { name: "Ambil alih sesi 1", exact: true }),
  ).toBeVisible();
  await other.addScriptTag({ content: fixture });
  expect(
    await other.evaluate(async (id) => {
      try {
        await window.__syncFixture.correct(id);
        return false;
      } catch {
        return true;
      }
    }, ids.sessionId),
  ).toBe(true);
  other.once("dialog", (dialog) => dialog.accept());
  await other
    .getByRole("button", { name: "Ambil alih sesi 1", exact: true })
    .click();
  await expect(
    other.getByText("Perangkat ini menjadi pengendali sesi.", { exact: true }),
  ).toBeVisible();
  expect(
    (
      await other.evaluate(
        (id) => window.__syncFixture.correct(id),
        ids.sessionId,
      )
    ).status,
  ).toBe("saved");
  expect(
    (await other.evaluate(() => window.__syncFixture.sync())).accepted,
  ).toBe(1);
  expect(
    (
      await other.evaluate(
        (id) => window.__syncFixture.canonical(id),
        ids.classId,
      )
    ).records[0].writerEpoch,
  ).toBe(2);
  // Device A was offline/unaware of the takeover: save remains durable, sync holds it.
  expect(
    (
      await page.evaluate(
        (id) => window.__syncFixture.correct(id, "B"),
        ids.sessionId,
      )
    ).status,
  ).toBe("saved");
  const held = await page.evaluate(() => window.__syncFixture.sync());
  expect(held.entries[0].state).toBe("review");
  await page
    .getByRole("button", { name: "Tinjau konflik sinkronisasi", exact: true })
    .click();
  await expect(page.getByText(/Absen 1: server/)).toBeVisible();
  page.once("dialog", (dialog) => dialog.accept());
  await page
    .getByRole("button", {
      name: "Gunakan jawaban lokal dan ambil alih",
      exact: true,
    })
    .click();
  await expect(
    page.getByText(/Pilihan tersimpan\. Periksa status sinkronisasi/),
  ).toBeVisible();
  const canonical = (
    await page.evaluate((id) => window.__syncFixture.canonical(id), ids.classId)
  ).records[0];
  expect(canonical.writerEpoch).toBe(3);
  expect(canonical.payload.cards).toHaveLength(1);
  expect(canonical.payload.cards[0].choices[0]).toBe("B");
  expect(canonical.payload.cards[0].revision).toBe(3);
  expect(await page.evaluate(() => window.__syncFixture.queue())).toEqual([]);
  expect(errors).toEqual([]);
  await writeFile(
    "artifacts/qa/M11/writer-browser.json",
    JSON.stringify(
      {
        test: "SYNC03",
        devices: 2,
        writerEpoch: canonical.writerEpoch,
        cardRevision: canonical.payload.cards[0].revision,
        errors,
      },
      null,
      2,
    ),
  );
  await otherContext.close();
});
