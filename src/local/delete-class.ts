"use client";
import { openDataDatabase } from "./data-database";
import { localOperation, type LocalScope } from "./scope";
import { randomIdSchema } from "../contracts/domain";
/** Call only after the server confirms its class tombstone. Names use a separate teacher repository. */
export async function purgeDeletedClass(scope: LocalScope, classId: string) {
  randomIdSchema.parse(classId);
  const db = openDataDatabase(scope);
  try {
    await localOperation(() =>
      db.transaction("rw", db.tables, async () => {
        const contexts = await db
          .table("sessions")
          .where("classroom.id")
          .equals(classId)
          .toArray();
        for (const context of contexts) {
          await db
            .table("responses")
            .where("sessionId")
            .equals(context.id)
            .delete();
          await db
            .table("events")
            .where("sessionId")
            .equals(context.id)
            .delete();
          await db
            .table("outbox")
            .where("sessionId")
            .equals(context.id)
            .delete();
          await db.table("rotations").delete(context.id);
          await db.table("syncMeta").delete(context.id);
        }
        await db
          .table("sessions")
          .where("classroom.id")
          .equals(classId)
          .delete();
        for (const store of [
          "students",
          "packages",
          "oralRuns",
          "turns",
          "exits",
          "cycles",
          "syncQueue",
          "syncArchives",
        ])
          await db.table(store).where("classId").equals(classId).delete();
        // Pointer records contain only IDs; remove any pointer targeting this class.
        for (const record of await db.table("localMeta").toArray())
          if (String(record.key).includes(classId))
            await db.table("localMeta").delete(record.key);
      }),
    );
  } finally {
    db.close();
  }
}
