import Dexie from "dexie";
import {
  createDemoContext,
  deriveSession,
} from "../../src/features/session/demo-session";
import { createAssessmentRepository } from "../../src/local/assessments";
import { createStudentRepository } from "../../src/local/db";
import { openDataDatabase } from "../../src/local/data-database";
import { localDatabaseName } from "../../src/local/scope";
import { demoGroupRoster } from "../../src/content/demo/class-7b";
import { demoAnswers } from "../../src/content/demo/weekly";
import { readLocalAccess } from "../../src/local/access";

const api = {
  async inspect() {
    const grant = await readLocalAccess();
    if (!grant) throw new Error("No local teacher grant");
    const repo = createAssessmentRepository({
      ownerId: grant.id,
      mode: "demo",
    });
    try {
      const contexts = await repo.list(),
        ctx = contexts.at(-1);
      if (!ctx) throw new Error("No demo session");
      const saved = await repo.read(ctx.id),
        derived = deriveSession(ctx, saved.cards);
      return {
        sessionId: ctx.id,
        received: saved.cards.length,
        reserved: [7, 12, 25].map((n) => ({
          attendance: n,
          received: saved.cards.some(
            (c) =>
              c.studentId ===
              ctx.roster.find((s) => s.attendanceNumber === n)?.id,
          ),
        })),
        counts: await repo.counts(ctx.id),
        observations: derived.placements.reduce(
          (sum, p) => sum + p.observations,
          0,
        ),
        groups: derived.grouping.groups.map((g) => ({
          label: g.label,
          attendance: g.members.map((s) => s.attendanceNumber),
        })),
        distractorCount: saved.cards.filter(
          (c) =>
            ctx.roster.find((s) => s.id === c.studentId)!.attendanceNumber <=
              7 && c.choices[2] === "B",
        ).length,
      };
    } finally {
      repo.close();
    }
  },
  async exercise() {
    const scope = { ownerId: crypto.randomUUID(), mode: "demo" as const };
    const classroom = {
      id: crypto.randomUUID(),
      label: "7B",
      grade: 7,
      count: 32,
      revision: 1,
      mode: "demo" as const,
    };
    const students = demoGroupRoster().map((s) => ({
      schemaVersion: 1 as const,
      id: s.studentId,
      classId: classroom.id,
      attendanceNumber: s.attendanceNumber,
      active: true,
    }));
    const legacy = new Dexie(localDatabaseName("pn-data", scope));
    legacy
      .version(1)
      .stores({ students: "&id, classId, &[classId+attendanceNumber]" });
    await legacy.table("students").put(students[0]);
    legacy.close();
    const refs = createStudentRepository(scope),
      migrated = await refs.read(students[0].id);
    refs.close();
    let repo = createAssessmentRepository(scope);
    const empty = await repo.list();
    const ctx = createDemoContext(classroom, students, () =>
      crypto.randomUUID(),
    );
    await repo.create(ctx);
    const studentId = students[0].id;
    const input = {
      studentId,
      choices: [...demoAnswers(1)],
      expectedRevision: 0,
      source: "demo" as const,
    };
    const first = await repo.save(ctx.id, input);
    const duplicate = await repo.save(ctx.id, input);
    const correction = await repo.save(ctx.id, {
      ...input,
      expectedRevision: 1,
      source: "manual",
    });
    const conflict = await repo.save(ctx.id, {
      ...input,
      expectedRevision: 1,
      source: "manual",
    });
    const before = await repo.counts(ctx.id);
    repo.close();
    repo = createAssessmentRepository(scope);
    const persisted = await repo.read(ctx.id);
    // Force an event uniqueness failure after response.put to prove transaction rollback.
    const db = openDataDatabase(scope),
      eventId = `${ctx.id}/${studentId}/3`;
    await db.table("outbox").add({ eventId, sessionId: ctx.id });
    let rolledBack = false;
    try {
      await repo.save(ctx.id, { ...input, expectedRevision: 2 });
    } catch {
      rolledBack = true;
    }
    const after = await repo.read(ctx.id);
    await db.table("outbox").delete(eventId);
    const counts = await repo.counts(ctx.id);
    const event = await db.table("events").toArray();
    const replay = deriveSession(ctx, after.cards);
    await repo.remove(ctx.id);
    const removed = await repo.list();
    repo.close();
    db.close();
    await Dexie.delete(localDatabaseName("pn-data", scope));
    return {
      migrated: migrated?.id === studentId,
      empty: empty.length,
      first: first.status,
      duplicate: duplicate.status,
      correction: correction.status,
      conflict: conflict.status,
      before,
      persisted: persisted.cards[0].graded.revision,
      rolledBack,
      after: after.cards[0].graded.revision,
      counts,
      observations: replay.placements[0].observations,
      eventKeys: Object.keys(event[0]),
      removed: removed.length,
    };
  },
};
declare global {
  interface Window {
    __assessmentFixture: typeof api;
  }
}
window.__assessmentFixture = api;
