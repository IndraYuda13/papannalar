import { z } from "zod";
import { randomIdSchema } from "./domain";
import { STEP_IDS } from "../content/ladder/registry";
import { CONTEXTS } from "../content/contexts/registry";
import { generateQuestion } from "../core/package/question";
import { withContext } from "../content/contexts/question";
import { contentHash } from "../content/templates/format";
import type { GeneratedQuestion } from "../content/templates/types";
import type { TeacherPackage } from "../core/package/build";
import { parseTeacherPackage } from "./package";
import { storyChoiceSchema } from "./enrichment";
import { applyStory } from "../content/contexts/story-frames";
import { allPackageQuestions, prepareActivitySet } from "../core/package/build";

const question = z.strictObject({
  story: storyChoiceSchema.optional(),
  id: randomIdSchema,
  stepId: z.enum(STEP_IDS),
  seed: z.number().int().min(0).max(0xffffffff),
  version: z.union([z.literal(1), z.literal(2)]),
});
export const syncPackageSchema = z.strictObject({
  id: randomIdSchema,
  classId: randomIdSchema,
  grade: z.number().int().min(1).max(12),
  target: z.enum(STEP_IDS),
  variant: z.enum(["initial", "weekly", "oral", "short"]),
  seed: z.number().int().min(0).max(0xffffffff),
  revision: z.number().int().positive(),
  openingStep: z.enum(STEP_IDS),
  assessment: z.array(question).max(10),
  activities: z
    .array(
      z.strictObject({
        stepId: z.enum(STEP_IDS),
        board: z.array(question).min(2).max(3),
        independent: z.array(question).length(3),
        optional: question,
        guided: question,
        exit: question,
        exitContext: question,
      }),
    )
    .min(1)
    .max(22),
});
export type SyncPackage = z.infer<typeof syncPackageSchema>;
function reference(q: GeneratedQuestion) {
  return {
    id: q.id,
    stepId: q.stepId,
    seed: q.seed,
    version: q.templateId.endsWith("v2") ? (2 as const) : (1 as const),
    ...(q.story
      ? { story: { frameId: q.story.frameId, variant: q.story.variant } }
      : {}),
  };
}
/** Seeds/IDs only. No editable prompt, key, name or local model is serialized. */
export function toSyncPackage(pkg: TeacherPackage): SyncPackage {
  if (!pkg.frozen) throw new Error("Freeze package before sync");
  return toPackageRecipe(pkg);
}
/** No prose/keys/roster. Used before freeze only for the owned enrichment API. */
export function toPackageRecipe(pkg: TeacherPackage): SyncPackage {
  const openingStep = STEP_IDS.find(
    (s) => CONTEXTS[s].opening === pkg.opening.prompt,
  );
  if (!openingStep) throw new Error("Unsupported content version");
  return syncPackageSchema.parse({
    id: pkg.id,
    classId: pkg.classId,
    grade: pkg.grade,
    target: pkg.target,
    variant: pkg.variant,
    seed: pkg.seed,
    revision: pkg.revision,
    openingStep,
    assessment: pkg.assessment.map(reference),
    activities: pkg.activities.map((a) => ({
      stepId: a.stepId,
      board: a.board.map(reference),
      independent: a.independent.map(reference),
      optional: reference(a.optional),
      guided: reference(a.guided),
      exit: reference(a.exit),
      exitContext: reference(a.exitContext),
    })),
  });
}
export function fromSyncPackage(input: SyncPackage): TeacherPackage {
  return fromPackageRecipe(input, true);
}
export function fromPackageRecipe(
  input: SyncPackage,
  frozen: boolean,
): TeacherPackage {
  const p = syncPackageSchema.parse(input);
  const hydrate = (q: z.infer<typeof question>, independent = false) => {
    const value = {
      ...generateQuestion(q.stepId, q.seed, q.version),
      id: q.id,
    };
    if (q.story && !independent) throw new Error("Story slot not allowed");
    return q.story ? applyStory(value, q.story) : value;
  };
  const opening = CONTEXTS[p.openingStep];
  const content = {
    schemaVersion: 1 as const,
    id: p.id,
    classId: p.classId,
    grade: p.grade,
    target: p.target,
    variant: p.variant,
    seed: p.seed,
    revision: p.revision,
    frozen,
    status: "draft" as const,
    reviewNotice: "NEEDS_REVIEW" as const,
    opening: {
      prompt: opening.opening,
      followup: opening.followup,
      objective: opening.use,
      why: opening.why,
    },
    assessment: p.assessment.map((q) => hydrate(q)),
    activities: p.activities.map((a) => {
      return prepareActivitySet({
        stepId: a.stepId,
        board: a.board.map((q) => hydrate(q)),
        independent: a.independent.map((q) => hydrate(q, true)),
        optional: hydrate(a.optional),
        guided: hydrate(a.guided),
        exit: hydrate(a.exit),
        exitContext: withContext(hydrate(a.exitContext)),
      });
    }),
    oralGeneralActivity:
      p.grade <= 3
        ? "Susun 12 benda menjadi kelompok sama banyak. Gambar susunannya, lalu ceritakan cara menghitungmu."
        : null,
  };
  const result = parseTeacherPackage({
    ...content,
    contentHash: contentHash(JSON.stringify(content)),
  });
  const all = allPackageQuestions(result);
  if (
    all.filter((q) => q.story).length > Math.floor(all.length / 3) ||
    new Set(all.map((q) => q.id)).size !== all.length
  )
    throw new Error("Invalid story/package slots");
  return result;
}
