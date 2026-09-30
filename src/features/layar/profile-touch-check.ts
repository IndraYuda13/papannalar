export const TOUCH_STAGES = [1, 2, 4] as const;
export const TOUCH_RESULT_MS = 750;
export const TOUCH_RELEASE_MS = 120;
export type TouchCheck = {
  stage: number;
  passed: readonly [boolean, boolean, boolean];
  active: readonly { id: number; zone: number }[];
  matchedAt: number | null;
  releasedAt: number | null;
};
export const initialTouchCheck = (): TouchCheck => ({
  stage: 0,
  passed: [false, false, false],
  active: [],
  matchedAt: null,
  releasedAt: null,
});
export type TouchCheckAction =
  | {
      type: "down";
      id: number;
      zone: number;
      pointerType: string;
      width: number;
      height: number;
      now: number;
    }
  | { type: "release"; id: number; now: number }
  | { type: "tick"; now: number }
  | { type: "fallback" };

export function touchCheckDelay(state: TouchCheck, now: number): number | null {
  if (
    state.matchedAt === null ||
    state.releasedAt === null ||
    state.active.length
  )
    return null;
  return Math.max(
    0,
    state.matchedAt + TOUCH_RESULT_MS - now,
    state.releasedAt + TOUCH_RELEASE_MS - now,
  );
}
export function reduceTouchCheck(
  state: TouchCheck,
  action: TouchCheckAction,
): TouchCheck {
  if (state.stage >= TOUCH_STAGES.length) return state;
  if (action.type === "fallback")
    return {
      ...state,
      stage: 3,
      active: [],
      matchedAt: null,
      releasedAt: null,
    };
  if (action.type === "tick") {
    if (touchCheckDelay(state, action.now) !== 0) return state;
    return {
      ...state,
      stage: state.stage + 1,
      active: [],
      matchedAt: null,
      releasedAt: null,
    };
  }
  if (action.type === "release") {
    if (!state.active.some((p) => p.id === action.id)) return state;
    const active = state.active.filter((p) => p.id !== action.id);
    return {
      ...state,
      active,
      releasedAt: active.length === 0 ? action.now : null,
    };
  }
  if (
    action.pointerType !== "touch" ||
    action.width > 80 ||
    action.height > 80 ||
    action.zone < 0 ||
    action.zone >= TOUCH_STAGES[state.stage] ||
    state.active.some((p) => p.id === action.id)
  )
    return state;
  const active = [...state.active, { id: action.id, zone: action.zone }];
  const matched =
    new Set(active.map((p) => p.zone)).size >= TOUCH_STAGES[state.stage];
  const passed: [boolean, boolean, boolean] = [...state.passed];
  if (matched) passed[state.stage] = true;
  return {
    ...state,
    active,
    passed,
    releasedAt: null,
    matchedAt: state.matchedAt ?? (matched ? action.now : null),
  };
}
