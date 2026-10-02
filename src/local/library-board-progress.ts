"use client";
import Dexie from "dexie";
import { z } from "zod";
import { randomIdSchema } from "../contracts/domain";
import { graphShapeSchema } from "../contracts/graphs";
import { validateGraphModel } from "../core/tools/graphs";
import type { ToolModel, ToolTask } from "../core/tools/patterns";
const exact = z.strictObject({
  numerator: z.bigint(),
  denominator: z.bigint().positive(),
});
const sign = z.union([z.literal(1), z.literal(-1)]);
const bar = z.strictObject({
  parts: z.number().int().min(2).max(12),
  selected: z.array(z.number().int().min(0).max(11)).max(12),
  sign,
  offset: z.number().finite(),
});
const frame = z.tuple([bar, bar, bar]);
const column = z.strictObject({ multiplier: exact, x: exact, y: exact });
const group = z.strictObject({
  id: z.string().max(80),
  tiles: z
    .array(
      z.strictObject({
        id: z.string().max(80),
        kind: z.enum(["x", "unit"]),
        sign,
      }),
    )
    .max(150),
});
const expression = z.strictObject({
  kind: z.literal("linear"),
  x: exact,
  constant: exact,
});
const balanceFrame = z.strictObject({
  left: expression,
  right: expression,
  operation: z.union([
    z.strictObject({
      kind: z.literal("add"),
      term: z.enum(["x", "constant"]),
      value: exact,
    }),
    z.strictObject({ kind: z.enum(["multiply", "divide"]), value: exact }),
    z.null(),
  ]),
});
const graphModel = z
  .union([
    graphShapeSchema.options[0].omit({ kind: true, domain: true, goal: true }),
    graphShapeSchema.options[1].omit({ kind: true, domain: true }),
    graphShapeSchema.options[2].omit({ kind: true, domain: true }),
    graphShapeSchema.options[3].omit({ kind: true, domain: true, goal: true }),
  ])
  .refine((value) => {
    try {
      validateGraphModel(value);
      return true;
    } catch {
      return false;
    }
  });
const graphFrame = z.strictObject({
  model: graphModel,
  point: z.strictObject({ x: exact, y: exact }),
  placed: z.boolean(),
  shaded: z.boolean(),
  rootsShown: z.boolean(),
  relationship: z.enum(["unset", "unique", "parallel", "coincident"]),
});
// Only manipulatives belong here. No text, student identity, answer key, ink or teacher state.
export const localToolModelSchema = z.discriminatedUnion("kind", [
  z.strictObject({
    kind: z.literal("number-line"),
    state: z.strictObject({
      origin: exact,
      current: exact,
      orientation: z.enum(["horizontal", "vertical"]),
      jumps: z.array(z.strictObject({ from: exact, to: exact })).max(40),
    }),
  }),
  z.strictObject({
    kind: z.literal("fractions"),
    state: z.strictObject({ bars: frame, history: z.array(frame).max(150) }),
  }),
  z.strictObject({
    kind: z.literal("ratio"),
    state: z.strictObject({
      columns: z.array(column).max(16),
      history: z.array(z.array(column).max(16)).max(150),
    }),
  }),
  z.strictObject({
    kind: z.literal("algebra"),
    state: z.strictObject({
      groups: z.array(group).max(6),
      history: z.array(z.array(group).max(6)).max(150),
    }),
  }),
  z.strictObject({
    kind: z.literal("balance"),
    state: z.strictObject({
      frame: balanceFrame,
      history: z.array(balanceFrame).max(150),
    }),
  }),
  z.strictObject({
    kind: z.literal("graphs"),
    state: z.strictObject({
      frame: graphFrame,
      history: z.array(graphFrame).max(150),
    }),
  }),
]);
const record = z.strictObject({
  key: z.string(),
  task: z.string(),
  model: localToolModelSchema,
});
export async function boardToolProgress(
  runId: string,
  itemId: string,
  task: ToolTask,
  value?: ToolModel,
): Promise<ToolModel | undefined> {
  randomIdSchema.parse(runId);
  randomIdSchema.parse(itemId);
  const db = new Dexie("pn-library-public-progress");
  db.version(1).stores({ progress: "&key" });
  const key = `${runId}:${itemId}`,
    binding = JSON.stringify(task);
  try {
    if (value !== undefined) {
      if (task.kind !== value.kind) throw new Error("Tool mismatch");
      await db
        .table("progress")
        .put(record.parse({ key, task: binding, model: value }));
    }
    const raw = await db.table("progress").get(key);
    if (!raw) return;
    const saved = record.parse(raw);
    return saved.task === binding && saved.model.kind === task.kind
      ? saved.model
      : undefined;
  } finally {
    db.close();
  }
}
