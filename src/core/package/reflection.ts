import { CONTEXTS } from "../../content/contexts/registry";
import type { GroupSnapshot } from "../groups/grouping";
import type { TeacherPackage } from "./build";

/** Project only material actually assigned, including the majority of a merge. */
export function reflectionUsesForGroups(
  pkg: Pick<TeacherPackage, "activities">,
  groups: readonly Pick<GroupSnapshot, "label" | "activityStep">[],
): readonly string[] {
  return groups.map((group) => {
    if (!pkg.activities.some((a) => a.stepId === group.activityStep))
      throw new Error("Reflection material is not in the active package");
    return `${group.label}: ${CONTEXTS[group.activityStep].use}`;
  });
}
