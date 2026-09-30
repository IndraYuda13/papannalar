import { readFile, readdir, mkdir, writeFile } from "node:fs/promises";
import { sql, literal } from "../tests/harness/postgres.mjs";
import { createServer } from "vite";
import { createHash } from "node:crypto";

const mode = process.argv[2] ?? "rls";
if (mode === "prepare") {
  await mkdir("artifacts/qa/M01/m01c", { recursive: true });
  sql(await readFile("tests/harness/bootstrap.sql", "utf8"));
  sql(
    "create schema if not exists pn_test; revoke all on schema pn_test from public,anon,authenticated; create table if not exists pn_test.migrations(name text primary key, digest text not null)",
  );
  for (const file of (await readdir("supabase/migrations")).sort()) {
    if (!/^\d+_[a-z_]+\.sql$/.test(file)) continue;
    const content = await readFile(`supabase/migrations/${file}`, "utf8");
    const digest = createHash("sha256").update(content).digest("hex");
    const previous = sql(
      `select digest from pn_test.migrations where name='${file}'`,
    );
    if (previous && previous !== digest)
      throw new Error(`Applied test migration changed: ${file}`);
    if (previous) continue;
    // Adopt only the three pre-ledger migrations present in the existing test cluster.
    const legacy = {
      "202609290001_teacher_ownership.sql": "public.classes",
      "202609290002_presentations.sql": "pn_private.presentations",
      "202609290003_command_ledger.sql": "pn_private.presentation_commands",
    }[file];
    if (!legacy || sql(`select to_regclass('${legacy}') is null`) === "t")
      sql(content);
    sql(`insert into pn_test.migrations values('${file}','${digest}')`);
  }
  console.log(
    "Isolated PostgreSQL schema prepared (test auth functions, real migration/RLS).",
  );
} else {
  const output = sql(await readFile("supabase/tests/ownership.sql", "utf8"));
  await writeFile("artifacts/qa/M01/m01c/rls-results.log", output + "\n");
  console.log(output);
  if (mode !== "ownership") {
    const library = sql(await readFile("supabase/tests/library.sql", "utf8"));
    await mkdir("artifacts/qa/video-ready", { recursive: true });
    await writeFile("artifacts/qa/video-ready/library-sql.log", library + "\n");
    console.log(library);
    const videoConnection = sql(
      await readFile("supabase/tests/video-connection.sql", "utf8"),
    );
    await writeFile(
      "artifacts/qa/video-ready/connection-sql.log",
      videoConnection + "\n",
    );
    console.log(videoConnection);
    const pairing = await readFile("supabase/tests/presentations.sql", "utf8");
    const result = sql(pairing);
    await mkdir("artifacts/qa/M04/m04a", { recursive: true });
    await writeFile("artifacts/qa/M04/m04a/rls-results.log", result + "\n");
    console.log(result);
    const stations = sql(await readFile("supabase/tests/stations.sql", "utf8"));
    await mkdir("artifacts/qa/M08", { recursive: true });
    await writeFile("artifacts/qa/M08/station-sql.log", stations + "\n");
    console.log(stations);
    const tools = sql(await readFile("supabase/tests/tools.sql", "utf8"));
    await mkdir("artifacts/qa/M09", { recursive: true });
    await writeFile("artifacts/qa/M09/tool-sql.log", tools + "\n");
    console.log(tools);
    const graphs = sql(await readFile("supabase/tests/graphs.sql", "utf8"));
    await mkdir("artifacts/qa/M14", { recursive: true });
    await writeFile("artifacts/qa/M14/graphs-sql.log", graphs + "\n");
    console.log(graphs);
    const modes = sql(await readFile("supabase/tests/board-modes.sql", "utf8"));
    await writeFile("artifacts/qa/M14/board-modes-sql.log", modes + "\n");
    console.log(modes);
    const guidance = sql(await readFile("supabase/tests/guidance.sql", "utf8"));
    await mkdir("artifacts/qa/M15", { recursive: true });
    await writeFile("artifacts/qa/M15/guidance-sql.log", guidance + "\n");
    console.log(guidance);
    const exit = sql(await readFile("supabase/tests/exit.sql", "utf8"));
    await mkdir("artifacts/qa/M10", { recursive: true });
    await writeFile("artifacts/qa/M10/exit-sql.log", exit + "\n");
    console.log(exit);
    const packageProjection = sql(
      await readFile("supabase/tests/package-presentation.sql", "utf8"),
    );
    await writeFile(
      "artifacts/qa/M10/package-sql.log",
      packageProjection + "\n",
    );
    console.log(packageProjection);
    const capabilities = sql(
      await readFile("supabase/tests/board-capabilities.sql", "utf8"),
    );
    await mkdir("artifacts/qa/M12", { recursive: true });
    await writeFile(
      "artifacts/qa/M12/capabilities-sql.log",
      capabilities + "\n",
    );
    console.log(capabilities);
    const llm = sql(await readFile("supabase/tests/llm.sql", "utf8"));
    await mkdir("artifacts/qa/M13", { recursive: true });
    await writeFile("artifacts/qa/M13/llm-sql.log", llm + "\n");
    console.log(llm);
    const vite = await createServer({
      configFile: false,
      server: { middlewareMode: true },
    });
    try {
      const { boardPackageFixture } = await vite.ssrLoadModule(
        "/tests/fixtures/board-package.ts",
      );
      const { packagePages } = await vite.ssrLoadModule(
        "/src/features/layar/package-navigation.ts",
      );
      const { packet } = boardPackageFixture();
      const pages = packagePages(
        packet.content,
        packet.plan,
        packet.plan.id,
      ).map((p) => p.state);
      const boardContentTest = (
        await readFile("supabase/tests/board-content.sql", "utf8")
      )
        .replace("__BOARD_PACKET__", literal(JSON.stringify(packet)))
        .replace("__BOARD_PAGES__", literal(JSON.stringify(pages)));
      const boardContent = sql(boardContentTest);
      await mkdir("artifacts/qa/M15", { recursive: true });
      await writeFile("artifacts/qa/M15/content-sql.log", boardContent + "\n");
      console.log(boardContent);
      const { syncFixture, syncHistoryFixture } = await vite.ssrLoadModule(
        "/tests/fixtures/sync.ts",
      );
      const syncTest = (
        await readFile("supabase/tests/sync.sql", "utf8")
      ).replace(
        "__SYNC_MUTATION__",
        literal(JSON.stringify(syncFixture().mutation)),
      );
      const sync = sql(syncTest);
      await mkdir("artifacts/qa/M11", { recursive: true });
      await writeFile("artifacts/qa/M11/sync-sql.log", sync + "\n");
      console.log(sync);
      const writerTest = (
        await readFile("supabase/tests/sync-writer.sql", "utf8")
      ).replace(
        "__SYNC_MUTATION__",
        literal(JSON.stringify(syncFixture().mutation)),
      );
      const writer = sql(writerTest);
      await writeFile("artifacts/qa/M11/writer-sql.log", writer + "\n");
      console.log(writer);
      const historyTest = (
        await readFile("supabase/tests/sync-history.sql", "utf8")
      ).replace(
        "__SYNC_MUTATION__",
        literal(JSON.stringify(syncHistoryFixture().mutation)),
      );
      const history = sql(historyTest);
      await writeFile("artifacts/qa/M11/history-sql.log", history + "\n");
      console.log(history);
    } finally {
      await vite.close();
    }
  }
}
