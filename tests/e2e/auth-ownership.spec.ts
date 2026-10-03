import { openBoard } from "../browser/helpers";
import { expect, test, type Page } from "@playwright/test";
import {
  injectFixture,
  loginTeacher,
  waitForShellCache,
} from "../browser/helpers";
import { mkdir } from "node:fs/promises";

const origin = "http://127.0.0.1:3100";
const headers = { Origin: origin };

test("refresh session mempertahankan cookie dan no-store meski resource tidak ditemukan", async ({
  page,
  context,
}) => {
  await loginTeacher(page);
  const cookie = (await context.cookies()).find(
    (item) => item.name === "pn-teacher-auth",
  );
  expect(cookie).toBeDefined();
  if (!cookie) throw new Error("Missing teacher cookie");
  const session: Record<string, unknown> = JSON.parse(
    Buffer.from(cookie.value.slice("base64-".length), "base64url").toString(
      "utf8",
    ),
  );
  session.expires_at = Math.floor(Date.now() / 1000) - 60;
  const expiredValue =
    "base64-" + Buffer.from(JSON.stringify(session)).toString("base64url");
  await context.addCookies([{ ...cookie, value: expiredValue }]);
  const response = await page.request.get(
    `/api/v1/classes/${crypto.randomUUID()}`,
  );
  expect(response.status()).toBe(404);
  expect(response.headers()["cache-control"]).toContain("no-store");
  const refreshed = (await context.cookies()).find(
    (item) => item.name === "pn-teacher-auth",
  );
  expect(!!refreshed && refreshed.value !== expiredValue).toBe(true);
  expect((await page.request.get("/api/v1/teacher")).status()).toBe(200);
});
async function createClassUi(page: Page, label: string, count: number) {
  await page.getByRole("button", { name: "Buat kelas", exact: true }).click();
  await page.getByLabel("Nama kelas", { exact: true }).fill(label);
  await page.getByLabel("Jumlah siswa").fill(String(count));
  const created = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/v1/classes") &&
      response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Simpan kelas", exact: true }).click();
  const response = await created;
  expect(response.status()).toBe(201);
  const body: {
    class: { id: string; revision: number };
    students: { id: string; attendanceNumber: number }[];
  } = await response.json();
  await page.getByRole("button", { name: `Buka kelas ${label}` }).click();
  await expect(page.getByLabel("Daftar absen").locator("li")).toHaveCount(
    count,
  );
  return body;
}

test("visitor dialihkan; cookie palsu dan callback invalid tidak mengautentikasi", async ({
  page,
  context,
}) => {
  await page.goto("/guru");
  await expect(page).toHaveURL(/\/masuk$/);
  expect((await page.request.get("/api/v1/teacher")).status()).toBe(401);
  await context.addCookies([
    {
      name: "pn-teacher-auth",
      value: "forged-session",
      url: origin,
      httpOnly: true,
    },
  ]);
  await page.goto("/guru");
  await expect(page).toHaveURL(/\/masuk$/);
  await page.goto("/auth/callback?code=invalid&next=https://evil.invalid");
  await expect(page).toHaveURL(`${origin}/masuk?error=tautan`);
});

