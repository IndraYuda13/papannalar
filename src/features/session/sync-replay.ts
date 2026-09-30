import { sessionSyncSchema, type SessionSync } from "../../contracts/sync";
import { fromSyncPackage } from "../../contracts/sync-package";
import {
  parseAssessmentContext,
  parseSavedCard,
} from "../../contracts/assessment";
import { exitContext } from "../../contracts/exit";
import { createExitPlan } from "../../core/assessment/exit";
import { gradeCard } from "../../core/assessment/card-response";
import type { ClassDto } from "../../contracts/classes";
import { packageSession, deriveTimeline } from "./package-session";
import { fromSyncOral } from "../../contracts/sync-history";

/** Same deterministic engine at server finalization and local restoration. */
export function hydrateSyncSession(raw: SessionSync, classroom: ClassDto) {
  const data = sessionSyncSchema.parse(raw),
    c = data.cycle;
  if (
    c.classId !== classroom.id ||
    c.packageId !== data.package.id ||
    data.package.classId !== c.classId
  )
    throw new Error("Invalid sync parent");
  if (
    new Set(data.cards.map((x) => `${x.sessionId}/${x.studentId}`)).size !==
    data.cards.length
  )
    throw new Error("Duplicate response");
  const pkg = fromSyncPackage(data.package);
  const draft = packageSession({
    id: c.id,
    classroom: { ...classroom, grade: pkg.grade },
    students: data.roster,
    package: pkg,
    ordinal: c.ordinal,
  });
  const parent = parseAssessmentContext({
    ...draft,
    session: { ...draft.session, finalized: c.assessmentRevision > 0 },
  });
  const plan = data.exitId
    ? createExitPlan({
        id: data.exitId,
        sessionId: c.id,
        package: pkg,
        groups: c.groups,
      })
    : undefined;
  const contexts = [parent, ...(plan ? [exitContext(plan, parent)] : [])];
  if (data.cards.some((x) => !contexts.some((y) => y.id === x.sessionId)))
    throw new Error("Unknown assessment");
  for (const group of c.groups)
    for (const member of group.members)
      if (
        !data.roster.some(
          (s) =>
            s.id === member.studentId &&
            s.attendanceNumber === member.attendanceNumber,
        )
      )
        throw new Error("Unknown group member");
  if (c.absentStudentIds.some((id) => !data.roster.some((s) => s.id === id)))
    throw new Error("Unknown absent student");
  const bundles = contexts.map((context) => ({
    context,
    cards: data.cards
      .filter((x) => x.sessionId === context.id)
      .map((card) => {
        const binding = context.bindings.find(
          (b) => b.studentId === card.studentId,
        );
        if (!binding) throw new Error("Unbound response");
        const keys =
          context.keysByStudent?.find((k) => k.studentId === card.studentId)
            ?.keys ?? context.keys;
        return parseSavedCard(context, {
          id: `${context.id}/${card.studentId}`,
          sessionId: context.id,
          studentId: card.studentId,
          choices: card.choices,
          graded: gradeCard(
            binding,
            keys,
            card.choices,
            card.revision,
            card.source,
          ),
        });
      }),
  }));
  const oralRuns = (data.oral ?? []).map((r) => fromSyncOral(r, classroom.id));
  for (const run of oralRuns)
    if (
      !data.roster.some(
        (s) =>
          s.id === run.studentId && s.attendanceNumber === run.attendanceNumber,
      ) ||
      run.afterSessionOrdinal > c.ordinal ||
      (run.afterSessionOrdinal === c.ordinal && !c.assessmentRevision)
    )
      throw new Error("Oral parent mismatch");
  for (const ledger of data.turns ?? [])
    for (const event of ledger.events)
      if (
        event.sessionId !== c.id ||
        [
          ...event.pilots,
          ...event.navigators,
          ...event.teams.flat(),
          ...ledger.navigatorFirst,
        ].some((id) => !data.roster.some((s) => s.id === id))
      )
        throw new Error("Turn parent mismatch");
  return {
    cycle: c,
    package: pkg,
    plan,
    bundles,
    oralRuns,
    turns: data.turns ?? [],
  };
}
export function replaySyncHistory(
  history: readonly SessionSync[],
  classroom: ClassDto,
) {
  const ordered = [...history].sort(
    (a, b) => a.cycle.ordinal - b.cycle.ordinal,
  );
  if (new Set(ordered.map((x) => x.cycle.ordinal)).size !== ordered.length)
    throw new Error("Duplicate ordinal");
  const sessions = ordered.map((x) => hydrateSyncSession(x, classroom));
  const latest = sessions.at(-1);
  return latest
    ? deriveTimeline(
        sessions.flatMap((x) => x.bundles),
        latest.bundles[0].context,
        latest.cycle,
        sessions.flatMap((s) => s.oralRuns),
      )
    : undefined;
}
