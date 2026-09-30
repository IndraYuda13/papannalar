"use client";

import Dexie, { type Table } from "dexie";
import { z } from "zod";
import { parseBoundary, randomIdSchema } from "../contracts/domain";
import { localDatabaseName, localOperation, type LocalScope } from "./scope";

const localStudentNameSchema = z.strictObject({
  schemaVersion: z.literal(1),
  ownerId: randomIdSchema,
  studentId: randomIdSchema,
  displayName: z.string().trim().min(1).max(120),
});
export type LocalStudentName = z.infer<typeof localStudentNameSchema>;

// Construct only on the teacher device, after an owner/mode is known.
// An absent row means no optional name/nickname. Never export this database.
export function createNameRepository(scope: LocalScope) {
  const db = new Dexie(localDatabaseName("pn-names", scope));
  const ownerId = scope.ownerId;
  db.version(1).stores({ names: "&[ownerId+studentId]" });
  const names: Table<LocalStudentName, [string, string]> = db.table("names");
  const key = (studentId: string): [string, string] => [
    ownerId,
    parseBoundary(randomIdSchema, studentId),
  ];

  async function save(studentId: string, displayName?: string) {
    return localOperation(async () => {
      const identityKey = key(studentId);
      if (!displayName?.trim()) {
        await names.delete(identityKey);
        return;
      }
      const record = parseBoundary(localStudentNameSchema, {
        schemaVersion: 1,
        ownerId,
        studentId,
        displayName,
      });
      await names.put(record);
    });
  }

  return {
    save,
    saveMany: (input: readonly { studentId: string; displayName?: string }[]) =>
      localOperation(async () => {
        if (
          input.length > 40 ||
          new Set(input.map((row) => row.studentId)).size !== input.length
        )
          throw new Error("Invalid local identity batch");
        const records = input.map((row) => ({
          key: key(row.studentId),
          value: row.displayName?.trim()
            ? parseBoundary(localStudentNameSchema, {
                schemaVersion: 1,
                ownerId,
                studentId: row.studentId,
                displayName: row.displayName,
              })
            : null,
        }));
        await db.transaction("rw", names, async () => {
          for (const record of records) {
            if (record.value) await names.put(record.value);
            else await names.delete(record.key);
          }
        });
      }),
    read: (studentId: string) =>
      localOperation(async () => {
        const row = await names.get(key(studentId));
        return row ? parseBoundary(localStudentNameSchema, row) : undefined;
      }),
    readAll: () =>
      localOperation(async () =>
        (await names.toArray()).map((row) =>
          parseBoundary(localStudentNameSchema, row),
        ),
      ),
    update: (studentId: string, displayName?: string) =>
      localOperation(() =>
        db.transaction("rw", names, async () => {
          if (!(await names.get(key(studentId)))) return false;
          await save(studentId, displayName);
          return true;
        }),
      ),
    delete: (studentId: string) =>
      localOperation(() => names.delete(key(studentId))),
    clear: () => localOperation(() => names.clear()),
    close: () => db.close(),
  };
}
export type NameRepository = ReturnType<typeof createNameRepository>;
