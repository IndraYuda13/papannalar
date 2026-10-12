import { createServer } from "vite";
import { sql, literal } from "../tests/harness/postgres.mjs";
const v = await createServer({
  configFile: false,
  server: { middlewareMode: true },
});
try {
  const { emptyModel, exampleFrames, mistakenModel, checkModel } =
    await v.ssrLoadModule("/src/core/tools/patterns.ts");
  const { encodeToolModel } = await v.ssrLoadModule(
    "/src/contracts/group-board.ts",
  );
  const { GRAPH_EXAMPLES } = await v.ssrLoadModule(
    "/src/core/tools/graph-tasks.ts",
  );
  const tasks = [
    {
      kind: "fractions",
      operation: "add",
      left: { numerator: 1, denominator: 2 },
      right: { numerator: 1, denominator: 3 },
    },
    {
      kind: "fractions",
      operation: "equivalent",
      left: { numerator: 1, denominator: 2 },
      right: { numerator: 1, denominator: 4 },
    },
    {
      kind: "fractions",
      operation: "represent",
      left: { numerator: 3, denominator: 4 },
      right: { numerator: 1, denominator: 4 },
    },
    { kind: "ratio", baseX: 2, baseY: 3, targetX: 6 },
    { kind: "algebra", groups: 3, xPerGroup: 1, constantPerGroup: 4 },
    {
      kind: "number-line",
      origin: { numerator: -3, denominator: 1 },
      delta: { numerator: -5, denominator: 1 },
      orientation: "horizontal",
    },
    {
      kind: "balance",
      left: { x: 3, constant: -7 },
      right: { x: 0, constant: 11 },
    },
    ...Object.values(GRAPH_EXAMPLES),
  ];
  let count = 0;
  for (const task of tasks) {
    for (const model of [
      emptyModel(task),
      mistakenModel(task),
      ...exampleFrames(task),
    ]) {
      const expected = checkModel(task, model);
      const wire = encodeToolModel(model);
      const actual =
        sql(
          `select pn_private.tool_matches(${literal(JSON.stringify(task))}::jsonb,${literal(JSON.stringify(wire))}::jsonb)`,
        ) === "t";
      if (actual !== expected)
        throw new Error(
          `checker mismatch ${task.kind}/${task.mode ?? task.operation ?? ""}, frame ${count}, actual=${actual}, expected=${expected}`,
        );
      count++;
    }
  }
  console.log(`${count} exact SQL/tool checker parity assertions PASS`);
} finally {
  await v.close();
}
