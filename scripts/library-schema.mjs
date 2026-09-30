// Developer tool: updates only the unapplied additive Video Ready migration.
import { createServer } from "vite";
import { readFile, writeFile } from "node:fs/promises";
import { z } from "zod";
const vite = await createServer({
  configFile: false,
  server: { middlewareMode: true },
});
try {
  const schemas = await vite.ssrLoadModule("/src/contracts/library.ts");
  const path = "supabase/migrations/202609300033_library.sql";
  let sql = await readFile(path, "utf8");
  for (const [token, key] of [
    ["__LIBRARY_DRAFT_SCHEMA__", "draftDocumentSchema"],
    ["__LIBRARY_ACTION_SCHEMA__", "libraryActionSchema"],
  ])
    sql = sql.replace(
      token,
      "'" +
        JSON.stringify(
          z.toJSONSchema(schemas[key], { unrepresentable: "any" }),
        ).replaceAll("'", "''") +
        "'",
    );
  await writeFile(path, sql);
} finally {
  await vite.close();
}
