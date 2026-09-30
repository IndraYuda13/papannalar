import {
  getStep,
  parseStepId,
  type StepId,
} from "../../content/ladder/registry";
import { compareIdentity } from "../assessment/binding";
import { seededGroupId, seededShuffle } from "../math/seed";
import type { ComputedLevel } from "../placement/computed-level";
import {
  flag,
  integer,
  placementValue,
  randomId,
  strictRecord,
} from "../validation";

export const GROUP_LABELS = [
  "Segitiga Biru",
  "Lingkaran Oranye",
  "Kotak Hijau",
  "Belah Ketupat Ungu",
] as const;
export type GroupLabel = (typeof GROUP_LABELS)[number];
export type GroupStudent = Readonly<{
  studentId: string;
  attendanceNumber: number;
  active: boolean;
  displayed: ComputedLevel;
}>;
export type Composition = Readonly<{ placement: ComputedLevel; count: number }>;
export type GroupSnapshot = Readonly<{
  id: string;
  label: GroupLabel;
  members: readonly GroupStudent[];
  composition: readonly Composition[];
  activityStep: StepId;
  exitBaseStep: StepId;
  exitContextStep: StepId;
  extensionSteps: readonly StepId[];
  supportStudentIds: readonly string[];
  enrichmentStudentIds: readonly string[];
}>;
export type Grouping = Readonly<{
  groups: readonly GroupSnapshot[];
  merges: readonly Readonly<{
    reason: "group-limit" | "small-group";
    composition: readonly Composition[];
  }>[];
  smallClass: boolean;
  homogeneous: boolean;
}>;
type Bin = {
  members: GroupStudent[];
  reason: "occupied" | "group-limit" | "small-group" | "homogeneous";
};

function readStudent(input: GroupStudent): GroupStudent {
  const value = strictRecord(input, [
    "studentId",
    "attendanceNumber",
    "active",
    "displayed",
  ]);
  const attendanceNumber = integer(value.attendanceNumber, 1);
  if (attendanceNumber > 40) throw new RangeError("Invalid attendance number");
  return Object.freeze({
    studentId: randomId(value.studentId),
    attendanceNumber,
    active: flag(value.active),
    displayed: placementValue(value.displayed),
  });
}
function rank(placement: ComputedLevel): number {
  return placement.kind === "lanjut" ? 22 : getStep(placement.stepId).index;
}
function effective(placement: ComputedLevel, target: StepId): StepId {
  return placement.kind === "lanjut" ? target : placement.stepId;
}
function composition(members: readonly GroupStudent[]): readonly Composition[] {
  const counts = new Map<number, { placement: ComputedLevel; count: number }>();
  for (const member of members) {
    const key = rank(member.displayed);
    const existing = counts.get(key);
    if (existing) existing.count++;
    else counts.set(key, { placement: member.displayed, count: 1 });
  }
  return Object.freeze(
    [...counts.values()]
      .sort((a, b) => rank(a.placement) - rank(b.placement))
      .map((item) => Object.freeze(item)),
  );
}
function snapshot(
  bin: Bin,
  target: StepId,
  id: string,
  label: GroupLabel,
  activity?: StepId,
): GroupSnapshot {
  const members = Object.freeze(
    [...bin.members].sort((a, b) => a.attendanceNumber - b.attendanceNumber),
  );
  const levels = composition(members);
  const steps = [
    ...new Set(levels.map((item) => effective(item.placement, target))),
  ].sort((a, b) => getStep(a).index - getStep(b).index);
  const majority = [...levels].sort(
    (a, b) => b.count - a.count || rank(a.placement) - rank(b.placement),
  )[0];
  const activityStep =
    activity ??
    (bin.reason === "small-group"
      ? effective(majority.placement, target)
      : steps[0]);
  return Object.freeze({
    id,
    label,
    members,
    composition: levels,
    activityStep,
    exitBaseStep: steps[0],
    exitContextStep: steps[steps.length - 1],
    extensionSteps: Object.freeze(
      steps.filter((step) => getStep(step).index > getStep(activityStep).index),
    ),
    supportStudentIds: Object.freeze(
      members
        .filter(
          (member) =>
            getStep(effective(member.displayed, target)).index <
            getStep(activityStep).index,
        )
        .map((member) => member.studentId),
    ),
    enrichmentStudentIds: Object.freeze(
      members
        .filter((member) => member.displayed.kind === "lanjut")
        .map((member) => member.studentId),
    ),
  });
}

