import { parseStepId, type StepId } from "../../content/ladder/registry";
import {
  bindingKey,
  canonicalBindings,
  compareIdentity,
  type AssessmentBinding,
} from "../assessment/binding";
import {
  bindObservations,
  canonicalRevisions,
  type AssessmentRevision,
  type ObservationRevision,
} from "../assessment/revisions";
import { observeBkt } from "../bkt/observations";
import {
  copyMastery,
  flag,
  integer,
  placementValue,
  randomId,
  strictRecord,
} from "../validation";
import { computeLevel, type Mastery } from "./computed-level";
import { initialPlacement, type BelowRange } from "./initial";
import {
  anchorInitialPlacement,
  applySessionPlacement,
  applyTeacherPlacementEvent,
  createPlacementState,
  applyOralPlacement,
  type DisplayedPlacement,
  type PlacementState,
} from "./state";
import {
  canonicalTeacherEvents,
  type TeacherPlacementEvent,
} from "./teacher-events";
import { evaluateOral, type OralRun } from "../oral/state";
import { canonicalOralRuns } from "../oral/replay";

// Sessions are canonical snapshots supplied by the persistence adapter. This core
// does not resolve concurrent session edits or implement an outbox/network engine.
export type SessionRecord = Readonly<{
  sessionId: string;
  ordinal: number;
  target: StepId;
  finalized: boolean;
  engineVersion: 1;
  bktConfigVersion: 1;
}>;
export type ReplayBaseline = Readonly<{
  studentId: string;
  target: StepId;
  mastery: Mastery;
  displayed: DisplayedPlacement | null;
}>;
export type PlacementHistory = Readonly<{
  sessions: readonly SessionRecord[];
  bindings: readonly AssessmentBinding[];
  revisions: readonly AssessmentRevision[];
  teacherEvents: readonly TeacherPlacementEvent[];
}>;
type SessionResult = Readonly<{
  sessionId: string;
  ordinal: number;
  appliedObservations: number;
  initialStatus: "not-present" | "pending" | "placed";
  placement: PlacementState;
}>;
export type PlacementReplay = Readonly<{
  studentId: string;
  mastery: Mastery;
  placement: PlacementState;
  belowRange: BelowRange;
  observations: readonly ObservationRevision[];
  sessions: readonly SessionResult[];
  teacherEvents: readonly TeacherPlacementEvent[];
}>;

export function canonicalSessions(
  inputs: readonly SessionRecord[],
): readonly SessionRecord[] {
  const records = new Map<string, SessionRecord>();
  const ordinals = new Map<number, string>();
  for (const input of inputs) {
    const value = strictRecord(input, [
      "sessionId",
      "ordinal",
      "target",
      "finalized",
      "engineVersion",
      "bktConfigVersion",
    ]);
    if (value.engineVersion !== 1 || value.bktConfigVersion !== 1)
      throw new Error("Unsupported placement engine/config version");
    const session: SessionRecord = Object.freeze({
      sessionId: randomId(value.sessionId),
      ordinal: integer(value.ordinal, 1),
      target: parseStepId(value.target),
      finalized: flag(value.finalized),
      engineVersion: 1,
      bktConfigVersion: 1,
    });
    if (
      records.has(session.sessionId) &&
      JSON.stringify(records.get(session.sessionId)) !== JSON.stringify(session)
    )
      throw new Error("Session snapshot conflict");
    if (
      ordinals.has(session.ordinal) &&
      ordinals.get(session.ordinal) !== session.sessionId
    )
      throw new Error("Session ordinal conflict");
    records.set(session.sessionId, session);
    ordinals.set(session.ordinal, session.sessionId);
  }
  return Object.freeze(
    [...records.values()].sort((a, b) => a.ordinal - b.ordinal),
  );
}

