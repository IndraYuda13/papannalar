import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";

const eslint = new ESLint();

async function rules(code: string, filePath = "src/core/bkt/probe.ts") {
  const results = await eslint.lintText(code, { filePath });
  return results.flatMap((result) =>
    result.messages.map((message) => message.ruleId),
  );
}

describe("Core/registry pure dependency guard", () => {
  it.each([
    "./update",
    "../math/probability",
    "../../content/ladder/registry",
    "@/core/bkt/update",
    "@/content/ladder/registry",
  ])("mengizinkan dependency pure %s", async (source) => {
    expect(await rules(`export * from "${source}";`)).toEqual([]);
  });

  it.each([
    "react",
    "next/server",
    "@supabase/supabase-js",
    "../../server/classes",
    "../../local/names",
    "../../contracts/api",
  ])("tetap menolak adapter/framework %s", async (source) => {
    expect(await rules(`export * from "${source}";`)).toContain(
      "no-restricted-imports",
    );
  });

  it.each([
    "Math.random()",
    "Date.now()",
    "new Date()",
    "crypto.randomUUID()",
    'fetch("/api")',
    "window.location.href",
  ])("menolak sumber nondeterministik/lingkungan %s", async (expression) => {
    expect(
      await rules(`export const value = () => ${expression};`),
    ).not.toEqual([]);
  });

  it("registry konten yang diimpor core juga harus pure", async () => {
    expect(
      await rules('export * from "react";', "src/content/ladder/probe.ts"),
    ).toContain("no-restricted-imports");
    expect(
      await rules('export * from "./registry";', "src/content/ladder/probe.ts"),
    ).toEqual([]);
  });
});
