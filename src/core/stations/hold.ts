import { validSchedule, type Rotation, type Station } from "./rotation";
export type HoldPreview =
  | Readonly<{
      kind: "safe";
      baseRevision: number;
      groupId: string;
      schedule: readonly (readonly Station[])[];
      changedSlots: number;
    }>
  | Readonly<{
      kind: "blocked";
      reason: "no-remaining-round" | "no-safe-schedule";
      alternatives: readonly ["extend", "end"];
    }>;
function permutations(values: readonly Station[]): Station[][] {
  if (!values.length) return [[]];
  return [...new Set(values)].flatMap((value) => {
    const rest = [...values];
    rest.splice(rest.indexOf(value), 1);
    return permutations(rest).map((tail) => [value, ...tail]);
  });
}
export function previewHold(state: Rotation, groupId: string): HoldPreview {
  const group = state.groupIds.indexOf(groupId),
    nextRound = state.round + 1;
  if (group < 0 || !validSchedule(state.schedule))
    throw new Error("Invalid hold input");
  if (
    state.short ||
    state.phase !== "work" ||
    nextRound >= state.schedule[0].length
  )
    return {
      kind: "blocked",
      reason: "no-remaining-round",
      alternatives: ["extend", "end"],
    };
  const choices = state.schedule.map((row, i) =>
    permutations(row.slice(nextRound))
      .filter((tail) => i !== group || tail[0] === row[state.round])
      .map((tail) => [...row.slice(0, nextRound), ...tail]),
  );
  let best: Station[][] | undefined,
    changedSlots = Infinity;
  function visit(rows: Station[][]) {
    if (rows.length === choices.length) {
      if (!validSchedule(rows)) return;
      const changed = rows.reduce(
        (sum, row, i) =>
          sum + row.filter((value, r) => value !== state.schedule[i][r]).length,
        0,
      );
      if (changed < changedSlots) {
        best = rows;
        changedSlots = changed;
      }
      return;
    }
    for (const row of choices[rows.length]) {
      const collision = row.some(
        (station, r) =>
          station !== "Mandiri" && rows.some((prior) => prior[r] === station),
      );
      if (!collision) visit([...rows, row]);
    }
  }
  visit([]);
  return best
    ? {
        kind: "safe",
        baseRevision: state.revision,
        groupId,
        schedule: best,
        changedSlots,
      }
    : {
        kind: "blocked",
        reason: "no-safe-schedule",
        alternatives: ["extend", "end"],
      };
}
export function confirmHold(state: Rotation, preview: HoldPreview): Rotation {
  if (preview.kind !== "safe" || state.revision !== preview.baseRevision)
    throw new Error("Stale or unsafe hold preview");
  const expected = previewHold(state, preview.groupId);
  if (
    expected.kind !== "safe" ||
    JSON.stringify(preview.schedule) !== JSON.stringify(expected.schedule)
  )
    throw new Error("Hold preview changed");
  return {
    ...state,
    revision: state.revision + 1,
    schedule: expected.schedule,
  };
}
