import {
  flag,
  integer,
  placementValue,
  randomId,
  samePlacement,
  strictRecord,
} from "../validation";
import {
  freezeTeacherEvent,
  type TeacherPlacementEvent,
} from "./teacher-events";
import type { ComputedLevel } from "./computed-level";

export type ComputedPlacement = ComputedLevel;
export type DisplayedPlacement = ComputedLevel;
type SessionRef = Readonly<{ sessionId: string; ordinal: number }>;
type SessionDecision = SessionRef &
  Readonly<{
    computed: ComputedPlacement;
    eligible: boolean;
    initial: boolean;
  }>;
export type PlacementState = Readonly<{
  computed: ComputedPlacement;
  displayed: DisplayedPlacement | null;
  pendingStreak: 0 | 1;
  lastEligibleSession: SessionRef | null;
  lastFinalizedSession: SessionDecision | null;
  manualOverride: Readonly<{
    eventId: string;
    afterSessionOrdinal: number;
  }> | null;
}>;
export type PlacementSession = SessionDecision &
  Readonly<{ finalized: boolean }>;

function sessionRef(value: unknown): SessionRef {
  const input = strictRecord(value, ["sessionId", "ordinal"]);
  return Object.freeze({
    sessionId: randomId(input.sessionId),
    ordinal: integer(input.ordinal, 1),
  });
}

export function createPlacementState(
  computed: ComputedPlacement,
  displayed: DisplayedPlacement | null = null,
): PlacementState {
  return Object.freeze({
    computed: placementValue(computed),
    displayed: displayed === null ? null : placementValue(displayed),
    pendingStreak: 0,
    lastEligibleSession: null,
    lastFinalizedSession: null,
    manualOverride: null,
  });
}

function readState(input: PlacementState): PlacementState {
  const value = strictRecord(input, [
    "computed",
    "displayed",
    "pendingStreak",
    "lastEligibleSession",
    "lastFinalizedSession",
    "manualOverride",
  ]);
  const pending = integer(value.pendingStreak);
  if (pending > 1) throw new RangeError("Invalid placement streak");
  let lastFinalizedSession: SessionDecision | null = null;
  if (value.lastFinalizedSession !== null) {
    const last = strictRecord(value.lastFinalizedSession, [
      "sessionId",
      "ordinal",
      "computed",
      "eligible",
      "initial",
    ]);
    lastFinalizedSession = Object.freeze({
      sessionId: randomId(last.sessionId),
      ordinal: integer(last.ordinal, 1),
      computed: placementValue(last.computed),
      eligible: flag(last.eligible),
      initial: flag(last.initial),
    });
  }
  let manualOverride: PlacementState["manualOverride"] = null;
  if (value.manualOverride !== null) {
    const manual = strictRecord(value.manualOverride, [
      "eventId",
      "afterSessionOrdinal",
    ]);
    manualOverride = Object.freeze({
      eventId: randomId(manual.eventId),
      afterSessionOrdinal: integer(manual.afterSessionOrdinal),
    });
  }
  const displayed =
    value.displayed === null ? null : placementValue(value.displayed);
  const lastEligibleSession =
    value.lastEligibleSession === null
      ? null
      : sessionRef(value.lastEligibleSession);
  if (
    (pending === 1 && (displayed === null || lastEligibleSession === null)) ||
    (manualOverride !== null && displayed === null) ||
    (lastEligibleSession &&
      (!lastFinalizedSession ||
        lastEligibleSession.ordinal > lastFinalizedSession.ordinal))
  )
    throw new Error("Invalid placement history");
  return Object.freeze({
    computed: placementValue(value.computed),
    displayed,
    pendingStreak: pending === 0 ? 0 : 1,
    lastEligibleSession,
    lastFinalizedSession,
    manualOverride,
  });
}

