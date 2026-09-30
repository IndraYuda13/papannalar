import { z } from "zod";
import { exitReasonCopy } from "../core/package/exit-reasons";
import { parseBoundary, randomIdSchema } from "./domain";
import type { GeneratedQuestion } from "../content/templates/types";
import { STEP_IDS } from "../content/ladder/registry";
import type { TeacherPackage } from "../core/package/build";
import { storyChoiceSchema } from "./enrichment";

export const mathNodeSchema = z.discriminatedUnion("kind", [
  z.strictObject({
    kind: z.literal("text"),
    text: z.string().min(1).max(1000),
  }),
  z.strictObject({
    kind: z.literal("fraction"),
    numerator: z.string().regex(/^-?\d{1,12}$/),
    denominator: z.string().regex(/^[1-9]\d{0,11}$/),
  }),
]);
export const publicQuestionSchema = z.strictObject({
  id: randomIdSchema,
  prompt: z.array(mathNodeSchema).min(1).max(20),
  options: z
    .array(
      z.strictObject({
        label: z.enum(["A", "B", "C", "D"]),
        text: z.string().min(1).max(1000),
      }),
    )
    .length(4),
  unknownLabel: z.literal("?"),
});
export type PublicQuestion = z.infer<typeof publicQuestionSchema>;
const choice = z.enum(["A", "B", "C", "D"]);
const classification = z.enum(["correct", "misconception", "arithmetic-error"]);
const metadataSchema = z.strictObject({
  version: z.enum(["1.0.0", "2.0.0"]),
  status: z.literal("draft"),
  reviewer: z.null(),
  reviewedAt: z.null(),
  sourceRef: z.string().max(300),
  contentHash: z.string().regex(/^fnv1a-[a-f0-9]{8}$/),
});
const reasonSchema = z.strictObject({
  label: choice,
  text: z.string().min(1).max(1000),
  classification,
  misconceptionCode: z
    .string()
    .regex(/^[ABD]\d\.\d$/)
    .optional(),
});
export const generatedQuestionSchema = z.strictObject({
  story: storyChoiceSchema.optional(),
  id: randomIdSchema,
  templateId: z.string().regex(/^pn-[a-e]\d-v[12]$/),
  stepId: z.enum(STEP_IDS),
  seed: z.number().int().min(0).max(0xffffffff),
  params: z.strictObject({
    a: z.number().int(),
    b: z.number().int(),
    c: z.number().int(),
    d: z.number().int(),
  }),
  metadata: metadataSchema,
  mathFingerprint: z.string().max(400),
  prompt: z.array(mathNodeSchema).min(1).max(20),
  options: z
    .array(reasonSchema.extend({ canonicalValue: z.string().max(200) }))
    .length(4),
  answerKey: choice,
  reasons: z.array(reasonSchema).length(4),
  reasonKey: choice,
  hints: z.tuple([
    z.string().max(1000),
    z.string().max(1000),
    z.string().max(1000),
  ]),
});
const tool = z.enum([
  "number-line",
  "fractions",
  "ratio",
  "algebra",
  "balance",
  "graphs",
]);
export const teacherPackageSchema = z.strictObject({
  schemaVersion: z.literal(1),
  id: randomIdSchema,
  classId: randomIdSchema,
  grade: z.number().int().min(1).max(12),
  target: z.enum(STEP_IDS),
  variant: z.enum(["initial", "weekly", "oral", "short"]),
  seed: z.number().int().min(0).max(0xffffffff),
  revision: z.number().int().positive(),
  frozen: z.boolean(),
  status: z.literal("draft"),
  reviewNotice: z.literal("NEEDS_REVIEW"),
  contentHash: z.string().regex(/^fnv1a-[a-f0-9]{8}$/),
  opening: z.strictObject({
    prompt: z.string().max(1000),
    followup: z.string().max(1000),
    objective: z.string().max(1000),
    why: z.string().max(1000),
  }),
  assessment: z.array(generatedQuestionSchema).max(10),
  activities: z
    .array(
      z.strictObject({
        stepId: z.enum(STEP_IDS),
        tool: tool.nullable(),
        interactiveSupport: z.enum(["supported", "unavailable"]),
        board: z.array(generatedQuestionSchema).min(2).max(3),
        independent: z.array(generatedQuestionSchema).length(3),
        optional: generatedQuestionSchema,
        guided: generatedQuestionSchema,
        exit: generatedQuestionSchema,
        exitContext: generatedQuestionSchema,
      }),
    )
    .min(1)
    .max(22),
  oralGeneralActivity: z.string().max(1000).nullable(),
});
export function parseTeacherPackage(input: unknown): TeacherPackage {
  return parseBoundary(teacherPackageSchema, input);
}
export const publicPackageSchema = z.strictObject({
  id: randomIdSchema,
  revision: z.number().int().positive(),
  opening: teacherPackageSchema.shape.opening,
  assessment: z.array(publicQuestionSchema).max(10),
  activities: z
    .array(
      z.strictObject({
        id: randomIdSchema,
        tool: tool.nullable(),
        board: z.array(publicQuestionSchema).min(2).max(3),
        independent: z.array(publicQuestionSchema).length(3),
        optional: publicQuestionSchema,
        exit: publicQuestionSchema,
        reason: publicQuestionSchema,
        exitContext: publicQuestionSchema,
      }),
    )
    .min(1)
    .max(22),
});
export type PublicPackage = z.infer<typeof publicPackageSchema>;
export function toPublicPackage(input: TeacherPackage): PublicPackage {
  return parseBoundary(publicPackageSchema, {
    id: input.id,
    revision: input.revision,
    opening: {
      prompt: input.opening.prompt,
      followup: input.opening.followup,
      objective: input.opening.objective,
      why: input.opening.why,
    },
    assessment: input.assessment.map((q) => toPublicQuestion(q)),
    activities: input.activities.map((a) => ({
      id: a.guided.id,
      tool: a.tool,
      board: a.board.map((q) => toPublicQuestion(q)),
      independent: a.independent.map((q) => toPublicQuestion(q)),
      optional: toPublicQuestion(a.optional),
      exit: toPublicQuestion(a.exit),
      reason: toPublicQuestion(a.exit, "reason"),
      exitContext: toPublicQuestion(a.exitContext),
    })),
  });
}
// Explicit allowlist: no template/step IDs, answers, diagnosis, roster or local identity.
export function toPublicQuestion(
  question: GeneratedQuestion,
  kind: "question" | "reason" = "question",
): PublicQuestion {
  return parseBoundary(publicQuestionSchema, {
    id: question.id,
    prompt:
      kind === "reason"
        ? [{ kind: "text", text: "Kenapa?" }]
        : question.prompt.map((n) =>
            n.kind === "text"
              ? { kind: "text", text: n.text }
              : {
                  kind: "fraction",
                  numerator: n.numerator,
                  denominator: n.denominator,
                },
          ),
    options: (kind === "reason"
      ? exitReasonCopy(question)
      : question.options
    ).map((o) => ({ label: o.label, text: o.text })),
    unknownLabel: "?",
  });
}
