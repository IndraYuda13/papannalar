import { openBoard } from "../browser/helpers";
import { expect, test } from "@playwright/test";
import { injectFixture, loginTeacher } from "../browser/helpers";

test.use({ trace: "off" }); // Identity canaries must not enter trace/screenshot artifacts.

test.beforeEach(async ({ page }) => {
  await loginTeacher(page);
  await page.goto("/guru/latihan");
  await injectFixture(page);
});

test("IndexedDB kosong aman; nama optional dan operasi delete/update tidak crash", async ({
  page,
}) => {
  const result = await page.evaluate(async () => {
    const { createNameRepository, createStudentRepository } =
      window.__privacyFixture;
    const scope = { ownerId: crypto.randomUUID(), mode: "demo" as const };
    const studentId = crypto.randomUUID();
    const names = createNameRepository(scope);
    const students = createStudentRepository(scope);
    const emptyName = (await names.read(studentId)) === undefined;
    const emptyStudents =
      (await students.list(crypto.randomUUID())).length === 0;
    const updated = await names.update(studentId, "LOCAL_ONLY_CANARY");
    await names.save(studentId);
    await names.delete(studentId);
    await students.delete(studentId);
    const stillEmpty = (await names.read(studentId)) === undefined;
    names.close();
    students.close();
    return { emptyName, emptyStudents, updated, stillEmpty };
  });
  expect(result).toEqual({
    emptyName: true,
    emptyStudents: true,
    updated: false,
    stillEmpty: true,
  });
});

test("nama lokal dan referensi selamat setelah tutup/reload; join hanya di teacher view", async ({
  page,
}) => {
  const ids = await page.evaluate(async () => {
    const fixture = window.__privacyFixture;
    const scope = { ownerId: crypto.randomUUID(), mode: "demo" as const };
    const student = {
      id: crypto.randomUUID(),
      classId: crypto.randomUUID(),
      attendanceNumber: 9,
      active: true,
    };
    const names = fixture.createNameRepository(scope);
    const students = fixture.createStudentRepository(scope);
    await students.saveMany([student]);
    await names.save(student.id, "LOCAL_ONLY_CANARY");
    names.close();
    students.close();
    return { scope, student };
  });
  await page.reload();
  await injectFixture(page);
  const result = await page.evaluate(async ({ scope, student }) => {
    const fixture = window.__privacyFixture;
    const names = fixture.createNameRepository(scope);
    const students = fixture.createStudentRepository(scope);
    const stored = await students.read(student.id);
    const name = await names.read(student.id);
    const view = await fixture.readTeacherStudentView(student, names);
    const updated = await names.update(student.id, "LOCAL_ONLY_NICKNAME");
    const renamed =
      (await names.read(student.id))?.displayName === "LOCAL_ONLY_NICKNAME";
    const dbs = (await indexedDB.databases()).map((db) => db.name);
    const result = {
      durableName: name?.displayName === "LOCAL_ONLY_CANARY",
      durableReference:
        stored?.attendanceNumber === 9 && stored.schemaVersion === 1,
      teacherLabel: view.label === "LOCAL_ONLY_CANARY",
      domainWithoutName:
        stored !== undefined && !JSON.stringify(stored).includes("LOCAL_ONLY"),
      separateDatabases:
        dbs.includes(`pn-names:demo:${scope.ownerId}`) &&
        dbs.includes(`pn-data:demo:${scope.ownerId}`),
      updated,
      renamed,
    };
    await names.delete(student.id);
    const erased = (await names.read(student.id)) === undefined;
    const fallback =
      (await fixture.readTeacherStudentView(student, names)).label ===
      "Absen 9";
    const referenceRetained = (await students.read(student.id)) !== undefined;
    names.close();
    students.close();
    return { ...result, erased, fallback, referenceRetained };
  }, ids);
  expect(Object.values(result).every(Boolean)).toBe(true);
});

test("namespace dua akun dan demo/pilot terpisah; clear hanya database nama aktif", async ({
  page,
}) => {
  const result = await page.evaluate(async () => {
    const { createNameRepository, createStudentRepository } =
      window.__privacyFixture;
    const ownerA = crypto.randomUUID();
    const ownerB = crypto.randomUUID();
    const demo = { ownerId: ownerA, mode: "demo" as const };
    const pilot = { ownerId: ownerA, mode: "pilot" as const };
    const other = { ownerId: ownerB, mode: "demo" as const };
    const student = {
      id: crypto.randomUUID(),
      classId: crypto.randomUUID(),
      attendanceNumber: 1,
      active: true,
    };
    const a = createNameRepository(demo);
    const b = createNameRepository(other);
    const p = createNameRepository(pilot);
    const dataA = createStudentRepository(demo);
    const dataB = createStudentRepository(other);
    const dataP = createStudentRepository(pilot);
    await a.save(student.id, "LOCAL_ONLY_CANARY_A");
    await dataA.saveMany([student]);
    const isolated =
      (await b.read(student.id)) === undefined &&
      (await p.read(student.id)) === undefined &&
      (await dataB.read(student.id)) === undefined &&
      (await dataP.read(student.id)) === undefined;
    await b.save(student.id, "LOCAL_ONLY_CANARY_B");
    await a.clear();
    const clearIsolated =
      (await a.read(student.id)) === undefined &&
      (await b.read(student.id))?.displayName === "LOCAL_ONLY_CANARY_B" &&
      (await dataA.read(student.id)) !== undefined;
    [a, b, p, dataA, dataB, dataP].forEach((repository) => repository.close());
    return { isolated, clearIsolated };
  });
  expect(result).toEqual({ isolated: true, clearIsolated: true });
});

