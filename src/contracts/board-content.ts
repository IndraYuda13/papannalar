import { z } from "zod";
import { randomIdSchema } from "./domain";
import { boardPacketSchema, publicBoardPacket } from "./board-package";
import {
  presentationStateSchema,
  publicPresentation,
  snapshotSchema,
} from "./presentation";

const binding = {
  presentationId: randomIdSchema,
  channelEpoch: randomIdSchema,
};
export const boardContentRequestSchema = z.discriminatedUnion("action", [
  z.strictObject({
    ...binding,
    action: z.literal("read"),
    knownVersion: z.number().int().nonnegative().optional(),
  }),
  z.strictObject({
    ...binding,
    action: z.literal("write"),
    packet: boardPacketSchema,
  }),
  z.strictObject({
    ...binding,
    action: z.enum(["cached", "uncache"]),
    packageId: randomIdSchema,
    revision: z.number().int().positive(),
  }),
  z.strictObject({
    ...binding,
    action: z.literal("propose"),
    packetVersion: z.number().int().positive(),
    payload: presentationStateSchema,
  }),
  z.strictObject({
    ...binding,
    action: z.literal("resolve"),
    proposalEpoch: randomIdSchema,
    baseRevision: z.number().int().positive(),
    commandId: randomIdSchema,
    taskEpoch: randomIdSchema,
    choice: z.enum(["board", "teacher"]),
  }),
]);
export type BoardContentRequest = z.infer<typeof boardContentRequestSchema>;
export const boardContentStatusSchema = z.strictObject({
  packet: boardPacketSchema.nullable(),
  cached: z.boolean(),
  packetVersion: z.number().int().nonnegative(),
  proposal: presentationStateSchema.nullable(),
  proposalStale: z.boolean(),
  resolution: z
    .strictObject({
      epoch: randomIdSchema,
      revision: z.number().int().positive(),
    })
    .nullable(),
  snapshot: snapshotSchema.optional(),
});
export type BoardContentStatus = z.infer<typeof boardContentStatusSchema>;
export function publicContentRequest(
  input: BoardContentRequest,
): BoardContentRequest {
  const base = {
    presentationId: input.presentationId,
    channelEpoch: input.channelEpoch,
  };
  switch (input.action) {
    case "write":
      return {
        ...base,
        action: "write",
        packet: publicBoardPacket(input.packet),
      };
    case "propose":
      return {
        ...base,
        action: "propose",
        packetVersion: input.packetVersion,
        payload: publicPresentation(input.payload),
      };
    case "resolve":
      return {
        ...base,
        action: "resolve",
        proposalEpoch: input.proposalEpoch,
        baseRevision: input.baseRevision,
        commandId: input.commandId,
        taskEpoch: input.taskEpoch,
        choice: input.choice,
      };
    case "cached":
    case "uncache":
      return {
        ...base,
        action: input.action,
        packageId: input.packageId,
        revision: input.revision,
      };
    default:
      return {
        ...base,
        action: "read",
        ...(input.knownVersion !== undefined
          ? { knownVersion: input.knownVersion }
          : {}),
      };
  }
}
