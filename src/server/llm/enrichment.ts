import "server-only";
import {
  STORY_FRAMES,
  storyFrameFor,
  storyFrameHash,
} from "../../content/contexts/story-frames";
import {
  allPackageQuestions,
  type TeacherPackage,
} from "../../core/package/build";
import {
  storyOutputSchema,
  type StorySuggestion,
} from "../../contracts/enrichment";
import { isApproved, CONTENT_APPROVALS, type ContentApproval } from "./reviews";
import type { EnrichmentInput } from "./provider";
import { templateFor } from "../../content/templates/registry";

export function approvedStorySlots(
  pkg: TeacherPackage,
  approvals: readonly ContentApproval[] = CONTENT_APPROVALS,
) {
  if (pkg.frozen) return [];
  const used = allPackageQuestions(pkg).filter((q) => q.story).length;
  const limit = Math.max(
    0,
    Math.min(3, Math.floor(allPackageQuestions(pkg).length / 3) - used),
  );
  return pkg.activities
    .flatMap((a) => a.independent)
    .flatMap((q) => {
      const frameId = storyFrameFor(q);
      return frameId &&
        !q.story &&
        isApproved(frameId, storyFrameHash(frameId), approvals) &&
        isApproved(
          q.templateId,
          templateFor(q.stepId, q.templateId.endsWith("v2") ? 2 : 1).metadata
            .contentHash,
          approvals,
        )
        ? [{ questionId: q.id, frameId }]
        : [];
    })
    .slice(0, limit)
    .map((s, i) => ({ ...s, slotId: `slot-${i}` }));
}
export function enrichmentInput(
  slots: ReturnType<typeof approvedStorySlots>,
): EnrichmentInput {
  return {
    slots: slots.map((s) => ({
      slotId: s.slotId,
      choices: STORY_FRAMES[s.frameId].map((x) => x),
    })),
  };
}
export function validateStories(
  raw: unknown,
  slots: ReturnType<typeof approvedStorySlots>,
): StorySuggestion[] {
  const result = storyOutputSchema.parse(raw);
  if (
    result.status !== "ok" ||
    !result.stories.length ||
    new Set(result.stories.map((s) => s.slotId)).size !== result.stories.length
  )
    throw new Error("INVALID_RESPONSE");
  return result.stories.map((story) => {
    const slot = slots.find((s) => s.slotId === story.slotId);
    if (!slot) throw new Error("INVALID_RESPONSE");
    // Exact approved frame membership proves numeric/operation/unit preservation;
    // numeric matching alone would accept 'naik' swapped for 'turun'.
    const variant = STORY_FRAMES[slot.frameId].findIndex(
      (t) => t === story.segments.join(""),
    );
    if (variant !== 0 && variant !== 1) throw new Error("INVALID_RESPONSE");
    return {
      questionId: slot.questionId,
      choice: { frameId: slot.frameId, variant },
    };
  });
}
