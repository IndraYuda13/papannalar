import { expect, test, type Page } from "@playwright/test";
import {
  libraryStateSchema,
  runDetailSchema,
  runSchema,
} from "../../src/contracts/library";

const origin = "http://127.0.0.1:3100";
async function sample(page: Page) {
  await page.goto("/masuk");
  await page.getByRole("button", { name: "Coba dengan data contoh" }).click();
  await expect(page).toHaveURL(/\/guru$/);
  const claim = await page.request.post("/api/v1/sample/control", {
    headers: { Origin: origin },
    data: { takeover: true },
  });
  expect(claim.ok()).toBe(true);
}
async function call(page: Page, data: Record<string, unknown>) {
  const response = await page.request.post("/api/v1/library", {
    headers: { Origin: origin },
    data,
  });
  expect(response.ok()).toBe(true);
  return response.json();
}

for (const viewport of [
  { width: 360, height: 800 },
  { width: 1366, height: 768 },
]) {
  test(`D01 system questions explain copying and editable dropdowns persist at ${viewport.width}px`, async ({
    page,
  }, info) => {
    test.setTimeout(90000);
    page.setDefaultTimeout(10000);
    await page.setViewportSize(viewport);
    await sample(page);
    const before = libraryStateSchema.parse(
      await call(page, { action: "list" }),
    );
    const system = before.collections.find(
      (c) => c.source === "system" && c.document.kind === "interactive",
    )!;
    await page.goto(`/guru/soal/${system.id}`);
    await expect(page.getByRole("combobox")).toHaveCount(0);
    await expect(
      page.getByText("Soal sistem tidak diubah langsung."),
    ).toBeVisible();
    await page.screenshot({ path: info.outputPath("system-copy-path.png") });
    await page
      .getByRole("button", { name: "Salin ke Soal Saya", exact: true })
      .click();
    await expect(
      page.getByRole("combobox", { name: "Jenis kumpulan", exact: true }),
    ).toBeEnabled();
    await page
      .getByRole("combobox", { name: "Jenis kumpulan", exact: true })
      .selectOption("cards");
    await page
      .getByRole("region", { name: "Ganti jenis kumpulan" })
      .getByRole("button", { name: "Ganti ke Kartu Nalar" })
      .click();
    for (let index = 0; index < system.document.items.length; index++) {
      await page
        .getByRole("button", { name: new RegExp(`^Soal ${index + 1} `) })
        .click();
      const row = page.getByRole("article", {
        name: `Soal ${index + 1}`,
        exact: true,
      });
      for (const [choice, value] of [
        ["A", "1"],
        ["B", "2"],
        ["C", "3"],
        ["D", "4"],
      ]) {
        await row.getByLabel(`Pilihan ${choice}`, { exact: true }).fill(value);
      }
    }
    await page.getByRole("button", { name: /^Soal 1 / }).click();
    const question = page.getByRole("article", { name: "Soal 1", exact: true });
    const key = question.getByRole("combobox", {
      name: "Kunci jawaban",
      exact: true,
    });
    await expect(key).toBeEnabled();
    await key.focus();
    await key.press("Home");
    await key.press("ArrowDown");
    await key.press("Tab");
    await expect(key).toHaveValue("B");
    const title = `Salinan dropdown ${crypto.randomUUID().slice(0, 8)}`;
    await page.getByLabel("Nama kumpulan", { exact: true }).fill(title);
    await page
      .getByRole("button", { name: "Simpan & siap digunakan", exact: true })
      .click();
    await expect(page).toHaveURL(/\/guru\/soal\?tab=teacher&saved=/);
    const after = libraryStateSchema.parse(
      await call(page, { action: "list" }),
    );
    expect(after.collections.find((c) => c.id === system.id)).toEqual(system);
    const copy = after.collections.find((c) => c.document.title === title)!;
    expect(copy.document.items[0]).toMatchObject({ key: "B" });
    await page.goto(`/guru/soal/${copy.id}`);
    await expect(
      page
        .getByRole("combobox", { name: "Kunci jawaban", exact: true })
        .first(),
    ).toHaveValue("B");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth - innerWidth,
      ),
    ).toBeLessThanOrEqual(1);
  });

  test(`D02 change collection type without losing questions, exercise tool dropdowns and preserve history at ${viewport.width}px`, async ({
    page,
  }, info) => {
    test.setTimeout(90000);
    page.setDefaultTimeout(10000);
    await page.setViewportSize(viewport);
    await sample(page);
    await page.goto("/guru/soal/baru");
    const title = `Jenis dropdown ${crypto.randomUUID().slice(0, 8)}`;
    await page.getByLabel("Nama kumpulan", { exact: true }).fill(title);
    await page
      .getByRole("button", { name: "Tambah soal", exact: true })
      .click();
    const question = page.getByRole("article", { name: "Soal 1", exact: true });
    const kind = page.getByRole("combobox", {
      name: "Jenis kumpulan",
      exact: true,
    });
    await expect(kind).toBeEnabled();
    const prompt = "Dua ditambah tiga berapa?";
    await question.getByLabel("Pertanyaan", { exact: true }).fill(prompt);
    for (const [choice, value] of [
      ["A", "4"],
      ["B", "5"],
      ["C", "6"],
      ["D", "7"],
    ]) {
      await question
        .getByLabel(`Pilihan ${choice}`, { exact: true })
        .fill(value);
    }
    await question
      .getByRole("combobox", { name: "Kunci jawaban", exact: true })
      .selectOption("B");
    await question.getByLabel("Penjelasan guru (opsional)").fill("2 + 3 = 5.");
    await kind.selectOption("interactive");
    const conversion = page.getByRole("region", {
      name: "Ganti jenis kumpulan",
    });
    await expect(conversion).toBeVisible();
    await conversion.scrollIntoViewIfNeeded();
    await page.screenshot({ path: info.outputPath("change-type.png") });
    await conversion
      .getByRole("button", { name: "Tetap dengan jenis sekarang" })
      .click();
    await expect(kind).toHaveValue("cards");
    await expect(question.getByLabel("Pilihan B", { exact: true })).toHaveValue(
      "5",
    );
    await kind.selectOption("interactive");
    await conversion
      .getByRole("button", { name: "Ganti ke interaktif" })
      .click();
    await expect(
      question.getByLabel("Pertanyaan", { exact: true }),
    ).toHaveValue(prompt);
    await expect(
      question.getByRole("combobox", { name: "Aktivitas", exact: true }),
    ).toHaveValue("writing");
    await page
      .getByRole("button", { name: "Batalkan pergantian jenis" })
      .click();
    await expect(kind).toHaveValue("cards");
    await expect(
      question.getByRole("combobox", { name: "Kunci jawaban", exact: true }),
    ).toHaveValue("B");
    await expect(question.getByLabel("Penjelasan guru (opsional)")).toHaveValue(
      "2 + 3 = 5.",
    );
    await page
      .getByRole("button", { name: "Simpan & siap digunakan", exact: true })
      .click();
    await expect(page).toHaveURL(/\/guru\/soal\?tab=teacher&saved=/);
    const state = libraryStateSchema.parse(
      await call(page, { action: "list" }),
    );
    const saved = state.collections.find((c) => c.document.title === title)!;
    const classes = await page.request.get("/api/v1/classes?mode=demo");
    const classList: { classes: { id: string }[] } = await classes.json();
    const run = runSchema.parse(
      await call(page, {
        action: "start",
        id: crypto.randomUUID(),
        classId: classList.classes[0].id,
        collectionId: saved.id,
        version: saved.version,
        mode: "assessment",
        date: "2026-10-05",
      }),
    );
    await page.goto(`/guru/soal/${saved.id}`);
    await kind.selectOption("interactive");
    await conversion
      .getByRole("button", { name: "Ganti ke interaktif" })
      .click();
    const activity = question.getByRole("combobox", {
      name: "Aktivitas",
      exact: true,
    });
    for (const tool of [
      "number-line",
      "fractions",
      "ratio",
      "algebra",
      "balance",
      "graphs",
      "writing",
    ]) {
      await activity.selectOption(tool);
      await expect(activity).toHaveValue(tool);
      await expect(
        question.getByLabel("Pertanyaan", { exact: true }),
      ).toHaveValue(prompt);
      if (tool === "number-line") {
        const direction = question.getByLabel("Arah tampilan");
        await direction.focus();
        await direction.press("End");
        await direction.press("Tab");
        await expect(direction).toHaveValue("vertical");
      }
      if (tool === "fractions") {
        await question.getByLabel("Cara bermain").selectOption("add");
        await expect(
          question.getByLabel("Penyebut 2", { exact: true }),
        ).toBeVisible();
        await question.getByLabel("Cara bermain").selectOption("equivalent");
        await expect(question.getByLabel("Cara bermain")).toHaveValue(
          "equivalent",
        );
        await question.getByLabel("Cara bermain").selectOption("represent");
        await expect(
          question.getByLabel("Penyebut 2", { exact: true }),
        ).toHaveCount(0);
      }
    }
    await activity.selectOption("fractions");
    await question.getByLabel("Cara bermain").selectOption("add");
    await page
      .getByRole("button", { name: "Simpan & siap digunakan", exact: true })
      .click();
    await expect(page).toHaveURL(/\/guru\/soal\?tab=teacher&saved=/);
    const updated = libraryStateSchema
      .parse(await call(page, { action: "list" }))
      .collections.find((c) => c.id === saved.id)!;
    expect(updated.version).toBe(saved.version + 1);
    expect(updated.document).toMatchObject({
      kind: "interactive",
      items: [
        {
          kind: "interactive",
          prompt,
          tool: { kind: "fractions", operation: "add" },
        },
      ],
    });
    const historic = runDetailSchema.parse(
      await call(page, { action: "detail", id: run.id }),
    );
    expect(historic.run.document).toEqual(saved.document);
    await page.goto(`/guru/soal/${saved.id}`);
    await expect(activity).toHaveValue("fractions");
    await expect(question.getByLabel("Cara bermain")).toHaveValue("add");
    await kind.selectOption("cards");
    await conversion
      .getByRole("button", { name: "Ganti ke Kartu Nalar" })
      .click();
    await expect(
      question.getByLabel("Pertanyaan", { exact: true }),
    ).toHaveValue(prompt);
    await expect(question.getByLabel("Pilihan A", { exact: true })).toHaveValue(
      "",
    );
    await page
      .getByRole("button", { name: "Batalkan pergantian jenis" })
      .click();
    await expect(activity).toHaveValue("fractions");
    await expect(question.getByLabel("Cara bermain")).toHaveValue("add");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth - innerWidth,
      ),
    ).toBeLessThanOrEqual(1);
  });
}

