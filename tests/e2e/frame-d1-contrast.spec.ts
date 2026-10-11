import { expect, test, type Page } from "@playwright/test";
import { sampleLogin } from "../browser/helpers";
import { appOrigin } from "../harness/ports.mjs";

async function sample(page: Page) {
  await sampleLogin(page);
  expect(
    (
      await page.request.post("/api/v1/sample/control", {
        headers: { Origin: appOrigin },
        data: { takeover: true },
      })
    ).ok(),
  ).toBe(true);
}

/**
 * A6/A17 — contrast on *rendered* computed pairs.
 *
 * The brief's own numbers are arithmetic on token values; a token can hold the right
 * literal and still be composited against something else, so this measures what the
 * browser actually paints for the body-copy and label roles on the D1 surfaces.
 */

const hexToRgb = (value: string): [number, number, number] | null => {
  const m = value.match(
    /rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)(?:[,\s/]+([\d.]+))?\s*\)/,
  );
  if (!m) return null;
  const alpha = m[4] === undefined ? 1 : Number(m[4]);
  if (alpha < 0.999) return null; // unresolved ground; the caller reports it
  return [Number(m[1]), Number(m[2]), Number(m[3])];
};

const channel = (c: number) => {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};

const luminance = ([r, g, b]: [number, number, number]) =>
  0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);

const ratio = (a: [number, number, number], b: [number, number, number]) => {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
};

test("A6/A17 D1 text roles meet contrast on their painted ground", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1366, height: 900 });
  await sample(page);
  await page.goto("/guru");
  await expect(page.locator('[data-surface="guru"]')).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Ruang mengajar", exact: true }),
  ).toBeVisible();

  const samples = await page.evaluate(() => {
    const ground = (el: Element): string => {
      let node: Element | null = el;
      while (node) {
        const bg = getComputedStyle(node).backgroundColor;
        if (bg && !/rgba\(\s*0,\s*0,\s*0,\s*0\s*\)|transparent/.test(bg)) {
          return bg;
        }
        node = node.parentElement;
      }
      return "rgb(255, 255, 255)";
    };
    const out: {
      role: string;
      text: string;
      fg: string;
      bg: string;
      size: string;
    }[] = [];
    const push = (role: string, el: Element | null) => {
      if (!el) return;
      const style = getComputedStyle(el);
      out.push({
        role,
        text: (el.textContent ?? "").trim().slice(0, 28),
        fg: style.color,
        bg: ground(el),
        size: style.fontSize,
      });
    };
    push("h1", document.querySelector('[data-surface="guru"] h1'));
    push("page-sub", document.querySelector(".studio-page-header p"));
    push("section-label", document.querySelector(".studio-section-label"));
    push("nav-label", document.querySelector(".nav-label"));
    push("row-body", document.querySelector(".studio-row p"));
    return out;
  });

  expect(samples.length).toBeGreaterThan(3);

  const failures: string[] = [];
  const rows: string[] = [];
  for (const s of samples) {
    const fg = hexToRgb(s.fg);
    const bg = hexToRgb(s.bg);
    if (!fg || !bg) {
      failures.push(`${s.role}: could not resolve ${!fg ? s.fg : s.bg}`);
      continue;
    }
    const r = ratio(fg, bg);
    const px = parseFloat(s.size);
    const bold = false;
    // WCAG 2.1: 4.5:1 body, 3:1 large (>=24px, or >=18.66px bold).
    const large = px >= 24 || (bold && px >= 18.66);
    const need = large ? 3 : 4.5;
    rows.push(
      `${s.role.padEnd(14)} ${r.toFixed(2)}:1  need ${need}:1  ${s.fg} on ${s.bg}  "${s.text}"`,
    );
    if (r + 1e-9 < need)
      failures.push(`${s.role} ${r.toFixed(2)}:1 < ${need}:1`);
  }

  console.log("A6/A17 rendered pairs:\n" + rows.join("\n"));
  expect(failures, failures.join("; ")).toEqual([]);
});
