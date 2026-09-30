import { z } from "zod";
import { randomIdSchema } from "./domain";
const point = { x: z.number().min(0).max(1), y: z.number().min(0).max(1) };
export const remoteActionSchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("move"), ...point }),
  z.strictObject({ kind: z.literal("activate"), ...point }),
  z.strictObject({ kind: z.literal("start"), ...point }),
  z.strictObject({ kind: z.literal("drop"), ...point }),
  z.strictObject({ kind: z.literal("cancel") }),
  z.strictObject({
    kind: z.literal("value"),
    value: z.string().regex(/^-?\d{1,4}(?:[.,]\d{1,4}|\/[1-9]\d{0,3})?$/),
  }),
  z.strictObject({
    kind: z.literal("scroll"),
    direction: z.union([z.literal(-1), z.literal(1)]),
  }),
]);
export type RemoteAction = z.infer<typeof remoteActionSchema>;
export const remoteCommandSchema = z.strictObject({
  id: randomIdSchema,
  instanceId: randomIdSchema,
  taskEpoch: randomIdSchema,
  sequence: z.number().int().positive().max(2147483647),
  input: remoteActionSchema,
});
export type RemoteCommand = z.infer<typeof remoteCommandSchema>;
export const remoteReceiptSchema = z.strictObject({
  id: randomIdSchema,
  applied: z.boolean(),
  editable: z.boolean(),
});
export type RemoteReceipt = z.infer<typeof remoteReceiptSchema>;
const binding = {
  presentationId: randomIdSchema,
  channelEpoch: randomIdSchema,
  taskEpoch: randomIdSchema,
};
export const teacherRemoteSchema = z.discriminatedUnion("action", [
  z.strictObject({ action: z.literal("read"), ...binding }),
  z.strictObject({
    action: z.literal("send"),
    ...binding,
    command: remoteCommandSchema,
  }),
]);
export const boardRemoteSchema = z.discriminatedUnion("action", [
  z.strictObject({
    action: z.literal("join"),
    ...binding,
    instanceId: randomIdSchema,
  }),
  z.strictObject({ action: z.literal("read"), ...binding }),
  z.strictObject({
    action: z.literal("ack"),
    ...binding,
    instanceId: randomIdSchema,
    receipt: remoteReceiptSchema,
  }),
]);
export const remoteStatusSchema = z.strictObject({
  instanceId: randomIdSchema.nullable(),
  sequence: z.number().int().nonnegative(),
  command: remoteCommandSchema.nullable(),
  receipt: remoteReceiptSchema.nullable(),
});
export const remoteRequestSchema = z.union([
  teacherRemoteSchema,
  boardRemoteSchema,
]);
export type RemoteStatus = z.infer<typeof remoteStatusSchema>;
