import { expect, it } from "vitest";
import { STEP_REGISTRY } from "../../src/content/ladder/registry";
import { CONTEXTS } from "../../src/content/contexts/registry";
import { lessonSchema } from "../../src/contracts/lesson";
import { GROUP_LABELS } from "../../src/core/groups/grouping";
import { buildPackage } from "../../src/core/package/build";
import { reflectionUsesForGroups } from "../../src/core/package/reflection";
import { id } from "../fixtures/placement";

it("all 22 curated reflection uses fit the 500-character public objective for the full four-group class, without truncation or StepId", () => {
  for (const step of STEP_REGISTRY) {
    const pkg = buildPackage({
      id: id(1),
      classId: id(2),
      grade: step.grades[0],
      target: step.id,
      variant: "weekly",
      seed: 42,
      occupied: [{ kind: "step", stepId: step.id }],
    });
    const groups = GROUP_LABELS.map((label) => ({
      label,
      activityStep: step.id,
    }));
    const objective = reflectionUsesForGroups(pkg, groups).join(" · ");
    expect(lessonSchema.shape.objective.safeParse(objective).success).toBe(
      true,
    );
    expect(objective).not.toMatch(/\b[A-E][1-6]\b|mastery|studentId/);
    for (const label of GROUP_LABELS)
      expect(objective).toContain(`${label}: ${CONTEXTS[step.id].use}`);
  }
});
