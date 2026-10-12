import { test, expect } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { registerTeacher } from "../browser/helpers";
import { appOrigin } from "../harness/ports.mjs";
const root =
  process.env["PNL_BROWSER_ARTIFACT_ROOT"] ?? "artifacts/qa/password-auth";

test("registration, logout and password login retain class; rejected credentials cannot enter", async ({
  page,
}) => {
  await mkdir(root, { recursive: true });
  await page.setViewportSize({ width: 390, height: 844 });
  const { email, password } = await registerTeacher(page);
  const classId = crypto.randomUUID();
  const saved = await page.request.post("/api/v1/classes", {
    headers: { Origin: appOrigin },
    data: {
      id: classId,
      label: "Kelas akun uji",
      grade: 7,
      count: 2,
      mode: "pilot",
    },
  });
  expect(saved.ok()).toBe(true);
  await page.goto("/guru/kelas");
  await expect(page.getByText("Kelas akun uji", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "Keluar akun", exact: true })
    .filter({ visible: true })
    .click();
  await expect(page).toHaveURL(/\/masuk$/);
  const duplicate = await page.request.post("/auth/register", {
    headers: { Origin: appOrigin },
    data: { email, password: `other-${crypto.randomUUID()}` },
  });
  expect(duplicate.status()).toBe(401);
  await page.getByLabel("Email guru", { exact: true }).fill(email);
  await page
    .getByLabel("Kata sandi", { exact: true })
    .fill(`wrong-${crypto.randomUUID()}`);
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "Email atau kata sandi tidak sesuai." }),
  ).toBeVisible();
  await page.goto("/guru/kelas");
  await expect(page).toHaveURL(/\/masuk$/);
  await page
    .getByLabel("Email guru", { exact: true })
    .fill(`absent-${crypto.randomUUID()}@qa.invalid`);
  await page.getByLabel("Kata sandi", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "Email atau kata sandi tidak sesuai." }),
  ).toBeVisible();
  await page.getByLabel("Email guru", { exact: true }).fill(email);
  await page.getByLabel("Kata sandi", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await expect(page).toHaveURL(/\/guru$/);
  await page.goto("/guru/kelas");
  await expect(page.getByText("Kelas akun uji", { exact: true })).toBeVisible();
  const classes = await page.request.get("/api/v1/classes");
  expect(JSON.stringify(await classes.json())).toContain(classId);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `${root}/same-class-mobile.png`,
    fullPage: true,
  });
});

test("confirmation mismatch focuses field; confirmation-required and unavailable states are honest", async ({
  page,
}) => {
  await mkdir(root, { recursive: true });
  await page.setViewportSize({ width: 390, height: 844 });
  let requests = 0;
  await page.route("**/auth/register", async (route) => {
    requests++;
    await route.fulfill({
      status: 200,
      json: {
        status: "confirmation_required",
        redirect: null,
        emailVerified: false,
      },
    });
  });
  await page.goto("/daftar");
  await page
    .getByLabel("Email guru", { exact: true })
    .fill("confirmation@qa.invalid");
  await page
    .getByLabel("Kata sandi", { exact: true })
    .fill("synthetic-only-fixture");
  await page
    .getByLabel("Konfirmasi kata sandi", { exact: true })
    .fill("different-only-fixture");
  await page.getByRole("button", { name: "Daftar", exact: true }).click();
  await expect(
    page.getByLabel("Konfirmasi kata sandi", { exact: true }),
  ).toBeFocused();
  expect(requests).toBe(0);
  await page
    .getByLabel("Konfirmasi kata sandi", { exact: true })
    .fill("synthetic-only-fixture");
  await page.getByRole("button", { name: "Daftar", exact: true }).click();
  await expect(page.getByRole("status")).toContainText(
    "Email Anda belum terverifikasi",
  );
  await expect(page).toHaveURL(/\/daftar$/);
  await expect(
    page.getByRole("button", { name: "Daftar", exact: true }),
  ).toBeDisabled();
  await expect(page.getByLabel("Kata sandi", { exact: true })).toHaveValue("");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `${root}/confirmation-mobile.png`,
    fullPage: true,
  });
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto("/daftar");
  await page.screenshot({
    path: `${root}/registration-desktop.png`,
    fullPage: true,
  });
  await page.route("**/auth/login", (route) =>
    route.fulfill({ status: 503, json: { error: "UNAVAILABLE" } }),
  );
  await page.goto("/masuk");
  await page
    .getByLabel("Email guru", { exact: true })
    .fill("unavailable@qa.invalid");
  await page
    .getByLabel("Kata sandi", { exact: true })
    .fill("synthetic-only-fixture");
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Layanan akun belum tersedia" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Masuk", exact: true }),
  ).toBeEnabled();
});
