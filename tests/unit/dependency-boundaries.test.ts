import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";

const eslint = new ESLint();

async function ruleIds(code: string, filePath: string) {
  const results = await eslint.lintText(code, { filePath });
  return results.flatMap((result) =>
    result.messages.map((message) => message.ruleId),
  );
}

describe("Batas dependency fondasi", () => {
  it("mengizinkan core TypeScript murni", async () => {
    expect(
      await ruleIds(
        "export const identity = (n: number): number => n;",
        "src/core/probe.ts",
      ),
    ).toEqual([]);
  });

  it.each([
    "react",
    "next/navigation",
    "@supabase/supabase-js",
    "@/local/db",
    "../server/sync",
  ])("menolak %s dari core", async (source) => {
    expect(
      await ruleIds(
        `import * as adapter from "${source}"; export { adapter };`,
        "src/core/probe.ts",
      ),
    ).toContain("no-restricted-imports");
  });

  it("menolak jaringan langsung dalam core", async () => {
    expect(
      await ruleIds(
        'export const load = () => fetch("https://example.invalid");',
        "src/core/probe.ts",
      ),
    ).toContain("no-restricted-globals");
  });

  it.each(["@/local/names", "@/server/auth", "@/features/guru/teacher-shell"])(
    "menolak %s dari surface publik",
    async (source) => {
      expect(
        await ruleIds(
          `import * as privateState from "${source}"; export { privateState };`,
          "src/features/layar/probe.ts",
        ),
      ).toContain("no-restricted-imports");
    },
  );

  it("mengizinkan kontrak publik di surface papan", async () => {
    expect(
      await ruleIds(
        'import type { PublicBoard } from "@/contracts/board"; export type Board = PublicBoard;',
        "src/features/layar/probe.ts",
      ),
    ).toEqual([]);
  });

  it.each([
    "src/server/sync.ts",
    "src/contracts/api.ts",
    "src/local/db.ts",
    "src/features/bisik/provider.ts",
    "src/ui/probe.tsx",
  ])("melarang import nama lokal dari %s", async (filePath) => {
    expect(
      await ruleIds(
        'import { createNameRepository } from "@/local/names"; export { createNameRepository };',
        filePath,
      ),
    ).toContain("no-restricted-imports");
  });

  it("mengizinkan join identitas hanya pada boundary guru", async () => {
    expect(
      await ruleIds(
        'import { createNameRepository } from "@/local/names"; export { createNameRepository };',
        "src/features/guru/probe.ts",
      ),
    ).toEqual([]);
  });

  it("kontrak boleh mengimpor schema kontrak tetangga", async () => {
    expect(
      await ruleIds(
        'import { studentRefSchema } from "./domain"; export { studentRefSchema };',
        "src/contracts/probe.ts",
      ),
    ).toEqual([]);
  });

  it("repository nama tidak boleh mengirim request", async () => {
    expect(
      await ruleIds(
        'export const send = () => fetch("/api");',
        "src/local/names.ts",
      ),
    ).toContain("no-restricted-globals");
  });
});
