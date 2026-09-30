export type AlgebraTask = Readonly<{
  kind: "algebra";
  groups: number;
  xPerGroup: number;
  constantPerGroup: number;
}>;
export type Tile = Readonly<{ id: string; kind: "x" | "unit"; sign: 1 | -1 }>;
export type TileGroup = Readonly<{ id: string; tiles: readonly Tile[] }>;
export type AlgebraState = Readonly<{
  groups: readonly TileGroup[];
  history: readonly (readonly TileGroup[])[];
}>;
export type AlgebraAction =
  | { type: "group"; id: string }
  | { type: "add"; groupId: string; tile: Tile }
  | { type: "move"; tileId: string; groupId: string }
  | { type: "cancel"; leftId: string; rightId: string }
  | { type: "undo" }
  | { type: "reset" };
export function validateAlgebraTask(task: AlgebraTask) {
  if (
    task.kind !== "algebra" ||
    !Number.isInteger(task.groups) ||
    task.groups < 1 ||
    task.groups > 6 ||
    !Number.isInteger(task.xPerGroup) ||
    Math.abs(task.xPerGroup) > 3 ||
    !Number.isInteger(task.constantPerGroup) ||
    Math.abs(task.constantPerGroup) > 9
  )
    throw new RangeError("Algebra task bounds");
  return task;
}
export function initialAlgebra(): AlgebraState {
  return { groups: [], history: [] };
}
export function coefficients(tiles: readonly Tile[]) {
  return tiles.reduce(
    (result, tile) => ({
      x: result.x + (tile.kind === "x" ? tile.sign : 0),
      constant: result.constant + (tile.kind === "unit" ? tile.sign : 0),
    }),
    { x: 0, constant: 0 },
  );
}
export function reduceAlgebra(
  state: AlgebraState,
  action: AlgebraAction,
): AlgebraState {
  if (action.type === "reset") return initialAlgebra();
  if (action.type === "undo")
    return state.history.length
      ? { groups: state.history.at(-1)!, history: state.history.slice(0, -1) }
      : state;
  if (state.history.length >= 150)
    throw new RangeError("Undo or reset before more tiles");
  let groups = [...state.groups];
  const tiles = groups.flatMap((g) => g.tiles);
  if (action.type === "group") {
    if (
      !action.id ||
      action.id.length > 80 ||
      groups.length >= 6 ||
      groups.some((g) => g.id === action.id)
    )
      throw new Error("Invalid group");
    groups.push({ id: action.id, tiles: [] });
  } else if (action.type === "add") {
    if (
      !groups.some((g) => g.id === action.groupId) ||
      !action.tile.id ||
      action.tile.id.length > 80 ||
      tiles.some((t) => t.id === action.tile.id) ||
      tiles.length >= 90 ||
      !["x", "unit"].includes(action.tile.kind) ||
      ![1, -1].includes(action.tile.sign)
    )
      throw new Error("Invalid tile");
    groups = groups.map((g) =>
      g.id === action.groupId
        ? {
            id: g.id,
            tiles: [
              ...g.tiles,
              {
                id: action.tile.id,
                kind: action.tile.kind,
                sign: action.tile.sign,
              },
            ],
          }
        : g,
    );
  } else if (action.type === "move") {
    const tile = tiles.find((t) => t.id === action.tileId),
      source = groups.find((g) => g.tiles.some((t) => t.id === action.tileId));
    if (!tile || !groups.some((g) => g.id === action.groupId))
      throw new Error("Unknown tile/group");
    if (source?.id === action.groupId) return state;
    groups = groups.map((g) => ({
      id: g.id,
      tiles:
        g.id === action.groupId
          ? [...g.tiles, tile]
          : g.tiles.filter((t) => t.id !== action.tileId),
    }));
  } else {
    const left = tiles.find((t) => t.id === action.leftId),
      right = tiles.find((t) => t.id === action.rightId);
    if (
      !left ||
      !right ||
      left.kind !== right.kind ||
      left.sign + right.sign !== 0 ||
      !groups.some((g) => g.tiles.includes(left) && g.tiles.includes(right))
    )
      throw new Error(
        "Zero pairs need opposite signs, same kind and same group",
      );
    groups = groups.map((g) => ({
      id: g.id,
      tiles: g.tiles.filter((t) => t.id !== left.id && t.id !== right.id),
    }));
  }
  return { groups, history: [...state.history, state.groups] };
}
export function checkAlgebra(state: AlgebraState, task: AlgebraTask) {
  validateAlgebraTask(task);
  const mismatchedGroups = state.groups.flatMap((g, i) => {
    const value = coefficients(g.tiles);
    return value.x === task.xPerGroup &&
      value.constant === task.constantPerGroup
      ? []
      : [i];
  });
  return {
    modelMatches:
      state.groups.length === task.groups && mismatchedGroups.length === 0,
    mismatchedGroups,
    total: coefficients(state.groups.flatMap((g) => g.tiles)),
  };
}
