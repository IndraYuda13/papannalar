import { compareIdentity } from "../assessment/binding";
import {
  integer,
  oneOf,
  placementValue,
  randomId,
  strictRecord,
} from "../validation";
import type { ComputedLevel } from "./computed-level";

type TeacherEventBase = Readonly<{
  id: string;
  studentId: string;
  actorTeacherId: string;
  afterSessionOrdinal: number;
  sequence: number;
}>;
// A closed reason code keeps free text/names out of the domain log. Longer local
// teacher notes, if added later, must not be attached to these records.
export type TeacherPlacementEvent =
  | (TeacherEventBase &
      Readonly<{
        kind: "placement-override";
        placement: ComputedLevel;
        reasonCode: "teacher-assessment" | "placement-correction";
      }>)
  | (TeacherEventBase &
      Readonly<{
        kind: "group-move";
        groupId: string;
        reasonCode: "teacher-assessment" | "participation-adjustment";
      }>);

export function freezeTeacherEvent(input: unknown): TeacherPlacementEvent {
  const kind = oneOf((input as { kind?: unknown } | null)?.kind, [
    "placement-override",
    "group-move",
  ] as const);
  const value = strictRecord(input, [
    "id",
    "studentId",
    "actorTeacherId",
    "afterSessionOrdinal",
    "sequence",
    "kind",
    "reasonCode",
    kind === "placement-override" ? "placement" : "groupId",
  ]);
  const base = {
    id: randomId(value.id),
    studentId: randomId(value.studentId),
    actorTeacherId: randomId(value.actorTeacherId),
    afterSessionOrdinal: integer(value.afterSessionOrdinal),
    sequence: integer(value.sequence, 1),
  };
  return kind === "placement-override"
    ? Object.freeze({
        ...base,
        kind,
        placement: placementValue(value.placement),
        reasonCode: oneOf(value.reasonCode, [
          "teacher-assessment",
          "placement-correction",
        ] as const),
      })
    : Object.freeze({
        ...base,
        kind,
        groupId: randomId(value.groupId),
        reasonCode: oneOf(value.reasonCode, [
          "teacher-assessment",
          "participation-adjustment",
        ] as const),
      });
}

export function canonicalTeacherEvents(
  inputs: readonly TeacherPlacementEvent[],
): readonly TeacherPlacementEvent[] {
  const events = new Map<string, TeacherPlacementEvent>();
  const sequences = new Map<string, string>();
  for (const input of inputs) {
    const event = freezeTeacherEvent(input);
    const previous = events.get(event.id);
    if (previous && JSON.stringify(previous) !== JSON.stringify(event))
      throw new Error("Teacher event identity conflict");
    const position = `${event.studentId}/${event.afterSessionOrdinal}/${event.sequence}`;
    if (sequences.has(position) && sequences.get(position) !== event.id)
      throw new Error("Teacher event sequence conflict");
    sequences.set(position, event.id);
    events.set(event.id, event);
  }
  return Object.freeze(
    [...events.values()].sort(
      (a, b) =>
        a.afterSessionOrdinal - b.afterSessionOrdinal ||
        a.sequence - b.sequence ||
        compareIdentity(a.id, b.id),
    ),
  );
}