// Full replay from the supplied pre-history baseline. No module-level seen set,
// inverse BKT, timestamps, random IDs, I/O or dependency on previous invocations.
// Latest *revision* wins; conflicting payloads at the same revision never do.
export function replayPlacement(
  baseline: ReplayBaseline,
  history: PlacementHistory,
  oralInputs: readonly OralRun[] = [],
): PlacementReplay {
  const base = strictRecord(baseline, [
    "studentId",
    "target",
    "mastery",
    "displayed",
  ]);
  const studentId = randomId(base.studentId);
  const target = parseStepId(base.target);
  let mastery = copyMastery(base.mastery as Mastery);
  let placement = createPlacementState(
    computeLevel(mastery, target),
    base.displayed === null ? null : placementValue(base.displayed),
  );
  let belowRange: BelowRange = Object.freeze({ kind: "none" });
  const value = strictRecord(history, [
    "sessions",
    "bindings",
    "revisions",
    "teacherEvents",
  ]);
  if (
    ![
      value.sessions,
      value.bindings,
      value.revisions,
      value.teacherEvents,
    ].every(Array.isArray)
  )
    throw new TypeError("Invalid placement history collections");
  const sessions = canonicalSessions(
    value.sessions as readonly SessionRecord[],
  );
  const bindings = canonicalBindings(
    value.bindings as readonly AssessmentBinding[],
  );
  const revisions = canonicalRevisions(
    bindings,
    value.revisions as readonly AssessmentRevision[],
  );
  const events = canonicalTeacherEvents(
    value.teacherEvents as readonly TeacherPlacementEvent[],
  );
  const oralRuns = canonicalOralRuns(oralInputs).filter(
    (r) => r.studentId === studentId,
  );
  for (const run of oralRuns)
    if (
      run.afterSessionOrdinal !== 0 &&
      !sessions.some(
        (s) => s.ordinal === run.afterSessionOrdinal && s.finalized,
      )
    )
      throw new Error("Oral history needs a finalized anchor");
  const bySession = new Map(
    sessions.map((session) => [session.sessionId, session]),
  );
  const byRevision = new Map(
    revisions.map((revision) => [bindingKey(revision), revision]),
  );
  for (const binding of bindings) {
    const session = bySession.get(binding.sessionId);
    if (!session || session.target !== binding.target)
      throw new Error("Binding/session snapshot mismatch");
    if (binding.kind === "initial" && session.ordinal !== sessions[0].ordinal)
      throw new Error("Initial placement must anchor the first session");
  }
  for (const event of events) {
    if (
      event.afterSessionOrdinal !== 0 &&
      !sessions.some((session) => session.ordinal === event.afterSessionOrdinal)
    )
      throw new Error("Teacher event has no session anchor");
  }
  const teacherEvents = Object.freeze(
    events.filter((event) => event.studentId === studentId),
  );
  const observations: ObservationRevision[] = [];
  const sessionResults: SessionResult[] = [];

  function applyTeacherEvents(ordinal: number) {
    for (const run of oralRuns.filter(
      (r) => r.afterSessionOrdinal === ordinal,
    )) {
      // Rebase raw oral evidence onto replayed history, never trust a stale mastery checkpoint.
      const result = evaluateOral({ ...run, baseline: mastery });
      if (result.status === "complete" && result.placement) {
        mastery = copyMastery(result.mastery);
        placement = applyOralPlacement(placement, {
          id: run.id,
          afterSessionOrdinal: ordinal,
          computed: computeLevel(mastery, run.target),
          displayed: result.placement,
        });
      }
    }
    for (const event of teacherEvents.filter(
      (event) => event.afterSessionOrdinal === ordinal,
    )) {
      placement = applyTeacherPlacementEvent(placement, event);
    }
  }
  applyTeacherEvents(0);
  for (const session of sessions) {
    const assigned = bindings.filter(
      (binding) =>
        binding.sessionId === session.sessionId &&
        binding.studentId === studentId,
    );
    if (
      assigned.some((binding) => binding.kind === "initial") &&
      assigned.some((binding) => binding.kind === "weekly")
    )
      throw new Error("Initial and weekly checks cannot share a session");
    let initialStatus: SessionResult["initialStatus"] = "not-present";
    const initial = assigned.find((binding) => binding.kind === "initial");
    if (initial) {
      const revision = byRevision.get(bindingKey(initial));
      const result = initialPlacement(
        initial.target,
        revision
          ? revision.responses.map((row) => ({
              rowIndex: row.rowIndex,
              answer: row.result,
            }))
          : [],
      );
      initialStatus = result.status;
      if (result.status === "placed") {
        mastery = result.mastery;
        belowRange = result.belowRange;
        placement = anchorInitialPlacement(placement, result.computed);
      }
    }

    const bound = assigned
      .flatMap((binding) => {
        const revision = byRevision.get(bindingKey(binding));
        return revision
          ? bindObservations(binding, revision, session.ordinal)
          : [];
      })
      .sort(
        (a, b) =>
          a.assessmentOrder - b.assessmentOrder ||
          a.observationOrder - b.observationOrder ||
          compareIdentity(a.id, b.id),
      );
    let appliedObservations = 0;
    for (const observation of bound) {
      const update = observeBkt(
        mastery[observation.stepId],
        observation.outcome,
      );
      if (update.status === "updated") {
        mastery = Object.freeze({
          ...mastery,
          [observation.stepId]: update.probability,
        });
        appliedObservations++;
      }
      observations.push(observation);
    }
    placement = applySessionPlacement(placement, {
      sessionId: session.sessionId,
      ordinal: session.ordinal,
      computed: computeLevel(mastery, session.target),
      eligible: initialStatus === "placed" || appliedObservations > 0,
      initial: initialStatus === "placed",
      finalized: session.finalized,
    });
    sessionResults.push(
      Object.freeze({
        sessionId: session.sessionId,
        ordinal: session.ordinal,
        appliedObservations,
        initialStatus,
        placement,
      }),
    );
    applyTeacherEvents(session.ordinal);
  }
  return Object.freeze({
    studentId,
    mastery,
    placement,
    belowRange,
    observations: Object.freeze(observations),
    sessions: Object.freeze(sessionResults),
    teacherEvents,
  });
}