// Initial placement is the first-session exception: usable as soon as its ten
// answers are complete, even before exit/finalization. No BKT or streak increment.
export function anchorInitialPlacement(
  input: PlacementState,
  computed: ComputedPlacement,
): PlacementState {
  const state = readState(input);
  if (state.lastFinalizedSession !== null)
    throw new Error("Initial anchor requires replay from baseline");
  const candidate = placementValue(computed);
  return Object.freeze({
    ...state,
    computed: candidate,
    displayed: state.manualOverride ? state.displayed : candidate,
    pendingStreak: 0,
  });
}

// Only the ordered finalized session reducer can advance hysteresis. A correction
// to an already-closed session must be replayed, never applied as an extra session.
export function applySessionPlacement(
  input: PlacementState,
  session: PlacementSession,
): PlacementState {
  const state = readState(input);
  const value = strictRecord(session, [
    "sessionId",
    "ordinal",
    "computed",
    "eligible",
    "initial",
    "finalized",
  ]);
  const decision = Object.freeze({
    sessionId: randomId(value.sessionId),
    ordinal: integer(value.ordinal, 1),
    computed: placementValue(value.computed),
    eligible: flag(value.eligible),
    initial: flag(value.initial),
  });
  const finalized = flag(value.finalized);
  if (decision.initial && !decision.eligible)
    throw new Error("Initial placement requires valid evidence");
  const last = state.lastFinalizedSession;
  if (last && decision.ordinal <= last.ordinal) {
    if (finalized && JSON.stringify(last) === JSON.stringify(decision))
      return state;
    throw new Error("Placement correction requires ordered replay");
  }
  if (!finalized)
    return Object.freeze({ ...state, computed: decision.computed });

  let displayed = state.displayed;
  let pendingStreak = state.pendingStreak;
  let manualOverride = state.manualOverride;
  if (manualOverride !== null) {
    if (decision.ordinal < manualOverride.afterSessionOrdinal)
      throw new Error("Teacher event requires ordered replay");
    pendingStreak = 0;
    // TECH_SPEC 5.6 [D]: hold through the next session closure, then normal hysteresis.
    if (decision.ordinal > manualOverride.afterSessionOrdinal)
      manualOverride = null;
  } else if (decision.eligible) {
    if (
      displayed === null ||
      decision.initial ||
      (pendingStreak === 1 && !samePlacement(displayed, decision.computed))
    ) {
      displayed = decision.computed;
      pendingStreak = 0;
    } else if (samePlacement(displayed, decision.computed)) {
      pendingStreak = 0;
    } else {
      pendingStreak = 1;
    }
  }
  return Object.freeze({
    computed: decision.computed,
    displayed,
    pendingStreak,
    lastEligibleSession: decision.eligible
      ? Object.freeze({
          sessionId: decision.sessionId,
          ordinal: decision.ordinal,
        })
      : state.lastEligibleSession,
    lastFinalizedSession: decision,
    manualOverride,
  });
}

export function applyTeacherPlacementEvent(
  input: PlacementState,
  eventInput: TeacherPlacementEvent,
): PlacementState {
  const state = readState(input);
  const event = freezeTeacherEvent(eventInput);
  if (event.afterSessionOrdinal < (state.lastFinalizedSession?.ordinal ?? 0))
    throw new Error("Teacher event requires ordered replay");
  if (event.kind === "group-move") return state;
  return Object.freeze({
    ...state,
    displayed: event.placement,
    pendingStreak: 0,
    manualOverride: Object.freeze({
      eventId: event.id,
      afterSessionOrdinal: event.afterSessionOrdinal,
    }),
  });
}

export function applyOralPlacement(
  input: PlacementState,
  result: {
    id: string;
    afterSessionOrdinal: number;
    computed: ComputedLevel;
    displayed: ComputedLevel;
  },
) {
  const state = readState(input);
  if (result.afterSessionOrdinal < (state.lastFinalizedSession?.ordinal ?? 0))
    throw new Error("Oral placement requires ordered replay");
  return Object.freeze({
    ...state,
    computed: placementValue(result.computed),
    displayed: placementValue(result.displayed),
    pendingStreak: 0 as const,
    manualOverride: Object.freeze({
      eventId: randomId(result.id),
      afterSessionOrdinal: integer(result.afterSessionOrdinal),
    }),
  });
}
