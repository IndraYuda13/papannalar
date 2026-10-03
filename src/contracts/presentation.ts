import { z } from "zod";
import { boardPublicStateSchema } from "./board";
import { randomIdSchema, parseBoundary } from "./domain";
import { publicStationSchema, toPublicStation } from "./stations";
import { publicRolesSchema, publicRoles } from "./turns";
import { publicToolSchema, publicTool } from "./tools";
import { PATTERNS } from "../core/tools/patterns";
import { lessonSchema, publicLesson } from "./lesson";
import { publicExitSchema } from "./exit";
import { publicQuestionSchema } from "./package";
import { guidanceSchema } from "./guidance";
import {
  splitSchema,
  spotlightSchema,
  boardLayoutSchema,
  publicSplit,
} from "./board-layout";
import {
  activitySchema,
  checkContentSchema,
  publicActivity,
  publicQuestion,
} from "./activity";

export const BOARD_MODES = [
  "opening",
  "check",
  "continuation",
  "groups",
  "station",
  "together",
  "split",
  "spotlight",
  "exit",
  "reflection",
] as const;
export const presentationStateSchema = z
  .strictObject({
    schemaVersion: z.literal(1),
    mode: z.enum(BOARD_MODES),
    question: z.number().int().min(1).max(10),
    taskEpoch: randomIdSchema,
    viewId: randomIdSchema.optional(),
    layout: boardLayoutSchema.optional(),
    split: splitSchema.optional(),
    spotlight: spotlightSchema.optional(),
    guidance: guidanceSchema.optional(),
    groups: boardPublicStateSchema.shape.groups,
    station: publicStationSchema.optional(),
    roles: publicRolesSchema.optional(),
    tool: publicToolSchema.optional(),
    pattern: z.enum(PATTERNS).optional(),
    lesson: lessonSchema.optional(),
    exit: publicExitSchema.optional(),
    check: checkContentSchema.optional(),
    activity: activitySchema.optional(),
    practice: z
      .strictObject({
        question: publicQuestionSchema,
        independent: z.array(publicQuestionSchema).max(3),
      })
      .optional(),
    package: z
      .strictObject({
        id: randomIdSchema,
        revision: z.number().int().positive(),
      })
      .optional(),
  })
  .refine((p) => !p.pattern || Boolean(p.tool))
  .refine(
    (p) =>
      !p.guidance ||
      (["station", "together", "spotlight"].includes(p.mode) &&
        Boolean(p.mode === "spotlight" ? p.spotlight?.tool : p.tool)),
  )
  .refine((p) =>
    p.check
      ? p.mode === "check" && p.question <= p.check.total
      : p.question <= 5,
  )
  .refine((p) => !p.exit || p.mode === "exit")
  .refine(
    (p) =>
      !p.practice ||
      (["station", "together", "exit"].includes(
        p.spotlight?.returnMode ?? p.mode,
      ) &&
        !p.activity &&
        !p.exit),
  )
  .refine(
    (p) =>
      !p.activity ||
      ["station", "together"].includes(p.spotlight?.returnMode ?? p.mode),
  )
  .refine(
    (p) =>
      (p.mode === "spotlight") === Boolean(p.spotlight) &&
      (!p.spotlight || Boolean(p.viewId)),
  )
  .refine(
    (p) =>
      !p.spotlight?.groupId ||
      p.groups.some((g) => g.id === p.spotlight?.groupId),
  )
  .refine(
    (p) =>
      (p.spotlight?.returnMode ?? p.mode) !== "together" || Boolean(p.tool),
  )
  .refine(
    (p) =>
      ((p.spotlight?.returnMode ?? p.mode) === "split") === Boolean(p.split),
  )
  .refine(
    (p) =>
      !p.split ||
      (new Set(p.split.panels.map((panel) => panel.groupId)).size ===
        p.split.panels.length &&
        p.split.panels.every(
          (panel) =>
            p.groups.some((g) => g.id === panel.groupId) &&
            new Set(panel.exercises.map((e) => e.id)).size ===
              panel.exercises.length,
        )),
  )
  .refine(
    (p) =>
      !p.check ||
      (p.package?.id === p.check.packageId &&
        p.package.revision === p.check.revision),
  );
