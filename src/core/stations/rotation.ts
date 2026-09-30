import { integer, randomId } from "../validation";
export const STATIONS = ["Guru", "Papan", "Mandiri"] as const;
export type Station = (typeof STATIONS)[number];
export type Rotation = Readonly<{
  id: string;
  revision: number;
  groupIds: readonly string[];
  schedule: readonly (readonly Station[])[];
  round: number;
  phase: "ready" | "work" | "transition" | "complete";
  workSeconds: number;
  reserveSeconds: number;
  addedSeconds: number;
  deadlineAt: number | null;
  short: boolean;
}>;
export function stationSchedule(count: number): Station[][] {
  integer(count, 1);
  if (count > 4) throw new RangeError("At most four groups");
  if (count === 1) return [["Guru", "Papan", "Mandiri"]];
  if (count === 2)
    return [
      ["Guru", "Papan", "Mandiri"],
      ["Papan", "Mandiri", "Guru"],
    ];
  const cycle: Station[] =
    count === 4 ? ["Guru", "Papan", "Mandiri", "Mandiri"] : [...STATIONS];
  return Array.from({ length: count }, (_, i) =>
    Array.from({ length: count }, (_, r) => cycle[(r - i + count) % count]),
  );
}
export function validSchedule(
  schedule: readonly (readonly Station[])[],
): boolean {
  const rounds = schedule[0]?.length;
  return (
    !!rounds &&
    schedule.length <= 4 &&
    schedule.every(
      (row) =>
        row.length === rounds &&
        row.every((s) => STATIONS.includes(s)) &&
        row.filter((s) => s === "Guru").length === 1 &&
        row.filter((s) => s === "Papan").length === 1,
    ) &&
    Array.from({ length: rounds }, (_, r) =>
      ["Guru", "Papan"].every(
        (station) => schedule.filter((row) => row[r] === station).length <= 1,
      ),
    ).every(Boolean)
  );
}
export function createRotation(input: {
  id: string;
  groupIds: readonly string[];
  grade: number;
  initial?: boolean;
  short?: boolean;
}): Rotation {
  randomId(input.id);
  integer(input.grade, 1);
  if (
    input.grade > 12 ||
    new Set(input.groupIds).size !== input.groupIds.length
  )
    throw new RangeError("Invalid rotation input");
  input.groupIds.forEach(randomId);
  const schedule = stationSchedule(input.groupIds.length);
  const rounds = schedule[0].length;
  const budget =
    input.grade <= 3 && !input.initial
      ? 54
      : input.grade <= 6
        ? 36
        : input.grade <= 9
          ? 48
          : 57;
  const available = budget - (input.initial ? 6 : 0) - rounds;
  return {
    id: input.id,
    revision: 1,
    groupIds: [...input.groupIds],
    schedule,
    round: 0,
    phase: "ready",
    workSeconds: input.short ? 22 * 60 : Math.floor(available / rounds) * 60,
    reserveSeconds: input.short ? 0 : (available % rounds) * 60,
    addedSeconds: 0,
    deadlineAt: null,
    short: input.short ?? false,
  };
}
export function remainingSeconds(
  state: Pick<Rotation, "deadlineAt">,
  now: number,
) {
  return state.deadlineAt === null
    ? 0
    : Math.max(0, Math.ceil((state.deadlineAt - now) / 1000));
}
export function rotationAction(
  state: Rotation,
  action: "start" | "extend" | "end" | "next",
  now: number,
): Rotation {
  integer(now);
  if (!validSchedule(state.schedule))
    throw new Error("Invalid station schedule");
  const next = { ...state, revision: state.revision + 1 };
  if (action === "start" && state.phase === "ready")
    return {
      ...next,
      phase: "work",
      deadlineAt: now + state.workSeconds * 1000,
    };
  if (
    action === "extend" &&
    state.phase !== "ready" &&
    state.phase !== "complete"
  )
    return {
      ...next,
      addedSeconds: state.addedSeconds + 180,
      deadlineAt: Math.max(now, state.deadlineAt ?? now) + 180000,
    };
  if (action === "end" && state.phase === "work")
    return {
      ...next,
      phase: state.short ? "complete" : "transition",
      deadlineAt: state.short ? null : now + 60000,
    };
  if (action === "next" && state.phase === "transition")
    return state.round + 1 === state.schedule[0].length
      ? { ...next, phase: "complete", deadlineAt: null }
      : {
          ...next,
          round: state.round + 1,
          phase: "work",
          deadlineAt: now + state.workSeconds * 1000,
        };
  throw new Error("Invalid rotation transition");
}
