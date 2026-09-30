// Generate the SQL allowlist once for a NEW migration; never rewrite an applied migration.
import { createServer } from "vite";
import { readFile, writeFile } from "node:fs/promises";
import { z } from "zod";
const server = await createServer({
  configFile: false,
  server: { middlewareMode: true },
});
try {
  const contractModule = await server.ssrLoadModule(
    process.argv[3] ?? "/src/contracts/sync.ts",
  );
  const schema = z.toJSONSchema(
    contractModule[process.argv[4] ?? "syncMutationSchema"],
  );
  const schemaId = process.argv[5] ?? "mutation-v1";
  if (!/^[a-z0-9-]+$/.test(schemaId)) throw new Error("Invalid schema ID");
  const file = process.argv[2];
  if (!file || !file.startsWith("supabase/migrations/"))
    throw new Error("New migration path required");
  const original = await readFile(file, "utf8");
  if (
    !original.includes("-- SCHEMA_INSERT") &&
    !original.includes("-- SCHEMA_UPDATE")
  )
    throw new Error("Migration already generated; do not edit");
  await writeFile(
    file,
    original.includes("-- SCHEMA_UPDATE")
      ? original.replace(
          "-- SCHEMA_UPDATE",
          `update pn_private.sync_schemas set body=$schema$${JSON.stringify(schema)}$schema$::jsonb where id='${schemaId}';`,
        )
      : original.replace(
          "-- SCHEMA_INSERT",
          `insert into pn_private.sync_schemas values('${schemaId}',$schema$${JSON.stringify(schema)}$schema$::jsonb);`,
        ),
  );
} finally {
  await server.close();
}
