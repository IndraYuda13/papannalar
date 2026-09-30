"use client";
import type { Table } from "dexie";
import { turnRecordSchema, type TurnRecord } from "../contracts/turns";
import { parseBoundary, randomIdSchema } from "../contracts/domain";
import { openDataDatabase } from "./data-database";
import { localOperation, type LocalScope } from "./scope";
export function createTurnRepository(scope: LocalScope) {
  const db = openDataDatabase(scope),
    rows: Table<TurnRecord, string> = db.table("turns");
  return {
    read: (classId: string, semester: string) =>
      localOperation(async () => {
        parseBoundary(randomIdSchema, classId);
        const id = `${classId}:${semester}`,
          row = await rows.get(id);
        return parseBoundary(
          turnRecordSchema,
          row ?? {
            id,
            classId,
            semester,
            revision: 0,
            events: [],
            navigatorFirst: [],
          },
        );
      }),
    save: (input: TurnRecord, expectedRevision: number) =>
      localOperation(() =>
        db.transaction("rw", rows, async () => {
          const value = parseBoundary(turnRecordSchema, input),
            old = await rows.get(value.id);
          if (
            value.id !== `${value.classId}:${value.semester}` ||
            (old?.revision ?? 0) !== expectedRevision ||
            value.revision !== expectedRevision + 1
          )
            throw new Error("Turn revision conflict");
          if (
            old &&
            JSON.stringify(value.events.slice(0, old.events.length)) !==
              JSON.stringify(old.events)
          )
            throw new Error("Turn history immutable");
          await rows.put(value);
        }),
      ),
    close: () => db.close(),
  };
}
