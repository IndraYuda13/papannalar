import { createServer } from "vite";
import { z } from "zod";
import { writeDiagnostic } from "./learning-diagnostics.mjs";
const v = await createServer({
  configFile: false,
  server: { middlewareMode: true },
});
try {
  const specs = [
    ["library-v2", "library", "libraryV2ActionSchema"],
    ["group-action-v1", "group-lesson", "groupLessonActionSchema"],
    ["group-board-v1", "group-board", "groupBoardActionSchema"],
    ["group-lesson-v1", "group-lesson", "groupLessonSchema"],
    ["mapping-v1", "learning-evidence", "collectionMappingSchema"],
    ["results-v1", "results-index", "resultsActionSchema"],
  ];
  const normalize = (x) =>
    Array.isArray(x)
      ? x.map(normalize)
      : x && typeof x === "object"
        ? Object.fromEntries(
            Object.entries(x).map(([k, v]) => [
              k === "oneOf" ? "anyOf" : k,
              normalize(v),
            ]),
          )
        : typeof x === "string"
          ? x.replaceAll("\\\\d", "[0-9]").replaceAll("\\d", "[0-9]")
          : x;
  const output = {};
  for (const [id, file, key] of specs) {
    const m = await v.ssrLoadModule(`/src/contracts/${file}.ts`);
    output[id] = normalize(z.toJSONSchema(m[key], { unrepresentable: "any" }));
  }
  await writeDiagnostic("learning-schemas.json", output);
} finally {
  await v.close();
}
