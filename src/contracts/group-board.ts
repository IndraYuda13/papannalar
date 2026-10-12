import { z } from "zod";
import { randomIdSchema } from "./domain";
import { publicLibraryItemSchema } from "./library";
import { graphShapeSchema } from "./graphs";
import { validateGraphModel } from "../core/tools/graphs";
import type { ToolModel } from "../core/tools/patterns";
import { decodeModelNumbers } from "../core/learning/types";
const exact = z.strictObject({
  numerator: z.number().int().min(-1000000).max(1000000),
  denominator: z.number().int().min(-1000000).max(1000000).positive(),
});
const sign = z.union([z.literal(1), z.literal(-1)]);
const bar = z.strictObject({
  parts: z.number().int().min(2).max(12),
  selected: z.array(z.number().int().min(0).max(23)).max(24),
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
export const toolModelWireSchema = z.discriminatedUnion("kind", [
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
export type ToolModelWire = z.infer<typeof toolModelWireSchema>;
export function encodeToolModel(model: ToolModel): ToolModelWire {
  return toolModelWireSchema.parse(
    JSON.parse(
      JSON.stringify(model, (_k, v) => (typeof v === "bigint" ? Number(v) : v)),
    ),
  );
}
export function decodeToolModel(wire: ToolModelWire): ToolModel {
  const parsed = toolModelWireSchema.parse(wire);
  return decodeModelNumbers(parsed) as ToolModel;
}
export const groupAnswerSchema = z.discriminatedUnion("kind", [
  z.strictObject({
    kind: z.literal("card"),
    choice: z.enum(["A", "B", "C", "D", "?"]),
  }),
  z.strictObject({
    kind: z.literal("interactive"),
    model: toolModelWireSchema,
  }),
]);
const binding = {
  presentationId: randomIdSchema,
  channelEpoch: randomIdSchema,
  assignmentId: randomIdSchema,
  revision: z.number().int().positive(),
  taskEpoch: randomIdSchema,
  requestId: randomIdSchema,
};
export const groupBoardActionSchema = z.discriminatedUnion("action", [
  z.strictObject({
    action: z.literal("state"),
    presentationId: randomIdSchema,
  }),
  z.strictObject({
    action: z.literal("answer"),
    ...binding,
    answer: groupAnswerSchema,
  }),
  z.strictObject({ action: z.literal("check"), ...binding }),
  z.strictObject({ action: z.literal("next"), ...binding, skip: z.boolean() }),
  z.strictObject({
    action: z.literal("finish"),
    ...binding,
    skip: z.boolean(),
  }),
]);
export const groupBoardStateSchema = z.strictObject({
  assignmentId: randomIdSchema,
  runId: randomIdSchema,
  groupLabel: z.string().max(60),
  title: z.string().max(90),
  position: z.number().int().min(0).max(4),
  total: z.number().int().min(1).max(5),
  revision: z.number().int().positive(),
  taskEpoch: randomIdSchema,
  status: z.enum(["active", "completed", "stopped"]),
  item: publicLibraryItemSchema,
  answer: groupAnswerSchema.nullable(),
  feedback: z
    .strictObject({ status: z.enum(["correct", "try_again", "not_checkable"]) })
    .nullable(),
  checked: z.boolean(),
  canNext: z.boolean(),
});
export type GroupBoardAction = z.infer<typeof groupBoardActionSchema>;
export type GroupBoardState = z.infer<typeof groupBoardStateSchema>;
