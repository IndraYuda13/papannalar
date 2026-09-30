import type { GroupSnapshot } from "../groups/grouping";
import { integer, randomId } from "../validation";

export type Cycle = Readonly<{
  schemaVersion: 1;
  id: string;
  classId: string;
  packageId: string;
  ordinal: number;
  revision: number;
  absentStudentIds: readonly string[];
  groups: readonly GroupSnapshot[];
  classEnded: boolean;
  assessmentRevision: number;
}>;
export function createCycle(
  input: Pick<Cycle, "id" | "classId" | "packageId" | "ordinal">,
): Cycle {
  [input.id, input.classId, input.packageId].forEach(randomId);
  integer(input.ordinal, 1);
  return {
    schemaVersion: 1,
    ...input,
    revision: 1,
    absentStudentIds: [],
    groups: [],
    classEnded: false,
    assessmentRevision: 0,
  };
}
export function setAttendance(
  value: Cycle,
  absentStudentIds: readonly string[],
  roster: readonly string[],
): Cycle {
  if (value.groups.length || value.classEnded)
    throw new Error("Attendance already frozen");
  if (
    new Set(absentStudentIds).size !== absentStudentIds.length ||
    absentStudentIds.some((id) => !roster.includes(id))
  )
    throw new Error("Invalid attendance");
  return {
    ...value,
    revision: value.revision + 1,
    absentStudentIds: [...absentStudentIds],
  };
}
export function freezeCycleGroups(
  value: Cycle,
  groups: readonly GroupSnapshot[],
): Cycle {
  if (value.groups.length || value.classEnded || !groups.length)
    throw new Error("Groups already frozen or empty");
  if (
    groups.some((g) =>
      g.members.some((m) => value.absentStudentIds.includes(m.studentId)),
    )
  )
    throw new Error("Absent member in group");
  return { ...value, revision: value.revision + 1, groups };
}
export function closeCycle(value: Cycle): Cycle {
  if (value.classEnded) return value;
  return { ...value, revision: value.revision + 1, classEnded: true };
}
export function finalizeCycle(
  value: Cycle,
  pendingCount: number,
  acknowledgeMissing: boolean,
): Cycle {
  integer(pendingCount);
  if (!value.classEnded || (pendingCount > 0 && !acknowledgeMissing))
    throw new Error("Close class and acknowledge missing evidence first");
  if (value.assessmentRevision) return value;
  return { ...value, revision: value.revision + 1, assessmentRevision: 1 };
}
export function reviseCycle(value: Cycle): Cycle {
  return value.assessmentRevision
    ? {
        ...value,
        revision: value.revision + 1,
        assessmentRevision: value.assessmentRevision + 1,
      }
    : value;
}
