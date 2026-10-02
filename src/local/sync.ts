"use client";
import type { Table } from "dexie";
import { openDataDatabase } from "./data-database";
import { localOperation, type LocalScope } from "./scope";
import {
  parseAssessmentContext,
  parseSavedCard,
} from "../contracts/assessment";
import { parseCycle } from "../contracts/cycle";
import { parseTeacherPackage } from "../contracts/package";
import {
  syncMutationSchema,
  toSessionSync,
  type SyncAck,
  type SyncMutation,
  type SessionSync,
  type SyncRecord,
} from "../contracts/sync";
import type { ClassDto } from "../contracts/classes";
import { hydrateSyncSession } from "../features/session/sync-replay";
import { chooseLocalResponses } from "../contracts/sync-conflict";
import { parseOralRun } from "../contracts/oral";
import { turnRecordSchema } from "../contracts/turns";
import {
  retryDelay,
  syncFailure,
  type SyncFailure,
} from "../core/session/sync-policy";
export type SyncQueueEntry = {
  eventId: string;
  sessionId: string;
  classId: string;
  clientSequence: number;
  mutation: SyncMutation;
  covered: string[];
  attempts: number;
  nextAttempt: number;
  state: "pending" | SyncFailure;
  lastStatus?: number;
};
type Meta = {
  key: string;
  revision?: number;
  writerEpoch?: number;
  payload?: SessionSync;
  deviceId?: string;
  sequence?: number;
};
export function createSyncRepository(scope: LocalScope) {
  const db = openDataDatabase(scope),
    queue: Table<SyncQueueEntry, string> = db.table("syncQueue"),
    meta: Table<Meta, string> = db.table("syncMeta");
  async function snapshot(id: string) {
    const cycle = parseCycle(await db.table("cycles").get(id));
    const contexts = (
      await db
        .table("sessions")
        .where("classroom.id")
        .equals(cycle.classId)
        .toArray()
    )
      .map(parseAssessmentContext)
      .filter((c) => c.session.sessionId === id);
    const bundles = await Promise.all(
      contexts.map(async (context) => ({
        context,
        cards: (
          await db
            .table("responses")
            .where("sessionId")
            .equals(context.id)
            .toArray()
        ).map((c) => parseSavedCard(context, c)),
      })),
    );
    const oralRuns = (
      await db
        .table("oralRuns")
        .where("classId")
        .equals(cycle.classId)
        .toArray()
    )
      .map(parseOralRun)
      .filter(
        (r) =>
          r.afterSessionOrdinal === cycle.ordinal - 1 ||
          (cycle.assessmentRevision > 0 &&
            r.afterSessionOrdinal === cycle.ordinal),
      );
    const turns = (
      await db.table("turns").where("classId").equals(cycle.classId).toArray()
    )
      .map((r) => turnRecordSchema.parse(r))
      .filter((r) => r.events.some((e) => e.sessionId === cycle.id));
    return toSessionSync({
      cycle,
      package: parseTeacherPackage(
        await db.table("packages").get(cycle.packageId),
      ),
      bundles,
      oralRuns,
      turns,
    });
  }
  return {
    snapshot: (id: string) =>
      localOperation(() => db.transaction("r", db.tables, () => snapshot(id))),
    device: () =>
      localOperation(() =>
        db.transaction("rw", meta, async () => {
          const device = await meta.get("device");
          if (device?.deviceId) return device.deviceId;
          const id = crypto.randomUUID();
          await meta.put({ key: "device", deviceId: id, sequence: 0 });
          return id;
        }),
      ),
    restore: (
      record: SyncRecord,
      classroom: ClassDto,
      reviewed?: { payload: SessionSync; choice: "server" | "local" },
    ) =>
      localOperation(() =>
        db.transaction("rw", db.tables, async () => {
          if (
            classroom.mode !== scope.mode ||
            record.payload.cycle.classId !== classroom.id
          )
            throw new Error("Wrong namespace");
          const existing = await db.table("cycles").get(record.sessionId);
          if (existing) {
            const current = await snapshot(record.sessionId);
            const previous = await meta.get(record.sessionId);
            if (
              reviewed
                ? JSON.stringify(current) !== JSON.stringify(reviewed.payload)
                : JSON.stringify(current) !== JSON.stringify(previous?.payload)
            )
              throw new Error("Local answers changed; review again");
            if (JSON.stringify(current) !== JSON.stringify(record.payload))
              await db.table("syncArchives").add({
                id: crypto.randomUUID(),
                classId: classroom.id,
                sessionId: record.sessionId,
                payload: current,
              });
          }
          const value =
            reviewed?.choice === "local"
              ? chooseLocalResponses(reviewed.payload, record.payload)
              : record.payload;
          const restored = hydrateSyncSession(value, classroom);
          const contexts = (
            await db
              .table("sessions")
              .where("classroom.id")
              .equals(classroom.id)
              .toArray()
          )
            .map(parseAssessmentContext)
            .filter((c) => c.session.sessionId === record.sessionId);
          for (const c of contexts) {
            await db
              .table("responses")
              .where("sessionId")
              .equals(c.id)
              .delete();
            await db.table("sessions").delete(c.id);
          }
          await db
            .table("exits")
            .where("sessionId")
            .equals(record.sessionId)
            .delete();
          await db
            .table("events")
            .where("sessionId")
            .equals(record.sessionId)
            .delete();
          await db
            .table("outbox")
            .where("sessionId")
            .equals(record.sessionId)
            .delete();
          await queue.where("sessionId").equals(record.sessionId).delete();
          await db.table("cycles").put(restored.cycle);
          await db.table("packages").put(restored.package);
          if (restored.plan) await db.table("exits").put(restored.plan);
          for (const bundle of restored.bundles) {
            await db.table("sessions").put(bundle.context);
            await db.table("responses").bulkPut([...bundle.cards]);
          }
          for (const run of restored.oralRuns) {
            const previous = await db.table("oralRuns").get(run.id);
            if (!previous || previous.revision <= run.revision) {
              await db.table("oralRuns").put(run);
              await db
                .table("localMeta")
                .put({ key: `oral:student:${run.studentId}`, value: run.id });
              await db
                .table("localMeta")
                .put({ key: `oral:class:${run.classId}`, value: run.id });
            }
          }
          for (const ledger of restored.turns) {
            const id = `${classroom.id}:${ledger.semester}`,
              previous = await db.table("turns").get(id);
            const old = previous ? turnRecordSchema.parse(previous) : undefined;
            await db.table("turns").put(
              turnRecordSchema.parse({
                id,
                classId: classroom.id,
                semester: ledger.semester,
                revision: (old?.revision ?? 0) + 1,
                navigatorFirst: ledger.navigatorFirst,
                events: [
                  ...(old?.events.filter(
                    (e) => e.sessionId !== record.sessionId,
                  ) ?? []),
                  ...ledger.events,
                ],
              }),
            );
          }
          await meta.put({
            key: record.sessionId,
            revision: record.revision,
            writerEpoch: record.writerEpoch,
            deviceId: record.deviceId,
            payload: record.payload,
          });
          return restored;
        }),
      ),
    prepare: () =>
      localOperation(() =>
        db.transaction("rw", db.tables, async () => {
          const cycles = (await db.table("cycles").toArray())
            .map(parseCycle)
            .sort((a, b) => a.ordinal - b.ordinal);
          const device = (await meta.get("device")) ?? {
            key: "device",
            deviceId: crypto.randomUUID(),
            sequence: 0,
          };
          for (const cycle of cycles) {
            if (await queue.where("sessionId").equals(cycle.id).count())
              continue;
            const parent = parseAssessmentContext(
              await db.table("sessions").get(cycle.id),
            );
            if (parent.classroom.mode !== scope.mode)
              throw new Error("Wrong namespace");
            const payload = await snapshot(cycle.id);
            const previous = await meta.get(cycle.id);
            if (JSON.stringify(previous?.payload) === JSON.stringify(payload))
              continue;
            const clientSequence = (device.sequence ?? 0) + 1;
            device.sequence = clientSequence;
            const mutation = syncMutationSchema.parse({
              schemaVersion: 1,
              eventId: crypto.randomUUID(),
              deviceId: device.deviceId,
              clientSequence,
              classId: cycle.classId,
              sessionId: cycle.id,
              baseRevision: previous?.revision ?? 0,
              writerEpoch: previous?.writerEpoch ?? 1,
              operation: "session-save",
              payload,
            });
            if (
              new TextEncoder().encode(
                JSON.stringify({ mutations: [mutation] }),
              ).length > 262144
            )
              throw new Error("Sync group too large");
            const covered = (
              await db
                .table("outbox")
                .where("sessionId")
                .equals(cycle.id)
                .toArray()
            ).map((e: { eventId: string }) => e.eventId);
            await queue.add({
              eventId: mutation.eventId,
              sessionId: cycle.id,
              classId: cycle.classId,
              clientSequence,
              mutation,
              covered,
              attempts: 0,
              nextAttempt: 0,
              state: "pending",
            });
          }
          await meta.put(device);
        }),
      ),
    list: () =>
      localOperation(async () =>
        (await queue.orderBy("clientSequence").toArray()).sort(
          (a, b) =>
            a.classId.localeCompare(b.classId) ||
            (a.mutation.payload?.cycle.ordinal ?? 0) -
              (b.mutation.payload?.cycle.ordinal ?? 0) ||
            a.clientSequence - b.clientSequence,
        ),
      ),
    parentsReady: (classId: string, ordinal: number) =>
      localOperation(async () => {
        if (ordinal <= 1) return true;
        const parents = (
          await db.table("cycles").where("classId").equals(classId).toArray()
        )
          .map(parseCycle)
          .filter((c) => c.ordinal < ordinal);
        if (!parents.some((c) => c.ordinal === ordinal - 1)) return false;
        for (const parent of parents)
          if (!(await meta.get(parent.id))?.payload?.cycle.assessmentRevision)
            return false;
        return true;
      }),
    acknowledge: (ack: SyncAck) =>
      localOperation(() =>
        db.transaction("rw", queue, meta, db.table("outbox"), async () => {
          const entry = await queue.get(ack.eventId);
          if (!entry) return;
          if (ack.status !== "accepted") {
            await queue.put({
              ...entry,
              state: ack.status === "conflict" ? "review" : "invalid",
            });
            return;
          }
          await meta.put({
            key: entry.sessionId,
            revision: ack.revision,
            writerEpoch: entry.mutation.writerEpoch,
            deviceId: entry.mutation.deviceId,
            ...(entry.mutation.payload
              ? { payload: entry.mutation.payload }
              : {}),
          });
          await db.table("outbox").bulkDelete(entry.covered);
          await queue.delete(entry.eventId);
        }),
      ),
    failed: (eventId: string, status: number, retryAfterSeconds = 0) =>
      localOperation(() =>
        db.transaction("rw", queue, async () => {
          const entry = await queue.get(eventId);
          if (!entry) return;
          const state = syncFailure(status);
          await queue.put({
            ...entry,
            state,
            lastStatus: status,
            attempts: entry.attempts + 1,
            nextAttempt:
              state === "retry"
                ? Date.now() +
                  retryDelay(entry.attempts, Math.random(), retryAfterSeconds)
                : 0,
          });
        }),
      ),
    resume: () =>
      localOperation(() =>
        db.transaction("rw", queue, async () => {
          for (const entry of await queue.toArray())
            if (entry.state === "retry" || entry.state === "login")
              await queue.put({
                ...entry,
                state: "pending",
                attempts: 0,
                nextAttempt: entry.lastStatus === 429 ? entry.nextAttempt : 0,
              });
        }),
      ),
    close: () => db.close(),
  };
}
