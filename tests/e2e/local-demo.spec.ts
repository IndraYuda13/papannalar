import { expect, test } from "@playwright/test";
test("explicit local demo uses the normal PKCE callback and grants only teacher session", async ({
  page,
}) => {
  await page.goto("/demo");
  await expect(page.getByText(/Provider autentikasi uji/)).toBeVisible();
  await page
    .getByRole("button", { name: "Masuk demo lokal", exact: true })
    .click();
  await expect(page).toHaveURL(/\/guru$/);
  await page.goto("/guru/latihan");
  await expect(
    page.getByRole("button", { name: "Buat kelas", exact: true }),
  ).toBeVisible();
  const cookies = await page.context().cookies();
  expect(cookies.some((c) => c.name.startsWith("pn-teacher-auth"))).toBe(true);
  expect(
    cookies
      .filter((c) => c.name.startsWith("pn-teacher-auth"))
      .every((c) => c.httpOnly),
  ).toBe(true);
});