test("transaksi bulk roster rollback penuh pada absen bentrok; schema menolak nama", async ({
  page,
}) => {
  const result = await page.evaluate(async () => {
    const { createStudentRepository } = window.__privacyFixture;
    const scope = { ownerId: crypto.randomUUID(), mode: "demo" as const };
    const students = createStudentRepository(scope);
    const classId = crypto.randomUUID();
    const first = {
      id: crypto.randomUUID(),
      classId,
      attendanceNumber: 1,
      active: true,
    };
    await students.saveMany([first]);
    let transactionFailed = false;
    try {
      await students.saveMany([
        { id: crypto.randomUUID(), classId, attendanceNumber: 2, active: true },
        { id: crypto.randomUUID(), classId, attendanceNumber: 1, active: true },
      ]);
    } catch {
      transactionFailed = true;
    }
    const rows = await students.list(classId);
    let identityRejected = false;
    try {
      const enriched = { ...first, displayName: "LOCAL_ONLY_CANARY" };
      await students.saveMany([enriched]);
    } catch {
      identityRejected = true;
    }
    students.close();
    return {
      transactionFailed,
      unchanged: rows.length === 1 && rows[0].id === first.id,
      identityRejected,
    };
  });
  expect(result).toEqual({
    transactionFailed: true,
    unchanged: true,
    identityRejected: true,
  });
});

test("browser canary: hanya DTO eksplisit masuk request, nama tidak di URL/log/cache/papan", async ({
  page,
  context,
}) => {
  const observed: string[] = [];
  const errors: string[] = [];
  context.on("request", (request) =>
    observed.push(request.url(), request.postData() ?? ""),
  );
  page.on("console", (message) => {
    observed.push(message.text());
    if (message.type() === "error") errors.push(message.type());
  });
  page.on("pageerror", () => errors.push("pageerror"));
  const payloads: unknown[] = [];
  // Test-only sink intercepts the actual browser request, not a product API.
  await page.route("**/__privacy-sink", async (route) => {
    payloads.push(route.request().postDataJSON());
    await route.fulfill({ status: 204 });
  });
  const result = await page.evaluate(async () => {
    const fixture = window.__privacyFixture;
    const student = {
      id: crypto.randomUUID(),
      classId: crypto.randomUUID(),
      attendanceNumber: 3,
      active: true,
    };
    const names = fixture.createNameRepository({
      ownerId: crypto.randomUUID(),
      mode: "demo",
    });
    await names.save(student.id, "LOCAL_ONLY_CANARY");
    const local = await names.read(student.id);
    const augmented = {
      ...student,
      displayName: local?.displayName,
      nickname: local?.displayName,
    };
    await fetch("/__privacy-sink", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: fixture.serializeStudent(augmented),
    });
    const privateState = {
      groups: [
        {
          id: crypto.randomUUID(),
          label: "Segitiga Biru" as const,
          attendanceNumbers: [3],
          level: "D1",
          name: local?.displayName,
          score: 99,
        },
      ],
    };
    await fetch("/__privacy-sink", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: fixture.serializeBoardState(privateState),
    });
    let cacheClean = true;
    for (const key of await caches.keys()) {
      const cache = await caches.open(key);
      for (const request of await cache.keys()) {
        if (request.url.includes("LOCAL_ONLY_CANARY")) cacheClean = false;
        const response = await cache.match(request);
        if (response && (await response.text()).includes("LOCAL_ONLY_CANARY"))
          cacheClean = false;
      }
    }
    names.close();
    return {
      cacheClean,
      domClean: !document.body.textContent?.includes("LOCAL_ONLY_CANARY"),
    };
  });
  expect(result).toEqual({ cacheClean: true, domClean: true });
  expect(payloads).toHaveLength(2);
  expect(Object.keys(payloads[0] as object).sort()).toEqual([
    "active",
    "attendanceNumber",
    "classId",
    "id",
    "schemaVersion",
  ]);
  expect(Object.keys(payloads[1] as object).sort()).toEqual([
    "groups",
    "schemaVersion",
  ]);
  expect(observed.some((value) => value.includes("LOCAL_ONLY_CANARY"))).toBe(
    false,
  );
  await openBoard(page);
  expect(
    (await page.locator("body").innerText()).includes("LOCAL_ONLY_CANARY"),
  ).toBe(false);
  expect(errors).toEqual([]);
});
