import { buildPackage } from "../../src/core/package/build";
import { groupStudents } from "../../src/core/groups/grouping";
import { seededGroupId } from "../../src/core/math/seed";
import { boardPackageProjection } from "../../src/features/session/board-package-projection";
export function boardPackageFixture(grade = 7, short = false) {
  const id = (n: number) => seededGroupId(481, n);
  const step = grade <= 6 ? ("A4" as const) : ("D1" as const);
  const p = buildPackage({
    id: id(0),
    classId: id(1),
    grade,
    variant: short ? "short" : "weekly",
    seed: 177,
    occupied: [
      { kind: "step", stepId: step },
      { kind: "step", stepId: grade <= 6 ? "B1" : "D3" },
    ],
  });
  const grouped = groupStudents(
    Array.from({ length: 16 }, (_, i) => ({
      studentId: id(i + 5),
      attendanceNumber: i + 1,
      active: true,
      displayed: {
        kind: "step" as const,
        stepId: i < 8 ? step : grade <= 6 ? ("B1" as const) : ("D3" as const),
      },
    })),
    { seed: 17, target: grade <= 6 ? "C3" : "D3" },
  );
  return { p, packet: boardPackageProjection(p, id(3), grouped.groups) };
}
