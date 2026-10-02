import {
  allPackageQuestions,
  prepareActivitySet,
  type TeacherPackage,
} from "./build";
import {
  applyStory,
  type StoryChoice,
} from "../../content/contexts/story-frames";
import { contentHash } from "../../content/templates/format";

export function applyPackageStories(
  pkg: TeacherPackage,
  expectedRevision: number,
  input: readonly { questionId: string; choice: StoryChoice }[],
): TeacherPackage {
  if (pkg.frozen || pkg.revision !== expectedRevision)
    throw new Error("Package cannot change");
  const eligible = pkg.activities.flatMap((a) => a.independent);
  if (
    !input.length ||
    new Set(input.map((s) => s.questionId)).size !== input.length ||
    input.some((s) => !eligible.some((q) => q.id === s.questionId))
  )
    throw new Error("Invalid story slots");
  const ids = new Set([
    ...allPackageQuestions(pkg)
      .filter((q) => q.story)
      .map((q) => q.id),
    ...input.map((s) => s.questionId),
  ]);
  if (ids.size > Math.floor(allPackageQuestions(pkg).length / 3))
    throw new Error("Story limit");
  const next = {
    ...pkg,
    revision: pkg.revision + 1,
    activities: pkg.activities.map((a) =>
      prepareActivitySet({
        ...a,
        independent: a.independent.map((q) => {
          const suggestion = input.find((s) => s.questionId === q.id);
          return suggestion ? applyStory(q, suggestion.choice) : q;
        }),
      }),
    ),
  };
  const { contentHash: previous, ...content } = next;
  void previous;
  return { ...next, contentHash: contentHash(JSON.stringify(content)) };
}
