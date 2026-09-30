import { z } from "zod";
import { randomIdSchema } from "./domain";
import { sessionSyncSchema, type SessionSync } from "./sync";
export const takeoverSchema = z.strictObject({
  classId: randomIdSchema,
  sessionId: randomIdSchema,
  deviceId: randomIdSchema,
  baseRevision: z.number().int().positive(),
  expectedEpoch: z.number().int().positive(),
});

export function reviewSyncConflict(local: SessionSync, canonical: SessionSync) {
  if (
    local.cycle.id !== canonical.cycle.id ||
    local.cycle.classId !== canonical.cycle.classId
  )
    throw new Error("Wrong session");
  const compatible =
    JSON.stringify(local.package) === JSON.stringify(canonical.package) &&
    JSON.stringify(local.roster) === JSON.stringify(canonical.roster) &&
    (!canonical.exitId || !local.exitId || canonical.exitId === local.exitId) &&
    (!canonical.cycle.groups.length ||
      !local.cycle.groups.length ||
      JSON.stringify(canonical.cycle.groups) ===
        JSON.stringify(local.cycle.groups)) &&
    (local.oral ?? []).every((r) => {
      const old = canonical.oral?.find((o) => o.id === r.id);
      return (
        !old ||
        [
          "studentId",
          "target",
          "start",
          "seed",
          "afterSessionOrdinal",
          "sequence",
        ].every((k) => r[k as keyof typeof r] === old[k as keyof typeof old])
      );
    }) &&
    (local.turns ?? []).every((t) =>
      t.events.every((e) => {
        const old = canonical.turns
          ?.flatMap((t) => t.events)
          .find((o) => o.id === e.id);
        return !old || JSON.stringify(e) === JSON.stringify(old);
      }),
    );
  const changes = local.cards.flatMap((card) => {
    const previous = canonical.cards.find(
      (c) => c.studentId === card.studentId && c.sessionId === card.sessionId,
    );
    return previous &&
      JSON.stringify(previous.choices) === JSON.stringify(card.choices)
      ? []
      : [
          {
            studentId: card.studentId,
            attendanceNumber: local.roster.find((s) => s.id === card.studentId)!
              .attendanceNumber,
            assessmentId: card.sessionId,
            serverChoices: previous?.choices ?? null,
            localChoices: card.choices,
          },
        ];
  });
  const oralChanges = (local.oral ?? []).flatMap((run) => {
    const previous = canonical.oral?.find((r) => r.id === run.id);
    return previous &&
      JSON.stringify(previous.answers) === JSON.stringify(run.answers) &&
      previous.skipped === run.skipped
      ? []
      : [
          {
            attendanceNumber: run.attendanceNumber,
            id: run.id,
            serverAnswers: previous?.answers.map((a) => a.result) ?? null,
            localAnswers: run.answers.map((a) => a.result),
            skipped: run.skipped,
          },
        ];
  });
  const turnChanges = (local.turns ?? [])
    .flatMap((t) => t.events)
    .filter(
      (e) =>
        !(canonical.turns ?? [])
          .flatMap((t) => t.events)
          .some((old) => old.id === e.id),
    ).length;
  return { compatible, changes, oralChanges, turnChanges };
}
/** Called only after an explicit teacher choice. Keep other server cards intact. */
export function chooseLocalResponses(
  local: SessionSync,
  canonical: SessionSync,
): SessionSync {
  const review = reviewSyncConflict(local, canonical);
  if (!review.compatible)
    throw new Error(
      "Frozen session differs; keep server or retain local archive",
    );
  const cards = canonical.cards.map((c) => ({ ...c, choices: [...c.choices] }));
  for (const card of local.cards) {
    const index = cards.findIndex(
      (c) => c.studentId === card.studentId && c.sessionId === card.sessionId,
    );
    if (
      index >= 0 &&
      JSON.stringify(cards[index].choices) === JSON.stringify(card.choices)
    )
      continue;
    const next = {
      sessionId: card.sessionId,
      studentId: card.studentId,
      choices: [...card.choices],
      source: card.source,
      revision: index < 0 ? 1 : cards[index].revision + 1,
    };
    if (index < 0) cards.push(next);
    else cards[index] = next;
  }
  const groups = canonical.cycle.groups.length
    ? canonical.cycle.groups
    : local.cycle.groups;
  const assessmentRevision = Math.max(
    local.cycle.assessmentRevision,
    canonical.cycle.assessmentRevision,
  );
  const oral = [...(canonical.oral ?? [])];
  for (const run of local.oral ?? []) {
    const index = oral.findIndex((r) => r.id === run.id);
    if (index < 0) oral.push(run);
    else if (
      JSON.stringify(oral[index].answers) !== JSON.stringify(run.answers) ||
      oral[index].skipped !== run.skipped
    )
      oral[index] = { ...run, revision: oral[index].revision + 1 };
  }
  const turns = [...(canonical.turns ?? [])];
  for (const ledger of local.turns ?? []) {
    const index = turns.findIndex((t) => t.semester === ledger.semester);
    if (index < 0) turns.push(ledger);
    else
      turns[index] = {
        semester: ledger.semester,
        navigatorFirst: ledger.navigatorFirst,
        events: [
          ...turns[index].events,
          ...ledger.events.filter(
            (e) => !turns[index].events.some((old) => old.id === e.id),
          ),
        ],
      };
  }
  return sessionSyncSchema.parse({
    engineVersion: 1,
    package: canonical.package,
    roster: canonical.roster,
    cycle: {
      ...canonical.cycle,
      revision: Math.max(local.cycle.revision, canonical.cycle.revision) + 1,
      groups,
      absentStudentIds: canonical.cycle.groups.length
        ? canonical.cycle.absentStudentIds
        : local.cycle.absentStudentIds,
      classEnded: canonical.cycle.classEnded || local.cycle.classEnded,
      assessmentRevision:
        assessmentRevision &&
        (review.changes.length || review.oralChanges.length)
          ? assessmentRevision + 1
          : assessmentRevision,
    },
    exitId: canonical.exitId ?? local.exitId,
    cards,
    ...(oral.length ? { oral } : {}),
    ...(turns.length ? { turns } : {}),
  });
}
