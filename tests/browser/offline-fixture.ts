import Dexie from "dexie";
import {
  storageHealth,
  teacherUpdateSafe,
} from "../../src/local/storage-health";
import { readLocalAccess } from "../../src/local/access";
import { localDatabaseName } from "../../src/local/scope";
import { openDataDatabase } from "../../src/local/data-database";
import { createAssessmentRepository } from "../../src/local/assessments";
import { syncFixture } from "../fixtures/sync";
import { responseEvent } from "../../src/contracts/assessment";
import { createStudentRepository } from "../../src/local/db";
import { activateWaitingUpdate } from "../../src/offline/update-safety";
async function scope() {
  const grant = await readLocalAccess();
  if (!grant) throw new Error("No local grant");
  return { ownerId: grant.id, mode: "demo" as const };
}
async function health() {
  return storageHealth(await scope());
}
async function evict() {
  const local = await scope();
  await storageHealth(local);
  await Dexie.delete(localDatabaseName("pn-data", local));
  return storageHealth(local);
}
async function migration() {
  const local = { ownerId: crypto.randomUUID(), mode: "demo" as const },
    fixture = syncFixture();
  const old = new Dexie(localDatabaseName("pn-data", local));
  old
    .version(1)
    .stores({ students: "&id,classId,&[classId+attendanceNumber]" });
  old.version(2).stores({
    sessions: "&id,classroom.id",
    responses: "&id,sessionId",
    events: "&eventId,sessionId",
    outbox: "&eventId,sessionId",
  });
  const event = responseEvent(fixture.parent, fixture.cards[0]);
  await old.table("students").put({ schemaVersion: 1, ...fixture.students[0] });
  await old.table("sessions").put(fixture.parent);
  await old.table("responses").put(fixture.cards[0]);
  await old.table("outbox").put(event);
  old.close();
  const db = openDataDatabase(local);
  await db.open();
  const answers = createAssessmentRepository(local),
    students = createStudentRepository(local);
  try {
    return {
      version: db.verno,
      student:
        (await students.read(fixture.students[0].id))?.id ===
        fixture.students[0].id,
      cards: (await answers.read(fixture.parent.id)).cards.length,
      outbox: await db.table("outbox").count(),
      stores: db.tables.map((t) => t.name),
    };
  } finally {
    answers.close();
    students.close();
    db.close();
  }
}
async function quota(sessionId: string) {
  const repo = createAssessmentRepository(await scope()),
    original = IDBObjectStore.prototype.put;
  const before = await repo.counts(sessionId),
    previous = await repo.read(sessionId);
  let failed = false;
  IDBObjectStore.prototype.put = function (
    ...args: Parameters<IDBObjectStore["put"]>
  ) {
    if (this.name === "responses")
      throw new DOMException("PRIVATE_CANARY", "QuotaExceededError");
    return original.apply(this, args);
  };
  try {
    await repo.save(sessionId, {
      studentId: previous.cards[0].studentId,
      expectedRevision: previous.cards[0].graded.revision,
      choices: previous.cards[0].choices.map(() => "?"),
      source: "manual",
    });
  } catch {
    failed = true;
  } finally {
    IDBObjectStore.prototype.put = original;
  }
  try {
    return {
      failed,
      before,
      after: await repo.counts(sessionId),
      unchanged:
        JSON.stringify((await repo.read(sessionId)).cards) ===
        JSON.stringify(previous.cards),
    };
  } finally {
    repo.close();
  }
}
declare global {
  interface Window {
    __offlineFixture: {
      health: typeof health;
      evict: typeof evict;
      migration: typeof migration;
      quota: typeof quota;
      safe: typeof teacherUpdateSafe;
      update: typeof activateWaitingUpdate;
    };
  }
}
window.__offlineFixture = {
  health,
  evict,
  migration,
  quota,
  safe: teacherUpdateSafe,
  update: activateWaitingUpdate,
};
