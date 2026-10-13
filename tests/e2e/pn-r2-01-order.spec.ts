// FRAME verification for kanban t_fd9efc73 (defect PN-R2-01): the phase-"ready"
// readiness checklist (ul[aria-label="Ringkasan kesiapan kelompok"]) must list groups in
// the same order as the edit grid (ul[aria-label="Kelompok yang perlu diatur"]), whose
// order is the teacher's own arrangement. Before the fix the checklist rendered the DTO's
// group_id-sorted assignments[], so the same lesson looked stable on reload and arbitrary
// across lessons.
//
// The assertion is only meaningful when a uuid sort of the group ids produces a DIFFERENT
// sequence, so the spec requires two discriminating lessons before it judges anything: a
// coincidental match would otherwise pass a broken build.
import { test, expect, type Page } from "@playwright/test";
import { appOrigin } from "../harness/ports.mjs";
import { registerTeacher } from "../browser/helpers";
import { mkdir, writeFile } from "node:fs/promises";

const OUT = process.env["PNL_FRAME_EVIDENCE"] ?? "artifacts/qa/learning/pn-r2-01";
const WIDTHS = [360, 1366];
const GRID = 'ul[aria-label="Kelompok yang perlu diatur"] > li';
const ROWS = 'ul[aria-label="Ringkasan kesiapan kelompok"] > li';

async function call(page: Page, path: string, data: object) {
  const response = await page.request.post(path, {
    headers: { Origin: appOrigin },
    data,
  });
  expect(response.ok(), await response.text()).toBe(true);
  return response.json();
}

async function seedLesson(page: Page, label: string, count: number) {
  const classId = crypto.randomUUID();
  await call(page, "/api/v1/classes", {
    id: classId,
    label,
    grade: 7,
    count: 9,
    mode: "pilot",
  });
  const collectionId = crypto.randomUUID();
  await call(page, "/api/v1/library", {
    contractVersion: 2,
    action: "save",
    id: collectionId,
    revision: 0,
    ready: true,
    document: {
      title: `Latihan ${label}`,
      kind: "cards",
      items: [
        {
          id: crypto.randomUUID(),
          kind: "card",
          prompt: "Mana yang lebih besar?",
          options: ["1/2", "3/4", "1/4", "0"],
          key: "B",
          explanation: "",
        },
        {
          id: crypto.randomUUID(),
          kind: "card",
          prompt: "2 + 3 = ?",
          options: ["4", "5", "6", "7"],
          key: "B",
          explanation: "",
        },
      ],
    },
    mapping: {
      default: {
        topicId: "pecahan",
        competencyId: "pecahan-representasi",
        mappingVersion: 1,
      },
      overrides: [],
    },
  });

  await page.goto(`/guru/latihan?class=${classId}`);
  await page.getByLabel("Jumlah kelompok").fill(String(count));
  const create = page.getByRole("button", {
    name: "Buat kelompok",
    exact: true,
  });
  await expect(create).toBeEnabled({ timeout: 30000 });
  await create.click();
  await expect(page).toHaveURL(/lesson=/, { timeout: 30000 });
  const lessonId = new URL(page.url()).searchParams.get("lesson")!;

  const cards = page.locator(GRID);
  await expect(cards).toHaveCount(count, { timeout: 30000 });

  // Each card owns its own method radio + collection select; drive them through the
  // card list so the interaction can never land on a different group than the one whose
  // order we later compare.
  for (let i = 0; i < count; i++) {
    const card = cards.nth(i);
    const radio = card.getByLabel("Mengerjakan soal dengan kartu", {
      exact: true,
    });
    await radio.check();
    await expect(radio).toBeChecked();
    const select = card.getByLabel("Soal yang dipakai");
    await select.selectOption(collectionId);
    await expect(select).toHaveValue(collectionId);
  }

  // The button stays disabled while any group is still incomplete, so wait for it to be
  // enabled and then confirm the phase actually moved; a stale click is retried.
  const check = page.getByRole("button", {
    name: "Periksa kesiapan",
    exact: true,
  });
  const ready = page.getByRole("heading", { name: "Siap mulai?", exact: true });
  await expect(check).toBeEnabled({ timeout: 30000 });
  for (let attempt = 0; attempt < 5; attempt++) {
    await check.click();
    if (
      await ready
        .waitFor({ state: "visible", timeout: 8000 })
        .then(() => true)
        .catch(() => false)
    )
      break;
    await expect(check).toBeEnabled({ timeout: 30000 });
  }
  await expect(ready).toBeVisible({ timeout: 30000 });
  return { classId, collectionId, lessonId };
}

