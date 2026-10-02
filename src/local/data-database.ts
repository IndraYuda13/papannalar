"use client";
import Dexie from "dexie";
import { localDatabaseName, type LocalScope } from "./scope";
export function openDataDatabase(scope: LocalScope) {
  const db = new Dexie(localDatabaseName("pn-data", scope));
  db.version(1).stores({
    students: "&id, classId, &[classId+attendanceNumber]",
  });
  db.version(2).stores({
    sessions: "&id, classroom.id",
    responses: "&id, sessionId",
    events: "&eventId, sessionId",
    outbox: "&eventId, sessionId",
  });
  db.version(3).stores({ packages: "&id, classId" });
  db.version(4).stores({
    oralRuns: "&id, classId, studentId",
    localMeta: "&key",
  });
  db.version(5).stores({ rotations: "&id" });
  db.version(6).stores({ turns: "&id,classId,semester" });
  db.version(7).stores({ exits: "&id,&sessionId,classId" });
  db.version(8).stores({ cycles: "&id,classId,&[classId+ordinal]" });
  db.version(9).stores({
    syncQueue: "&eventId,&sessionId,clientSequence,classId",
    syncMeta: "&key",
  });
  db.version(10).stores({ syncArchives: "&id,classId,sessionId" });
  db.version(11).stores({ libraryCache: "&key", libraryPending: "&key" });
  db.version(12).stores({ classPresence: "&key" });
  return db;
}
