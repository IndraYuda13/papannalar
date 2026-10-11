import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * A4/A8 — token presence is enforced (DESIGN_BRIEF_V4 §4.5 A4, §11.4 A8).
 *
 * The frozen baseline shipped `bg-pn-amber-100` at five call sites while no such custom
 * property existed, so the negative-value ground rendered as `rgba(0,0,0,0)`; `bg-pn-board`
 * and `rounded-input` had the same defect class (28 call sites for the latter). A utility
 * that compiles to nothing must fail here rather than render transparent in a classroom.
 *
 * This asserts against the *source* token file, which is the only place a theme value can be
 * declared, so it holds for the built CSS too.
 */

const root = new URL("../..", import.meta.url).pathname;
const tokens = readFileSync(join(root, "src/ui/tokens.css"), "utf8");

function sourceFiles(directory: string, found: string[] = []): string[] {
  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) sourceFiles(path, found);
    else if (/\.tsx?$/.test(entry) && !entry.endsWith(".test.ts"))
      found.push(path);
  }
  return found;
}

function propertyNames() {
  return new Set(
    [...tokens.matchAll(/^\s*(--[a-z0-9-]+)\s*:/gim)].map((match) => match[1]),
  );
}

function themeColorNames() {
  return new Set(
    [...tokens.matchAll(/^\s*(--color-[a-z0-9-]+)\s*:/gim)].map(
      (match) => match[1],
    ),
  );
}

function themeRadiusNames() {
  return new Set(
    [...tokens.matchAll(/^\s*(--radius-[a-z0-9-]+)\s*:/gim)].map(
      (match) => match[1],
    ),
  );
}

describe("every emitted design utility resolves to a declared token", () => {
  const files = sourceFiles(join(root, "src"));
  const constants = propertyNames();
  const colors = themeColorNames();
  const radii = themeRadiusNames();

  it("has the three v4 additions the baseline referenced but never declared", () => {
    for (const name of ["--pn-ink-500", "--pn-amber-100", "--pn-sukses-100"])
      expect(constants, name).toContain(name);
  });

  it("resolves every *-pn-* colour utility used in src/", () => {
    // Tailwind v4 emits a utility only when its `--color-*` key exists. A utility without a
    // key compiles to nothing, which is the exact failure A7/A8 describe.
    const used = new Map<string, string>();
    for (const file of files) {
      const source = readFileSync(file, "utf8");
      for (const match of source.matchAll(
        /\b(?:bg|text|border|fill|stroke|ring|outline|divide|accent|caret|decoration|from|via|to)-pn-([a-z0-9-]+)\b/g,
      )) {
        const token = `--color-pn-${match[1]}`;
        if (!colors.has(token) && !used.has(token)) used.set(token, file);
      }
    }
    expect(
      [...used.keys()],
      `Undefined utility colour token(s). Add the --color-* key in src/ui/tokens.css:\n${[
        ...used,
      ]
        .map(([token, file]) => `  ${token} (${file})`)
        .join("\n")}`,
    ).toEqual([]);
  });

  it("resolves every rounded-* theme radius used in src/", () => {
    const used = new Set<string>();
    // Tailwind's own radius scale plus corner prefixes, which name a theme radius too.
    const builtIn = new Set([
      "none",
      "xs",
      "sm",
      "md",
      "lg",
      "xl",
      "2xl",
      "3xl",
      "4xl",
      "full",
    ]);
    // Corner and single-edge prefixes (`rounded-t-3xl` = top corners at the 3xl radius).
    const corners = [
      "tl",
      "tr",
      "br",
      "bl",
      "ss",
      "se",
      "es",
      "ee",
      "t",
      "r",
      "b",
      "l",
      "s",
      "e",
    ];
    for (const file of files) {
      const source = readFileSync(file, "utf8");
      for (const match of source.matchAll(/\brounded-([a-z][a-z0-9-]*)\b/g)) {
        // `rounded-tr-kartu` targets the corner but still needs --radius-kartu.
        const suffix = corners.reduce(
          (value, corner) =>
            value.startsWith(`${corner}-`)
              ? value.slice(corner.length + 1)
              : value,
          match[1],
        );
        if (!suffix || builtIn.has(suffix)) continue;
        const name = `--radius-${suffix}`;
        if (!radii.has(name)) used.add(name);
      }
    }
    expect(
      [...used],
      "Undefined theme radius. Declare it in src/ui/tokens.css @theme inline.",
    ).toEqual([]);
  });

  it("defines both halves of the hairline/edge split", () => {
    for (const name of ["--pn-hairline", "--pn-edge"])
      expect(constants, name).toContain(name);
  });

  it("keeps the board question floor as an invariant constant", () => {
    const globals = readFileSync(join(root, "src/app/globals.css"), "utf8");
    expect(globals).toContain("--board-question: clamp(56px, 3.4vw, 96px)");
    // R2: no rule may set a board question back down to the retired 30px override.
    expect(globals).not.toMatch(/--board-(title|question):\s*30px/);
  });
});