export function groupStudents(
  inputs: readonly GroupStudent[],
  config: Readonly<{ target: StepId; seed: number; desiredGroups?: number }>,
): Grouping {
  const target = parseStepId(config.target);
  const seed = integer(config.seed);
  if (seed > 0xffffffff) throw new RangeError("Invalid seed");
  const desired = config.desiredGroups ?? 3;
  if (![2, 3, 4].includes(desired))
    throw new RangeError("Invalid group target");
  if (inputs.length > 40) throw new RangeError("Roster exceeds class limit");
  const students = inputs.map(readStudent);
  if (
    new Set(students.map((student) => student.studentId)).size !==
      students.length ||
    new Set(students.map((student) => student.attendanceNumber)).size !==
      students.length
  )
    throw new Error("Duplicate roster identity");
  const active = students
    .filter((student) => student.active)
    .sort(
      (a, b) =>
        rank(a.displayed) - rank(b.displayed) ||
        compareIdentity(a.studentId, b.studentId),
    );
  const occupied = new Map<number, Bin>();
  for (const student of active) {
    const key = rank(student.displayed);
    if (!occupied.has(key))
      occupied.set(key, { members: [], reason: "occupied" });
    occupied.get(key)!.members.push(student);
  }
  const homogeneous = occupied.size === 1;
  let bins = [...occupied.values()];
  const merges: Grouping["merges"][number][] = [];
  function merge(index: number, reason: "group-limit" | "small-group") {
    const merged: Bin = {
      members: [...bins[index].members, ...bins[index + 1].members],
      reason,
    };
    bins.splice(index, 2, merged);
    merges.push(
      Object.freeze({ reason, composition: composition(merged.members) }),
    );
  }
  if (homogeneous) {
    const count = Math.min(desired, Math.max(1, Math.floor(active.length / 3)));
    const shuffled = seededShuffle(active, (seed ^ 0x51ed270b) >>> 0);
    bins = Array.from({ length: count }, () => ({
      members: [],
      reason: "homogeneous",
    }));
    shuffled.forEach((student, i) => bins[i % count].members.push(student));
  } else {
    while (bins.length > desired) {
      let smallest = 0;
      for (let i = 1; i < bins.length - 1; i++)
        if (
          bins[i].members.length + bins[i + 1].members.length <
          bins[smallest].members.length + bins[smallest + 1].members.length
        )
          smallest = i;
      merge(smallest, "group-limit");
    }
    while (bins.length > 1) {
      const index = bins.findIndex((bin) => bin.members.length < 3);
      if (index < 0) break;
      const left = index > 0 ? bins[index - 1].members.length : Infinity;
      const right =
        index < bins.length - 1 ? bins[index + 1].members.length : Infinity;
      merge(left <= right ? index - 1 : index, "small-group");
    }
  }
  const labels = seededShuffle(GROUP_LABELS, seed);
  return Object.freeze({
    groups: Object.freeze(
      bins.map((bin, i) =>
        snapshot(bin, target, seededGroupId(seed, i), labels[i]),
      ),
    ),
    merges: Object.freeze(merges),
    smallClass: active.length > 0 && active.length < 3,
    homogeneous,
  });
}

// Local preview only. Caller records a teacher group-move event; frozen exit
// bindings remain independent and cannot be edited by this operation.
export function moveGroupStudent(
  groups: readonly GroupSnapshot[],
  studentId: string,
  destinationId: string,
  target: StepId,
): readonly GroupSnapshot[] {
  const identity = randomId(studentId);
  const destination = randomId(destinationId);
  parseStepId(target);
  const member = groups
    .flatMap((group) => group.members)
    .find((member) => member.studentId === identity);
  if (!member || !groups.some((group) => group.id === destination))
    throw new Error("Unknown group assignment");
  return Object.freeze(
    groups.flatMap((group) => {
      const members = group.members.filter(
        (member) => member.studentId !== identity,
      );
      if (group.id === destination) members.push(member);
      if (!members.length) return [];
      return [
        snapshot(
          { members, reason: "occupied" },
          target,
          group.id,
          group.label,
          group.activityStep,
        ),
      ];
    }),
  );
}