test("magic link PKCE, reload session, cookie HttpOnly dan logout bekerja", async ({
  page,
  context,
}) => {
  const errors: string[] = [];
  page.on("pageerror", () => errors.push("pageerror"));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await loginTeacher(page);
  const authCookies = (await context.cookies()).filter((cookie) =>
    cookie.name.startsWith("pn-teacher-auth"),
  );
  expect(authCookies.length).toBeGreaterThan(0);
  expect(
    authCookies.every((cookie) => cookie.httpOnly && cookie.sameSite === "Lax"),
  ).toBe(true);
  const browserStorage = await page.evaluate(() => ({
    local: Object.entries(localStorage),
    session: Object.entries(sessionStorage),
  }));
  const identity = await (await page.request.get("/api/v1/teacher")).json();
  // Bounded boolean presentation choices plus the independent controller UUID.
  expect(browserStorage.session.length).toBeLessThanOrEqual(8);
  for (const [key, value] of browserStorage.session) {
    if (key === "pn-presentation-controller-v1")
      expect(value).toMatch(
        /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/,
      );
    else {
      expect(key).toMatch(
        new RegExp(
          `^pn-teacher-view:${identity.id}:pilot:teacher-(prepare|teach|rehearsal|ai|oral|class|device|extras)$`,
        ),
      );
      expect(value).toMatch(/^(open|closed)$/u);
    }
  }
  // Only noncredential lock flags and eviction sentinels may live here.
  for (const [key, value] of browserStorage.local) {
    if (/^pn-access-(locked|logout)$/.test(key))
      expect(value).toMatch(/^[01]$/);
    else {
      expect(key).toMatch(/^pn-storage:pn-data:(demo|pilot):[a-f0-9-]{36}$/);
      expect(value).toMatch(/^[a-f0-9-]{36}$/);
    }
  }
  for (const cookie of authCookies)
    expect(JSON.stringify(browserStorage)).not.toContain(cookie.value);
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Buat kelas", exact: true }),
  ).toBeVisible();
  const signedOut = page.waitForResponse((r) =>
    r.url().endsWith("/auth/logout"),
  );
  await page.getByRole("button", { name: "Keluar", exact: true }).click();
  expect((await signedOut).status()).toBe(200);
  await expect(page).toHaveURL(/\/masuk$/);
  await expect
    .poll(async () =>
      (await context.cookies())
        .filter((c) => c.name.startsWith("pn-teacher-auth"))
        .map((c) => c.name),
    )
    .toEqual([]);
  await page.goto("/guru");
  await expect(page).toHaveURL(/\/masuk$/);
  expect(errors).toEqual([]);
  await mkdir("artifacts/qa/M01/m01c", { recursive: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "artifacts/qa/M01/m01c/masuk.png",
    fullPage: true,
  });
});

test("board memakai anonymous identity terpisah tanpa teacher API atau nama lokal", async ({
  page,
  context,
}) => {
  const identityResponse = page.waitForResponse((response) =>
    response.url().endsWith("/api/v1/board/identity"),
  );
  await openBoard(page);
  const response = await identityResponse;
  expect(response.status()).toBe(200);
  const board: { id: string; role: string } = await response.json();
  expect(Object.keys(board).sort()).toEqual(["id", "role"]);
  expect(board.role).toBe("board");
  expect((await page.request.get("/api/v1/teacher")).status()).toBe(401);
  expect((await page.request.get("/api/v1/classes")).status()).toBe(401);
  expect(
    (await context.cookies()).some((cookie) =>
      cookie.name.startsWith("pn-teacher-auth"),
    ),
  ).toBe(false);
  expect(
    await page.evaluate(async () =>
      (await indexedDB.databases()).some(
        (db) =>
          db.name?.startsWith("pn-names") || db.name === "pn-teacher-access",
      ),
    ),
  ).toBe(false);
  await loginTeacher(page);
  const teacher = await (await page.request.get("/api/v1/teacher")).json();
  const nextIdentity = page.waitForResponse((result) =>
    result.url().endsWith("/api/v1/board/identity"),
  );
  await openBoard(page);
  expect((await (await nextIdentity).json()).id).toBe(board.id);
  expect(teacher.id).not.toBe(board.id);
  expect(
    await page.evaluate(() => document.cookie.includes("pn-teacher-auth")),
  ).toBe(false);
});

test("CRUD kelas A/B melalui API tetap dibatasi RLS PostgreSQL", async ({
  page,
  browser,
}) => {
  await loginTeacher(page);
  const a = await createClassUi(page, "7B", 3);
  expect(a.students.map((student) => student.attendanceNumber)).toEqual([
    1, 2, 3,
  ]);
  const bContext = await browser.newContext({ baseURL: origin });
  try {
    const bPage = await bContext.newPage();
    await loginTeacher(bPage);
    await createClassUi(bPage, "8A", 2);
    expect(
      (await bPage.request.get(`/api/v1/classes/${a.class.id}`)).status(),
    ).toBe(404);
    expect(
      (
        await bPage.request.patch(`/api/v1/classes/${a.class.id}`, {
          headers,
          data: { label: "attack", grade: 7, revision: 1 },
        })
      ).status(),
    ).toBe(409);
    expect(
      (
        await bPage.request.delete(`/api/v1/classes/${a.class.id}`, {
          headers,
          data: { revision: 1 },
        })
      ).status(),
    ).toBe(409);
    expect(
      (await page.request.get(`/api/v1/classes/${a.class.id}`)).status(),
    ).toBe(200);
    await page.getByLabel("Nama kelas", { exact: true }).fill("7C");
    await page.getByRole("button", { name: "Simpan perubahan" }).click();
    await expect(
      page.getByRole("heading", { name: "Kelas 7C", exact: true }),
    ).toBeVisible();
    await page.reload();
    await page.getByRole("button", { name: "Buka kelas 7C" }).click();
    await expect(page.getByLabel("Daftar absen").locator("li")).toHaveCount(3);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({
      path: "artifacts/qa/M01/m01c/kelas-roster.png",
      fullPage: true,
    });
    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "Hapus kelas" }).click();
    await expect(page.getByRole("button", { name: /^Buka kelas/ })).toHaveCount(
      0,
    );
    await expect(
      page.getByText("Tambahkan kelas pertama untuk menyiapkan latihan.", {
        exact: true,
      }),
    ).toBeVisible();
    expect(
      (await page.request.get(`/api/v1/classes/${a.class.id}`)).status(),
    ).toBe(404);
  } finally {
    await bContext.close();
  }
});