// "Kelompok 1 · 3 siswa" (grid) and "Kelompok 1" (checklist) both describe the same group.
const label = (text: string | null) =>
  (text?.match(/Kelompok\s+\d+/)?.[0] ?? (text ?? "").trim()).trim();

type Row = {
  heading: string | null;
  meta: string | null;
  columns: string;
  left: number;
  right: number;
  metaWidth: number | null;
  metaRight: number | null;
  checkboxWidth: number | null;
  checkboxHeight: number | null;
  metaInsideRow: boolean | null;
  overflowsRow: boolean;
};
type Shot = {
  gridOrder: (string | null)[];
  readyOrder: (string | null)[];
  rows: Row[];
  hint: string | null;
  scrollWidth: number;
  innerWidth: number;
};

async function shot(page: Page): Promise<Shot> {
  return page.evaluate(
    ([gridSel, rowSel]) => {
      const read = (sel: string): Row[] =>
        [...document.querySelectorAll(`${sel}`)].map((li) => {
          const node = li as HTMLElement;
          const box = node.getBoundingClientRect();
          const meta = node.querySelector(".studio-row-meta") as HTMLElement | null;
          const input = node.querySelector(
            'input[type="checkbox"]',
          ) as HTMLInputElement | null;
          const metaBox = meta?.getBoundingClientRect();
          const inputBox = input?.getBoundingClientRect();
          return {
            heading: node.querySelector("h2")?.textContent?.trim() ?? null,
            meta: meta?.textContent?.trim() ?? null,
            columns: getComputedStyle(node).gridTemplateColumns,
            left: Math.round(box.left),
            right: Math.round(box.right),
            metaWidth: metaBox ? Math.round(metaBox.width) : null,
            metaRight: metaBox ? Math.round(metaBox.right) : null,
            checkboxWidth: inputBox ? Math.round(inputBox.width) : null,
            checkboxHeight: inputBox ? Math.round(inputBox.height) : null,
            metaInsideRow: metaBox
              ? Math.round(metaBox.right) <= Math.round(box.right) + 1
              : null,
            overflowsRow: metaBox
              ? Math.round(metaBox.right) > Math.round(box.right) + 1
              : false,
          };
        });
      const grid = read(gridSel);
      const rows = read(rowSel);
      return {
        gridOrder: grid.map((r) => r.heading),
        readyOrder: rows.map((r) => r.heading),
        rows,
        hint:
          document.body.innerText.match(/Centang [\s\S]{0,200}?sebelum mulai\./)?.[0] ??
          null,
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
      };
    },
    [GRID, ROWS],
  );
}

