import { z } from "zod";
import { parseBoundary, randomIdSchema } from "./domain";
import { publicPackageSchema } from "./package";
import { publicQuestion } from "./activity";
import { lessonSchema, publicLesson } from "./lesson";
import { publicToolSchema, publicTool } from "./tools";
import { publicGroupSchema } from "./board";
import { publicStationSchema, toPublicStation } from "./stations";

// This is the ONLY persistent board content. No roster, group binding or model state.
export const boardPackageSchema = z.strictObject({
  schemaVersion: z.literal(1),
  content: publicPackageSchema,
  lesson: lessonSchema,
  seconds: z.union([z.literal(60), z.literal(75), z.literal(80)]),
  models: z
    .array(
      z.strictObject({
        questionId: randomIdSchema,
        tool: publicToolSchema,
      }),
    )
    .max(66),
});
export type BoardPackage = z.infer<typeof boardPackageSchema>;
export function publicBoardPackage(input: BoardPackage): BoardPackage {
  const p = input.content;
  return parseBoardPackage({
    schemaVersion: 1,
    content: {
      id: p.id,
      revision: p.revision,
      opening: {
        prompt: p.opening.prompt,
        followup: p.opening.followup,
        objective: p.opening.objective,
        why: p.opening.why,
      },
      assessment: p.assessment.map(publicQuestion),
      activities: p.activities.map((a) => ({
        id: a.id,
        tool: a.tool,
        board: a.board.map(publicQuestion),
        independent: a.independent.map(publicQuestion),
        optional: publicQuestion(a.optional),
        exit: publicQuestion(a.exit),
        reason: publicQuestion(a.reason),
        exitContext: publicQuestion(a.exitContext),
      })),
    },
    lesson: publicLesson(input.lesson),
    seconds: input.seconds,
    models: input.models.map((m) => ({
      questionId: m.questionId,
      tool: publicTool(m.tool),
    })),
  });
}
export function parseBoardPackage(input: unknown): BoardPackage {
  const p = parseBoundary(boardPackageSchema, input);
  const ids = p.content.activities.flatMap((a) => a.board.map((q) => q.id));
  if (
    new Set(p.models.map((m) => m.questionId)).size !== p.models.length ||
    p.models.some((m) => !ids.includes(m.questionId)) ||
    new Set(p.content.activities.map((a) => a.id)).size !==
      p.content.activities.length
  )
    throw new Error("Invalid public content references");
  return p;
}

// This descriptor travels only in the authenticated channel and stays in board RAM.
export const boardRunPlanSchema = z.strictObject({
  id: randomIdSchema,
  groups: z
    .array(
      publicGroupSchema.extend({
        activityId: randomIdSchema,
        exitActivityId: randomIdSchema,
        contextActivityId: randomIdSchema,
      }),
    )
    .max(4),
  firstStation: publicStationSchema.optional(),
  stations: z.array(publicStationSchema).max(4),
});
export const boardPacketSchema = z.strictObject({
  content: boardPackageSchema,
  plan: boardRunPlanSchema,
});
export type BoardRunPlan = z.infer<typeof boardRunPlanSchema>;
export type BoardPacket = z.infer<typeof boardPacketSchema>;
export function parseBoardPacket(input: unknown): BoardPacket {
  const value = parseBoundary(boardPacketSchema, input);
  parseBoardPackage(value.content);
  const ids = value.content.content.activities.map((a) => a.id);
  if (
    new Set(value.plan.groups.map((g) => g.id)).size !==
      value.plan.groups.length ||
    value.plan.groups.some((g) =>
      [g.activityId, g.exitActivityId, g.contextActivityId].some(
        (id) => !ids.includes(id),
      ),
    )
  )
    throw new Error("Invalid public activity binding");
  const attendance = value.plan.groups.flatMap((g) => g.attendanceNumbers);
  if (
    new Set(attendance).size !== attendance.length ||
    [
      ...value.plan.stations,
      ...(value.plan.firstStation ? [value.plan.firstStation] : []),
    ].some(
      (s) =>
        new Set(s.assignments.map((a) => a.groupId)).size !==
          s.assignments.length ||
        s.assignments.some(
          (a) => !value.plan.groups.some((g) => g.id === a.groupId),
        ),
    )
  )
    throw new Error("Invalid public group binding");
  return value;
}
export function publicBoardPacket(input: BoardPacket): BoardPacket {
  return parseBoardPacket({
    content: publicBoardPackage(input.content),
    plan: {
      id: input.plan.id,
      groups: input.plan.groups.map((g) => ({
        id: g.id,
        label: g.label,
        attendanceNumbers: g.attendanceNumbers.map((n) => n),
        activityId: g.activityId,
        exitActivityId: g.exitActivityId,
        contextActivityId: g.contextActivityId,
      })),
      ...(input.plan.firstStation
        ? { firstStation: toPublicStation(input.plan.firstStation) }
        : {}),
      stations: input.plan.stations.map(toPublicStation),
    },
  });
}