test("nama local-only bergabung di UI guru; API baru dan papan tidak menerima canary", async ({
  page,
}) => {
  await loginTeacher(page);
  const data = await createClassUi(page, "7B", 2);
  const identity = await (await page.request.get("/api/v1/teacher")).json();
  await injectFixture(page);
  await page.evaluate(
    async ({ ownerId, studentId }) => {
      const names = window.__privacyFixture.createNameRepository({
        ownerId,
        mode: "pilot",
      });
      await names.save(studentId, "LOCAL_ONLY_M01C_CANARY");
      names.close();
    },
    { ownerId: identity.id, studentId: data.students[0].id },
  );
  const observed: string[] = [];
  page.on("request", (request) =>
    observed.push(request.url(), request.postData() ?? ""),
  );
  page.on("console", (message) => observed.push(message.text()));
  await page.reload();
  await page.getByRole("button", { name: "Buka kelas 7B" }).click();
  await expect
    .poll(async () =>
      (await page.getByLabel("Daftar absen").innerText()).includes(
        "LOCAL_ONLY_M01C_CANARY",
      ),
    )
    .toBe(true);
  const popup = page.waitForEvent("popup");
  await page.getByRole("link", { name: "Layar Kelas", exact: true }).click();
  const board = await popup;
  board.on("request", (request) =>
    observed.push(request.url(), request.postData() ?? ""),
  );
  board.on("console", (message) => observed.push(message.text()));
  await openBoard(board);
  await expect(
    board.getByRole("heading", { name: "Layar Kelas menunggu." }),
  ).toBeVisible();
  expect(
    (await board.locator("body").innerText()).includes(
      "LOCAL_ONLY_M01C_CANARY",
    ),
  ).toBe(false);
  expect(observed.some((text) => text.includes("LOCAL_ONLY_M01C_CANARY"))).toBe(
    false,
  );
  await board.close();
});

test("logout offline mengunci akses lokal dan dicabut saat online kembali", async ({
  page,
  context,
}) => {
  await loginTeacher(page);
  await injectFixture(page);
  await waitForShellCache(page);
  await context.setOffline(true);
  await page.getByRole("button", { name: "Keluar", exact: true }).click();
  await expect(page.getByText("Akses guru terkunci.")).toBeVisible();
  await page.reload();
  await expect(page.getByText("Akses guru terkunci.")).toBeVisible();
  await context.setOffline(false);
  await page.reload();
  await expect(page).toHaveURL(/\/masuk$/);
  expect((await page.request.get("/api/v1/teacher")).status()).toBe(401);
});

test("CSRF dan field tambahan ditolak pada endpoint mutasi", async ({
  page,
}) => {
  await loginTeacher(page);
  expect(
    (
      await page.request.post("/auth/logout", {
        headers: { Origin: "https://evil.invalid" },
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await page.request.post("/api/v1/classes", {
        headers,
        data: {
          id: crypto.randomUUID(),
          label: "7B",
          grade: 7,
          count: 2,
          mode: "pilot",
          ownerId: crypto.randomUUID(),
        },
      })
    ).status(),
  ).toBe(422);
  expect(
    (
      await page.request.post("/api/v1/classes", {
        headers,
        data: {
          id: crypto.randomUUID(),
          label: "7B",
          grade: 7,
          count: 41,
          mode: "pilot",
        },
      })
    ).status(),
  ).toBe(422);
  expect((await page.request.get("/api/v1/teacher")).status()).toBe(200);
});
