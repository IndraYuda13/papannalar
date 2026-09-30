import { z } from "zod";
import {
  randomIdSchema,
  attendanceNumberSchema,
  parseBoundary,
} from "./domain";
import {
  generatedQuestionSchema,
  toPublicQuestion,
  publicQuestionSchema,
} from "./package";
import { publicGroupSchema } from "./board";
import { STEP_IDS } from "../content/ladder/registry";
import { exitBindings, exitKeys, type ExitPlan } from "../core/assessment/exit";
import { parseAssessmentContext, type AssessmentContext } from "./assessment";
const exitPlanSchema = z.strictObject({
  schemaVersion: z.literal(1),
  id: randomIdSchema,
  sessionId: randomIdSchema,
  classId: randomIdSchema,
  packageId: randomIdSchema,
  target: z.enum(STEP_IDS),
  delivery: z.enum(["card", "oral"]),
  groups: z
    .array(
      z.strictObject({
        id: randomIdSchema,
        label: publicGroupSchema.shape.label,
        members: z
          .array(
            z.strictObject({
              studentId: randomIdSchema,
              attendanceNumber: attendanceNumberSchema,
            }),
          )
          .min(1)
          .max(40),
        activityStep: z.enum(STEP_IDS),
        exitBaseStep: z.enum(STEP_IDS),
        exitContextStep: z.enum(STEP_IDS),
        base: generatedQuestionSchema,
        context: generatedQuestionSchema,
        reasonId: randomIdSchema,
      }),
    )
    .min(1)
    .max(4),
});
export function parseExitPlan(input: unknown): ExitPlan {
  const p = parseBoundary(exitPlanSchema, input),
    members = p.groups.flatMap((g) => g.members);
  if (
    new Set(members.map((s) => s.studentId)).size !== members.length ||
    new Set(members.map((s) => s.attendanceNumber)).size !== members.length ||
    new Set(p.groups.map((g) => g.id)).size !== p.groups.length ||
    p.groups.some(
      (g) =>
        g.base.stepId !== g.exitBaseStep ||
        g.context.stepId !== g.exitContextStep,
    )
  )
    throw new Error("Invalid frozen exit plan");
  exitBindings(p);
  return p;
}
export function exitContext(
  plan: ExitPlan,
  parent: AssessmentContext,
): AssessmentContext {
  if (
    plan.sessionId !== parent.session.sessionId ||
    plan.classId !== parent.classroom.id ||
    plan.target !== parent.session.target
  )
    throw new Error("Exit parent mismatch");
  const members = plan.groups.flatMap((g) => g.members);
  return parseAssessmentContext({
    id: plan.id,
    parentSessionId: plan.sessionId,
    classroom: parent.classroom,
    seed: parent.seed,
    session: parent.session,
    roster: parent.roster.filter((s) =>
      members.some((m) => m.studentId === s.id),
    ),
    bindings: exitBindings(plan),
    baselines: parent.baselines.filter((s) =>
      members.some((m) => m.studentId === s.studentId),
    ),
    keys: exitKeys(plan, members[0].studentId),
    keysByStudent: members.map((s) => ({
      studentId: s.studentId,
      keys: exitKeys(plan, s.studentId),
    })),
  });
}
export const publicExitSchema = z.strictObject({
  id: randomIdSchema,
  row: z.number().int().min(1).max(3),
  groups: z
    .array(
      z.strictObject({
        id: randomIdSchema,
        label: publicGroupSchema.shape.label,
        attendanceNumbers: publicGroupSchema.shape.attendanceNumbers,
        question: publicQuestionSchema,
      }),
    )
    .min(1)
    .max(4),
});
export type PublicExit = z.infer<typeof publicExitSchema>;
export function publicExit(plan: ExitPlan, row: number): PublicExit {
  if (plan.delivery === "oral")
    throw new Error("Oral exit stays on teacher device");
  return parseBoundary(publicExitSchema, {
    id: plan.id,
    row,
    groups: plan.groups.map((g) => {
      const question = toPublicQuestion(
        row === 3 ? g.context : g.base,
        row === 2 ? "reason" : "question",
      );
      return {
        id: g.id,
        label: g.label,
        attendanceNumbers: g.members.map((s) => s.attendanceNumber),
        question: {
          id: row === 2 ? g.reasonId : question.id,
          prompt: question.prompt,
          options: question.options,
          unknownLabel: question.unknownLabel,
        },
      };
    }),
  });
}
