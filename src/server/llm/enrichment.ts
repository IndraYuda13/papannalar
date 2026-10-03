import "server-only";
import {
  STORY_FRAMES,
  storyFramesFor,
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
import type { StepId } from "../../content/ladder/registry";
import type { StoryFrameId } from "../../content/contexts/story-frames";

export function approvedStorySlots(
  pkg: TeacherPackage,
  approvals: readonly ContentApproval[] = CONTENT_APPROVALS,
  selection: { stepId?: StepId; context?: StoryFrameId } = {},
) {
  if (pkg.frozen) return [];
  const used = allPackageQuestions(pkg).filter((q) => q.story).length;
  const limit = Math.max(
    0,
    Math.min(3, Math.floor(allPackageQuestions(pkg).length / 3) - used),
  );
  const candidates = pkg.activities
    .flatMap((a) => a.independent)
    .filter((q) => !selection.stepId || q.stepId === selection.stepId)
    .flatMap((q) =>
      storyFramesFor(q).flatMap((frameId) => {
        return (!selection.context || selection.context === frameId) &&
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
      }),
    );
  // Spread across approved contexts before using a second question from the
  // same context. One question can occupy only one slot. No unreviewed frame
  // replaces a requested context silently.
  const selected: typeof candidates = [];
  const ids = new Set<string>(),
    frames = new Set<StoryFrameId>();
  for (const diversify of [true, false])
    for (const slot of candidates) {
      if (
        selected.length >= limit ||
        ids.has(slot.questionId) ||
        (diversify && frames.has(slot.frameId))
      )
        continue;
      selected.push(slot);
      ids.add(slot.questionId);
      frames.add(slot.frameId);
    }
  return selected.map((s, i) => ({ ...s, slotId: `slot-${i}` }));
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
