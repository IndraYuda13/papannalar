import {
  getStep,
  STEP_IDS,
  stepAtClampedIndex,
  type StepId,
} from "../../content/ladder/registry";
import { getClassTarget } from "../../content/ladder/targets";
import { CONTEXTS, type ToolId } from "../../content/contexts/registry";
import { contentHash } from "../../content/templates/format";
import type { GeneratedQuestion } from "../../content/templates/types";
import { initialWindow, weeklyWindow } from "../placement/windows";
import type { ComputedLevel } from "../placement/computed-level";
import { integer, randomId } from "../validation";
import { generateQuestion } from "./question";
import { withContext } from "../../content/contexts/question";
import { activityToolSupport } from "./tool-task";
import { independentQuestion, optionalQuestion } from "./independent";
import { withPublicExitReasons } from "./exit-reasons";

export type PackageVariant = "initial" | "weekly" | "oral" | "short";
export type ActivitySet = Readonly<{
  stepId: StepId;
  tool: ToolId | null;
  interactiveSupport: "supported" | "unavailable";
  board: readonly GeneratedQuestion[];
  independent: readonly GeneratedQuestion[];
  optional: GeneratedQuestion;
  guided: GeneratedQuestion;
  exit: GeneratedQuestion;
  exitContext: GeneratedQuestion;
}>;
export type TeacherPackage = Readonly<{
  schemaVersion: 1;
  id: string;
  classId: string;
  grade: number;
  target: StepId;
  variant: PackageVariant;
  seed: number;
  revision: number;
  frozen: boolean;
  status: "draft";
  reviewNotice: "NEEDS_REVIEW";
  contentHash: string;
  opening: Readonly<{
    prompt: string;
    followup: string;
    objective: string;
    why: string;
  }>;
  assessment: readonly GeneratedQuestion[];
  activities: readonly ActivitySet[];
  oralGeneralActivity: string | null;
}>;
export type PackageInput = Readonly<{
  id: string;
  classId: string;
  grade: number;
  target?: StepId;
  variant: PackageVariant;
  seed: number;
  occupied: readonly ComputedLevel[];
}>;
function rehash(value: TeacherPackage): TeacherPackage {
  const { contentHash: previous, ...content } = value;
  void previous;
  return { ...value, contentHash: contentHash(JSON.stringify(content)) };
}
/** Reuse at recipe hydration as well as generation/replacement; no schema delta. */
export function prepareActivitySet(
  activity: Omit<ActivitySet, "tool" | "interactiveSupport">,
): ActivitySet {
  return {
    stepId: activity.stepId,
    ...activityToolSupport(activity.board),
    board: activity.board,
    independent: activity.independent.map(independentQuestion),
    optional: optionalQuestion(activity.optional),
    guided: activity.guided,
    exit: withPublicExitReasons(activity.exit),
    exitContext: withPublicExitReasons(activity.exitContext),
  };
}
export function buildPackage(input: PackageInput): TeacherPackage {
  const target = getClassTarget(input.grade, input.target).stepId;
  randomId(input.id);
  randomId(input.classId);
  integer(input.seed);
  if (input.seed > 0xffffffff) throw new RangeError("Invalid package seed");
  if (!["initial", "weekly", "oral", "short"].includes(input.variant))
    throw new RangeError("Invalid package variant");
  if (
    (input.variant === "weekly" || input.variant === "short") &&
    !input.occupied.length
  )
    throw new Error("Initial placement required");
  const indices = input.occupied.map((p) =>
    p.kind === "lanjut" ? getStep(target).index : getStep(p.stepId).index,
  );
  const start = indices.length ? Math.max(0, Math.min(...indices) - 2) : 0;
  const end = indices.length
    ? Math.min(STEP_IDS.length - 1, Math.max(...indices) + 1)
    : getStep(stepAtClampedIndex(getStep(target).index + 1)).index;
  let sequence = 0;
  function draw(
    step: StepId,
    exclude: ReadonlySet<string> = new Set(),
  ): GeneratedQuestion {
    for (let attempt = 0; attempt < 50; attempt++) {
      const seed = (input.seed + Math.imul(++sequence, 2654435761)) >>> 0;
      const q = generateQuestion(step, seed);
      if (!exclude.has(q.mathFingerprint)) return q;
    }
    throw new Error("Content uniqueness budget exhausted");
  }
  const slots =
    input.variant === "oral" || (input.grade <= 3 && input.variant === "weekly")
      ? []
      : input.variant === "initial"
        ? initialWindow(target).map((q) => q.stepId)
        : weeklyWindow(target, input.occupied);
  const assessmentFingerprints = new Set<string>();
  const assessment = slots.map((step) => {
    const q = draw(step, assessmentFingerprints);
    assessmentFingerprints.add(q.mathFingerprint);
    return q;
  });
  const activities = STEP_IDS.slice(start, end + 1).map((stepId) => {
    // Reserve exit parameters first: finite domains (e.g. quarters) must retain unused values.
    const exit = draw(stepId),
      exitContext = withContext(draw(stepId, new Set([exit.mathFingerprint])));
    const excluded = new Set([
      exit.mathFingerprint,
      exitContext.mathFingerprint,
    ]);
    return prepareActivitySet({
      stepId,
      board: Array.from({ length: input.grade <= 6 ? 2 : 3 }, () =>
        draw(stepId, excluded),
      ),
      independent: Array.from({ length: 3 }, () => draw(stepId, excluded)),
      optional: draw(stepId, excluded),
      guided: draw(stepId, excluded),
      exit,
      exitContext,
    });
  });
  const openingStep = indices.length
    ? stepAtClampedIndex(Math.min(...indices))
    : target;
  const context = CONTEXTS[openingStep];
  return rehash({
    schemaVersion: 1,
    id: input.id,
    classId: input.classId,
    grade: input.grade,
    target,
    variant: input.variant,
    seed: input.seed,
    revision: 1,
    frozen: false,
    status: "draft",
    reviewNotice: "NEEDS_REVIEW",
    contentHash: "",
    opening: {
      prompt: context.opening,
      followup: context.followup,
      objective: context.use,
      why: context.why,
    },
    assessment,
    activities,
    oralGeneralActivity:
      input.grade <= 3
        ? "Susun 12 benda menjadi kelompok sama banyak. Gambar susunannya, lalu ceritakan cara menghitungmu."
        : null,
  });
}
export function allPackageQuestions(
  pkg: TeacherPackage,
): readonly GeneratedQuestion[] {
  return [
    ...pkg.assessment,
    ...pkg.activities.flatMap((a) => [
      ...a.board,
      ...a.independent,
      a.optional,
      a.guided,
      a.exit,
      a.exitContext,
    ]),
  ];
}
export function replacePackageQuestion(
  pkg: TeacherPackage,
  questionId: string,
  seed: number,
): TeacherPackage {
  if (pkg.frozen) throw new Error("Assessment package is frozen");
  const previous = allPackageQuestions(pkg).find((q) => q.id === questionId);
  if (!previous) throw new Error("Unknown package question");
  const activity = pkg.activities.find((a) => a.stepId === previous.stepId);
  const excluded = new Set([previous.mathFingerprint]);
  if (activity) {
    const exit = [activity.exit.id, activity.exitContext.id].includes(
      questionId,
    );
    const others = exit
      ? [
          ...activity.board,
          ...activity.independent,
          activity.optional,
          activity.guided,
          activity.exit,
          activity.exitContext,
        ]
      : [activity.exit, activity.exitContext];
    for (const q of others)
      if (q.id !== questionId) excluded.add(q.mathFingerprint);
  }
  let next: GeneratedQuestion | undefined;
  for (let attempt = 0; attempt < 50; attempt++) {
    const candidate = generateQuestion(
      previous.stepId,
      (seed + Math.imul(attempt, 2654435761)) >>> 0,
    );
    if (!excluded.has(candidate.mathFingerprint)) {
      next = candidate;
      break;
    }
  }
  if (!next)
    throw new Error("No distinct replacement available; keep current question");
  const replace = (q: GeneratedQuestion) =>
    q.id === questionId
      ? {
          ...(activity?.exitContext.id === q.id ? withContext(next!) : next!),
          id: q.id,
        }
      : q;
  return rehash({
    ...pkg,
    revision: pkg.revision + 1,
    assessment: pkg.assessment.map(replace),
    activities: pkg.activities.map((a) =>
      prepareActivitySet({
        ...a,
        board: a.board.map(replace),
        independent: a.independent.map(replace),
        optional: replace(a.optional),
        guided: replace(a.guided),
        exit: replace(a.exit),
        exitContext: replace(a.exitContext),
      }),
    ),
  });
}
export function freezePackage(pkg: TeacherPackage): TeacherPackage {
  return rehash({ ...pkg, frozen: true });
}