export type PresentationState = z.infer<typeof presentationStateSchema>;
export function publicPresentation(
  input: PresentationState,
): PresentationState {
  return parseBoundary(presentationStateSchema, {
    schemaVersion: 1,
    mode: input.mode,
    question: input.question,
    taskEpoch: input.taskEpoch,
    ...(input.viewId ? { viewId: input.viewId } : {}),
    ...(input.guidance
      ? {
          guidance: {
            hint: input.guidance.hint,
            reveal: input.guidance.reveal,
          },
        }
      : {}),
    ...(input.layout
      ? {
          layout: {
            touchZone: input.layout.touchZone,
            largeObjects: input.layout.largeObjects,
          },
        }
      : {}),
    ...(input.split ? { split: publicSplit(input.split) } : {}),
    ...(input.spotlight
      ? {
          spotlight: {
            id: input.spotlight.id,
            returnMode: input.spotlight.returnMode,
            ...(input.spotlight.groupId
              ? { groupId: input.spotlight.groupId }
              : {}),
            tool: publicTool(input.spotlight.tool),
          },
        }
      : {}),
    ...(input.package
      ? { package: { id: input.package.id, revision: input.package.revision } }
      : {}),
    ...(input.check
      ? {
          check: {
            packageId: input.check.packageId,
            revision: input.check.revision,
            total: input.check.total,
            seconds: input.check.seconds,
            question: publicQuestion(input.check.question),
          },
        }
      : {}),
    ...(input.activity ? { activity: publicActivity(input.activity) } : {}),
    ...(input.practice
      ? {
          practice: {
            question: publicQuestion(input.practice.question),
            independent: input.practice.independent.map(publicQuestion),
          },
        }
      : {}),
    ...(input.station ? { station: toPublicStation(input.station) } : {}),
    ...(input.roles ? { roles: publicRoles(input.roles) } : {}),
    ...(input.tool ? { tool: publicTool(input.tool) } : {}),
    ...(input.pattern ? { pattern: input.pattern } : {}),
    ...(input.lesson ? { lesson: publicLesson(input.lesson) } : {}),
    ...(input.exit
      ? {
          exit: parseBoundary(publicExitSchema, {
            id: input.exit.id,
            row: input.exit.row,
            groups: input.exit.groups.map((g) => ({
              id: g.id,
              label: g.label,
              attendanceNumbers: g.attendanceNumbers.map((n) => n),
              question: parseBoundary(publicQuestionSchema, {
                id: g.question.id,
                prompt: g.question.prompt.map((n) =>
                  n.kind === "text"
                    ? { kind: n.kind, text: n.text }
                    : {
                        kind: n.kind,
                        numerator: n.numerator,
                        denominator: n.denominator,
                      },
                ),
                options: g.question.options.map((o) => ({
                  label: o.label,
                  text: o.text,
                })),
                unknownLabel: "?",
              }),
            })),
          }),
        }
      : {}),
    groups: input.groups.map((g) => ({
      id: g.id,
      label: g.label,
      attendanceNumbers: g.attendanceNumbers.map((n) => n),
    })),
  });
}
export const envelopeSchema = z.strictObject({
  protocolVersion: z.literal(1),
  presentationId: randomIdSchema,
  channelEpoch: randomIdSchema,
  revision: z.number().int().positive(),
  commandId: randomIdSchema,
  packageVersion: z
    .string()
    .regex(/^(prelim-7b-v1|package-v1:[a-f0-9-]{36}:\d+)$/),
  payload: presentationStateSchema,
});
export type PresentationEnvelope = z.infer<typeof envelopeSchema>;
export const snapshotSchema = z.strictObject({
  envelope: envelopeSchema,
  ackRevision: z.number().int().nonnegative(),
  ackCommandId: randomIdSchema.nullable(),
  ackAt: z.string().nullable(),
});
export type PresentationSnapshot = z.infer<typeof snapshotSchema>;
export const challengeSchema = z.strictObject({
  id: randomIdSchema,
  code: z.string().regex(/^\d{6}$/),
  expiresAt: z.string(),
  pairingUrl: z.url().nullable().optional(),
});
// Presence is separate from a successful snapshot read and from application ACK.
export const connectionPulseSchema = z.strictObject({
  channelEpoch: randomIdSchema,
  revision: z.number().int().positive(),
  ackRevision: z.number().int().nonnegative(),
  ackCommandId: randomIdSchema.nullable(),
  ackAt: z.string().nullable(),
  controllerSeenAt: z.string().nullable(),
  serverNow: z.string(),
});
export type ConnectionPulse = z.infer<typeof connectionPulseSchema>;
export const presentationResumeSchema = z.strictObject({
  snapshot: snapshotSchema.nullable(),
});
export const boardResetReceiptSchema = z.strictObject({ ok: z.literal(true) });
export const channelSchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("snapshot") }),
  z.strictObject({
    kind: z.literal("realtime"),
    url: z.url(),
    key: z.string(),
    token: z.string(),
  }),
]);
export const pairingStatusSchema = z.strictObject({
  presentationId: randomIdSchema.nullable(),
  expired: z.boolean(),
});
const id = { presentationId: randomIdSchema };
const controller = { controllerId: randomIdSchema.optional() };
export const teacherPairingSchema = z.discriminatedUnion("action", [
  z.strictObject({
    action: z.literal("claim"),
    ...controller,
    code: z.string().regex(/^\d{6}$/),
    classId: randomIdSchema,
    sessionId: randomIdSchema,
    payload: presentationStateSchema,
  }),
  z.strictObject({
    action: z.literal("publish"),
    ...controller,
    ...id,
    channelEpoch: randomIdSchema,
    baseRevision: z.number().int().positive(),
    commandId: randomIdSchema,
    payload: presentationStateSchema,
  }),
  z.strictObject({ action: z.literal("snapshot"), ...id, ...controller }),
  z.strictObject({ action: z.literal("revoke"), ...id, ...controller }),
  z.strictObject({ action: z.literal("channel"), ...id, ...controller }),
  z.strictObject({ action: z.literal("heartbeat"), ...id, ...controller }),
  z.strictObject({
    action: z.literal("resume"),
    sessionId: randomIdSchema,
    classId: randomIdSchema,
    ...controller,
  }),
]);
export const boardPairingSchema = z.discriminatedUnion("action", [
  z.strictObject({ action: z.literal("reset"), resetId: randomIdSchema }),
  z.strictObject({
    action: z.literal("create"),
    presentationId: randomIdSchema.optional(),
  }),
  z.strictObject({ action: z.literal("resume") }),
  z.strictObject({ action: z.literal("heartbeat"), ...id }),
  z.strictObject({ action: z.literal("status"), challengeId: randomIdSchema }),
  z.strictObject({ action: z.literal("snapshot"), ...id }),
  z.strictObject({ action: z.literal("channel"), ...id }),
  z.strictObject({
    action: z.literal("ack"),
    ...id,
    channelEpoch: randomIdSchema,
    commandId: randomIdSchema,
    appliedRevision: z.number().int().positive(),
  }),
]);

// Broadcast only triggers recovery; a canonical snapshot authorizes epoch changes.
export function envelopeDecision(
  current: PresentationEnvelope | null,
  incoming: PresentationEnvelope,
): "apply" | "ignore" | "recover" {
  if (!current) return "recover";
  if (
    incoming.presentationId !== current.presentationId ||
    incoming.channelEpoch !== current.channelEpoch
  )
    return "ignore";
  if (
    incoming.revision <= current.revision ||
    incoming.commandId === current.commandId
  )
    return "ignore";
  return incoming.revision === current.revision + 1 ? "apply" : "recover";
}