test("D03 a copied interactive draft keeps its own URL and dropdown values after reload", async ({
  page,
}) => {
  page.setDefaultTimeout(10000);
  await sample(page);
  const state = libraryStateSchema.parse(await call(page, { action: "list" }));
  const system = state.collections.find(
    (c) =>
      c.source === "system" &&
      c.document.items.some(
        (i) => i.kind === "interactive" && i.tool.kind === "number-line",
      ),
  )!;
  await page.goto(`/guru/soal/${system.id}`);
  await expect(page.getByRole("combobox")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Salin ke Soal Saya", exact: true })
    .click();
  const title = `Draft dropdown ${crypto.randomUUID().slice(0, 8)}`;
  await page.getByLabel("Nama kumpulan", { exact: true }).fill(title);
  const question = page.getByRole("article", { name: "Soal 1", exact: true });
  await question
    .getByRole("combobox", { name: "Aktivitas", exact: true })
    .selectOption("fractions");
  await question
    .getByRole("combobox", { name: "Cara bermain", exact: true })
    .selectOption("equivalent");
  await page
    .getByRole("button", { name: "Simpan untuk nanti", exact: true })
    .click();
  await expect(page).not.toHaveURL(new RegExp(system.id));
  await page.reload();
  await expect(page.getByLabel("Nama kumpulan", { exact: true })).toHaveValue(
    title,
  );
  await expect(
    question.getByRole("combobox", { name: "Aktivitas", exact: true }),
  ).toHaveValue("fractions");
  await expect(
    question.getByRole("combobox", { name: "Cara bermain", exact: true }),
  ).toHaveValue("equivalent");
  const after = libraryStateSchema.parse(await call(page, { action: "list" }));
  expect(after.collections.find((c) => c.id === system.id)).toEqual(system);
});
