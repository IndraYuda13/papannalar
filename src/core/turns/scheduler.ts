import { seededShuffle } from "../math/seed";
import { integer, randomId } from "../validation";
export type TurnCandidate = Readonly<{
  studentId: string;
  attendanceNumber: number;
  present: boolean;
  navigatorFirst: boolean;
}>;
export type TurnEvent = Readonly<{
  id: string;
  sessionId: string;
  groupId: string | null;
  taskIndex: number;
  seed: number;
  pilots: readonly string[];
  navigators: readonly string[];
  teams: readonly (readonly string[])[];
}>;
export function turnCounts(events: readonly TurnEvent[], studentId: string) {
  return {
    pilot: events.filter((e) => e.pilots.includes(studentId)).length,
    navigator: events.filter((e) => e.navigators.includes(studentId)).length,
  };
}
function ranked(
  students: readonly TurnCandidate[],
  events: readonly TurnEvent[],
  role: "pilot" | "navigator",
  seed: number,
) {
  return seededShuffle(students, seed).sort(
    (a, b) =>
      turnCounts(events, a.studentId)[role] -
      turnCounts(events, b.studentId)[role],
  );
}
export function splitTeams(
  students: readonly TurnCandidate[],
  events: readonly TurnEvent[],
  seed: number,
  taskCount = 3,
): readonly (readonly string[])[] {
  if (students.length <= 8) return [students.map((s) => s.studentId)];
  const ordered = ranked(students, events, "pilot", seed).sort(
    (a, b) =>
      Number(b.present && !b.navigatorFirst) -
      Number(a.present && !a.navigatorFirst),
  );
  // Three tasks alternate A/B/A. Distribute least-served members 2:1 across
  // those opportunities while retaining team sizes that differ by at most one.
  const sizes = [Math.ceil(ordered.length / 2), Math.floor(ordered.length / 2)];
  const teams: string[][] = [[], []];
  ordered.forEach((student, index) => {
    const preferred = taskCount % 2 === 0 ? index % 2 : index % 3 === 2 ? 1 : 0;
    const team =
      teams[preferred].length < sizes[preferred] ? preferred : 1 - preferred;
    teams[team].push(student.studentId);
  });
  return teams;
}
export function planTurns(input: {
  id: string;
  sessionId: string;
  groupId: string | null;
  taskIndex: number;
  seed: number;
  students: readonly TurnCandidate[];
  events: readonly TurnEvent[];
  teams: readonly (readonly string[])[];
  verifiedTouches: number;
}): TurnEvent {
  randomId(input.id);
  randomId(input.sessionId);
  if (input.groupId) randomId(input.groupId);
  integer(input.taskIndex);
  integer(input.verifiedTouches);
  if (
    new Set(input.students.map((s) => s.studentId)).size !==
      input.students.length ||
    input.students.some(
      (s) =>
        s.attendanceNumber < 1 ||
        s.attendanceNumber > 40 ||
        !Number.isInteger(s.attendanceNumber),
    )
  )
    throw new Error("Invalid role roster");
  input.students.forEach((s) => randomId(s.studentId));
  const teamIds = input.teams.flat();
  if (
    input.teams.length < 1 ||
    input.teams.length > 2 ||
    new Set(teamIds).size !== teamIds.length ||
    teamIds.length !== input.students.length ||
    input.students.some((s) => !teamIds.includes(s.studentId))
  )
    throw new Error("Invalid role teams");
  const team = input.teams[input.taskIndex % input.teams.length];
  const present = input.students.filter(
    (s) => s.present && team.includes(s.studentId),
  );
  const pilots = ranked(
    present.filter((s) => !s.navigatorFirst),
    input.events,
    "pilot",
    input.seed,
  )
    .slice(0, input.verifiedTouches >= 2 ? 2 : 1)
    .map((s) => s.studentId);
  const navigators = ranked(
    present.filter((s) => !pilots.includes(s.studentId)),
    input.events,
    "navigator",
    (input.seed + 1) >>> 0,
  )
    .slice(0, Math.min(2, 4 - pilots.length))
    .map((s) => s.studentId);
  return {
    id: input.id,
    sessionId: input.sessionId,
    groupId: input.groupId,
    taskIndex: input.taskIndex,
    seed: input.seed,
    pilots,
    navigators,
    teams: input.teams.map((team) => [...team]),
  };
}
export function startTurn(
  events: readonly TurnEvent[],
  event: TurnEvent,
): readonly TurnEvent[] {
  const prior = events.find(
    (e) =>
      e.id === event.id ||
      (e.sessionId === event.sessionId &&
        e.groupId === event.groupId &&
        e.taskIndex === event.taskIndex),
  );
  if (prior) {
    if (JSON.stringify(prior) !== JSON.stringify(event))
      throw new Error("Turn assignment conflict");
    return events;
  }
  if (
    event.pilots.length > 2 ||
    event.navigators.length > 2 ||
    new Set([...event.pilots, ...event.navigators]).size !==
      event.pilots.length + event.navigators.length
  )
    throw new Error("Invalid roles");
  return [...events, event];
}
