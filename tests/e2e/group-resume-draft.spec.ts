import { test, expect, type Page } from "@playwright/test";
import { appOrigin } from "../harness/ports.mjs";
import { registerTeacher } from "../browser/helpers";

async function call(page: Page, path: string, data: object) {
  const response = await page.request.post(path, {
    headers: { Origin: appOrigin },
    data,
  });
  expect(response.ok(), await response.text()).toBe(true);
  return response.json();
}

test("draft tersimpan bisa dilanjutkan lewat klik (soft navigation)", async ({
  page,
}) => {
  await registerTeacher(page);
  const classId = crypto.randomUUID();
  await call(page, "/api/v1/classes", {
    id: classId,
    label: "Kelas uji lanjutkan",
    grade: 7,
    count: 6,
    mode: "pilot",
  });

  // Buat draft kelompok, lalu salin id kegiatan dari URL.
  await page.goto(`/guru/latihan?class=${classId}`);
  await page.getByLabel("Jumlah kelompok").fill("2");
  await page
    .getByRole("button", { name: "Buat kelompok", exact: true })
    .click();
  await expect(page).toHaveURL(/lesson=/);
  const lessonId = new URL(page.url()).searchParams.get("lesson")!;

  // Keluar lalu kembali tanpa parameter lesson, seperti guru yang menutup halaman.
  await page.goto("/guru");
  await page.goto(`/guru/latihan?class=${classId}`);

  // Buka daftar kegiatan tersimpan dan klik Lanjutkan (soft navigation).
  await page
    .getByText("Lanjutkan persiapan atau kegiatan tersimpan", { exact: true })
    .click();
  await page
    .getByRole("link", { name: /Lanjutkan/ })
    .first()
    .click();

  // FIX utama: UI ikut berpindah, bukan cuma URL.
  await expect(
    page.getByRole("button", { name: "Periksa kesiapan", exact: true }),
  ).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`lesson=${lessonId}`));
});