test("PN-R2-01 ready checklist follows the grid's group order", async ({
  page,
}) => {
  test.setTimeout(300000);
  await mkdir(OUT, { recursive: true });
  const log: Record<string, unknown> = {
    app: appOrigin,
    widths: WIDTHS,
    lessons: [],
    consoleErrors: [],
  };
  const consoleErrors = log.consoleErrors as string[];
  page.on("console", (m) => m.type() === "error" && consoleErrors.push(m.text()));
  page.on("pageerror", (e) => consoleErrors.push(`pageerror: ${e.message}`));

  await registerTeacher(page);

  const lessons: Record<string, any>[] = [];
  let discriminating = 0;
  for (let attempt = 1; attempt <= 6 && discriminating < 2; attempt++) {
    // GROUP_PAGE_SIZE is 4, so both lessons stay within one grid page: the DOM comparison
    // below is then a complete list-vs-list check instead of a page-1 slice.
    const count = attempt % 2 === 0 ? 4 : 3;
    const seeded = await seedLesson(page, `Kelas urut ${attempt}`, count);
    const dto = await call(page, "/api/v1/group-lessons", {
      action: "detail",
      id: seeded.lessonId,
    });
    const nameOf = Object.fromEntries(
      (dto.groups as { id: string; label: string }[]).map((g) => [g.id, g.label]),
    ) as Record<string, string>;
    const groupIds = (dto.groups as { id: string }[]).map((g) => g.id);
    const assignIds = (dto.assignments as { groupId: string }[]).map(
      (a) => a.groupId,
    );
    // A uuid sort must differ from the stored arrangement, else this lesson cannot tell a
    // fixed build from a broken one.
    const isDiscriminating =
      JSON.stringify([...groupIds].sort()) !== JSON.stringify(groupIds);
    const entry: Record<string, any> = {
      classLabel: `Kelas urut ${attempt}`,
      lessonId: seeded.lessonId,
      groupCount: count,
      api: {
        groupOrder: (dto.groups as { label: string }[]).map((g) => g.label),
        assignmentOrder: assignIds.map((id) => nameOf[id] ?? id.slice(0, 8)),
        assignmentFollowsGroupOrder:
          JSON.stringify(groupIds) === JSON.stringify(assignIds),
        assignmentIsUuidSorted:
          JSON.stringify([...assignIds].sort()) === JSON.stringify(assignIds),
        uuidOrderDiffersFromGroupOrder: isDiscriminating,
        // What the pre-fix build would have rendered in the checklist.
        preFixWouldRender: [...assignIds]
          .sort()
          .map((id) => nameOf[id] ?? id.slice(0, 8)),
      },
      widths: {} as Record<string, any>,
    };

    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height: 900 });
      await page.waitForTimeout(200);
      const s = await shot(page);
      const gridOrder = s.gridOrder.map(label);
      const readyOrder = s.readyOrder.map(label);
      entry.widths[width] = {
        gridOrder,
        readyOrder,
        rows: s.rows,
        hint: s.hint,
        ordersMatch: JSON.stringify(gridOrder) === JSON.stringify(readyOrder),
        matchesApiGroupOrder:
          JSON.stringify(readyOrder) ===
          JSON.stringify(entry.api.groupOrder) &&
          JSON.stringify(gridOrder) ===
            JSON.stringify(entry.api.groupOrder),
        noHorizontalOverflow: s.scrollWidth <= s.innerWidth,
        scrollWidth: s.scrollWidth,
        innerWidth: s.innerWidth,
      };
      await page.screenshot({
        path: `${OUT}/PN-R2-01-verify-${attempt}-${width}.png`,
        fullPage: true,
      });
    }

    // Reload stability: a fresh read of the same lesson must not reshuffle the checklist.
    // load() always restores the edit phase, so walk back to "ready" the way the teacher does.
    await page.reload();
    const again = page.getByRole("button", {
      name: "Periksa kesiapan",
      exact: true,
    });
    const readyAgain = page.getByRole("heading", {
      name: "Siap mulai?",
      exact: true,
    });
    await expect(again).toBeEnabled({ timeout: 30000 });
    for (let attempt = 0; attempt < 5; attempt++) {
      await again.click();
      if (
        await readyAgain
          .waitFor({ state: "visible", timeout: 8000 })
          .then(() => true)
          .catch(() => false)
      )
        break;
      await expect(again).toBeEnabled({ timeout: 30000 });
    }
    await expect(readyAgain).toBeVisible({ timeout: 30000 });
    const after = await shot(page);
    entry.afterReload = {
      readyOrder: after.readyOrder.map(label),
      stable:
        JSON.stringify(after.readyOrder.map(label)) ===
        JSON.stringify(entry.widths[1366].readyOrder),
    };
    entry.discriminating = isDiscriminating;
    if (isDiscriminating) discriminating += 1;
    lessons.push(entry);
  }

  log.lessons = lessons;
  log.discriminatingLessons = discriminating;
  await writeFile(`${OUT}/PN-R2-01-verify.json`, JSON.stringify(log, null, 2));

  expect(
    discriminating,
    "need >=2 lessons whose uuid order differs from the arranged order",
  ).toBeGreaterThanOrEqual(2);

  for (const entry of lessons) {
    expect(
      entry.api.assignmentFollowsGroupOrder,
      `DTO assignments follow the arranged group order (${entry.classLabel})`,
    ).toBe(true);
    for (const width of WIDTHS) {
      const w = entry.widths[width];
      expect(
        w.ordersMatch,
        `checklist order equals grid order at ${width}px (${entry.classLabel})`,
      ).toBe(true);
      expect(
        w.matchesApiGroupOrder,
        `both lists equal the DTO group order at ${width}px (${entry.classLabel})`,
      ).toBe(true);
      expect(
        w.noHorizontalOverflow,
        `no horizontal overflow at ${width}px (${entry.classLabel})`,
      ).toBe(true);
    }
    expect(
      entry.afterReload.stable,
      `order survives reload (${entry.classLabel})`,
    ).toBe(true);
  }

  // PRISM's regression risk: the reorder must not disturb the readiness row layout that
  // carries the "Cetakan siap" control, which was measured at 360px before the fix.
  for (const entry of lessons) {
    const w = entry.widths[360];
    expect(w.rows.length, "one readiness row per group").toBe(entry.groupCount);
    for (const row of w.rows as Row[]) {
      expect(row.metaInsideRow, "trailing cell stays inside the row").toBe(true);
      expect(row.overflowsRow, "trailing cell does not overflow the row").toBe(
        false,
      );
      if (row.meta === "Tanpa cetak") continue;
      expect(
        row.checkboxWidth,
        "print checkbox keeps a hit area",
      ).toBeGreaterThan(0);
      expect(row.checkboxHeight).toBeGreaterThan(0);
    }
  }
});
