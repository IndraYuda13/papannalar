import { test, expect } from "@playwright/test";
import { loginTeacher } from "../browser/helpers";

for (const width of [360, 768]) {
  test(`GUIDE01 ${width}: teacher follows steps, keeps drafts, sees missing evidence and returns to individual needs`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 844 });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await loginTeacher(page, { guided: true });
    await page.getByLabel("Gunakan kelas").selectOption("demo");
    await page.getByRole("button", { name: "Buat kelas", exact: true }).click();
    await page.getByLabel("Nama kelas", { exact: true }).fill("7 Panduan");
    await page.getByLabel("Jumlah siswa", { exact: true }).fill("3");
    await page
      .getByRole("button", { name: "Simpan kelas", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Siapkan soal", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Mulai mengajar", exact: true })
      .click();
    const cycle = page.getByRole("region", {
      name: "Siklus kelas",
      exact: true,
    });
    const steps = cycle.getByRole("navigation", {
      name: "Langkah sesi belajar",
    });
    await expect(
      steps.getByRole("button", { name: "Cek siswa", exact: true }),
    ).toHaveAttribute("aria-current", "step");
    await expect(
      steps.getByRole("button", { name: "Kegiatan", exact: true }),
    ).toBeDisabled();
    await expect(
      cycle.getByRole("button", { name: "Tutup kelas", exact: true }),
    ).toBeHidden();
    await page.screenshot({
      path: test.info().outputPath(`steps-${width}.png`),
      fullPage: true,
    });
    await cycle.getByText("Kehadiran sesi", { exact: true }).click();
    await cycle.getByLabel("Tidak hadir absen 3", { exact: true }).check();
    await cycle
      .getByRole("button", { name: "Input manual", exact: true })
      .click();
    const answer = await cycle
      .getByTestId("teacher-check-1")
      .getAttribute("data-answer");
    await cycle
      .getByLabel("Cek baris 1", { exact: true })
      .selectOption(answer!);
    await steps
      .getByRole("button", { name: "Periksa kelompok", exact: true })
      .click();
    await expect(
      cycle.getByRole("button", {
        name: "Gunakan pembagian kelompok ini",
        exact: true,
      }),
    ).toBeDisabled();
    await cycle
      .getByRole("button", { name: "Kembali ke jawaban siswa", exact: true })
      .click();
    await expect(cycle.getByLabel("Cek baris 1", { exact: true })).toHaveValue(
      answer!,
    );
    await expect(cycle.getByLabel("Cek baris 2", { exact: true })).toHaveValue(
      "missing",
    );
    for (const student of [1, 2]) {
      if (student === 2)
        await cycle
          .getByRole("button", { name: "Input manual", exact: true })
          .click();
      await cycle
        .getByLabel("Absen cek sesi", { exact: true })
        .selectOption({ label: String(student) });
      for (let row = 1; row <= 10; row++) {
        const key = await cycle
          .getByTestId(`teacher-check-${row}`)
          .getAttribute("data-answer");
        await cycle
          .getByLabel(`Cek baris ${row}`, { exact: true })
          .selectOption(key!);
      }
      await cycle
        .getByRole("button", { name: "Simpan hasil cek", exact: true })
        .click();
      await expect(cycle.getByTestId("cycle-scan-count")).toContainText(
        `${student}/3`,
      );
    }
    await cycle
      .getByRole("button", { name: "Lanjut · periksa kelompok", exact: true })
      .click();
    await expect(
      cycle.getByLabel("Saran kelompok", { exact: true }),
    ).toContainText("2 siswa");
    await cycle
      .getByRole("button", {
        name: "Gunakan pembagian kelompok ini",
        exact: true,
      })
      .click();
    await cycle
      .getByRole("button", { name: "Lanjut · kegiatan kelompok", exact: true })
      .click();
    await expect(
      cycle.getByRole("button", { name: "Mulai rotasi", exact: true }),
    ).toBeVisible();
    await expect(
      cycle.getByRole("region", { name: "Hasil cek sesi", exact: true }),
    ).toBeHidden();
    await cycle
      .getByRole("button", { name: "Lanjut · cek akhir siswa", exact: true })
      .click();
    await expect(
      cycle.getByRole("button", {
        name: "Siapkan pertanyaan penutup",
        exact: true,
      }),
    ).toBeVisible();
    await cycle
      .getByRole("button", { name: "Tutup kelas", exact: true })
      .click();
    await cycle
      .getByRole("checkbox", { name: /Selesaikan penilaian meskipun/ })
      .check();
    await cycle
      .getByRole("button", { name: "Simpan penilaian sesi", exact: true })
      .click();
    await expect(cycle.getByTestId("cycle-status")).toContainText(
      "penilaian tersimpan",
    );
    await cycle
      .getByRole("link", {
        name: "Selesai · lihat kebutuhan kelas",
        exact: true,
      })
      .click();
    await expect(page).toHaveURL(/\/guru\/kelas\/[^?]+\?view=learning/);
    const summary = page.getByRole("region", {
      name: "Kebutuhan belajar kelas",
      exact: true,
    });
    await expect(summary).toContainText("2 dari 3 siswa");
    await expect(summary).toContainText("Belum cukup informasi");
    await expect(summary).toContainText("Siap mencoba materi lanjutan");
    await page.reload();
    await expect(summary).toContainText("2 dari 3 siswa");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
    await page.screenshot({
      path: test.info().outputPath(`learning-${width}.png`),
      fullPage: true,
    });
    const firstStudent = summary.locator(".learning-students > li").first();
    await firstStudent.getByText("Lihat rincian", { exact: true }).click();
    await expect(
      firstStudent.getByText("Jawaban cek pada sesi 1.", { exact: false }),
    ).toBeVisible();
    await expect(firstStudent.getByText(/· Kunci/).first()).toBeVisible();
    await firstStudent.screenshot({
      path: test.info().outputPath(`student-${width}.png`),
    });
    await summary
      .getByRole("link", {
        name: "Siapkan pertemuan berikutnya",
        exact: true,
      })
      .click();
    await expect(page).toHaveURL(/\/guru\/latihan\?.+#teacher-prepare/);
    await page
      .getByRole("button", { name: "Siapkan soal berikutnya", exact: true })
      .click();
    await expect(page.locator("#practice-new-package")).toHaveAttribute(
      "open",
      "",
    );
    await page
      .getByRole("button", { name: "Buat latihan baru", exact: true })
      .click();
    await expect(
      page.getByText("Soal cek pemahaman (5)", { exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Mulai mengajar", exact: true })
      .click();
    await expect(cycle.getByTestId("cycle-status")).toContainText("Sesi 2");
    await expect(cycle.getByTestId("cycle-scan-count")).toContainText("0/3");
    await expect(
      steps.getByRole("button", { name: "Cek siswa", exact: true }),
    ).toHaveAttribute("aria-current", "step");
    expect(errors).toEqual([]);
  });
}
