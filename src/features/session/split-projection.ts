import type { TeacherPackage } from "@/core/package/build";
import type { GroupSnapshot } from "@/core/groups/grouping";
import { questionTool } from "@/core/package/tool-task";
import { toPublicQuestion } from "@/contracts/package";
import { publicTool } from "@/contracts/tools";
import { publicSplit, type PublicSplit } from "@/contracts/board-layout";
export function splitProjection(
  pkg: TeacherPackage,
  groups: readonly GroupSnapshot[],
): PublicSplit {
  return publicSplit({
    panels: groups.map((g) => {
      const activity = pkg.activities.find((a) => a.stepId === g.activityStep);
      if (!activity) throw new Error("Paket kelompok belum siap.");
      return {
        groupId: g.id,
        exercises: activity.board.map((q) => {
          const tool = questionTool(q);
          return {
            id: q.id,
            prompt: toPublicQuestion(q).prompt,
            ...(tool ? { tool: publicTool(tool) } : {}),
          };
        }),
      };
    }),
  });
}
