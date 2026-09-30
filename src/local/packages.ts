"use client";
import type { Table } from "dexie";
import { parseTeacherPackage } from "../contracts/package";
import type { TeacherPackage } from "../core/package/build";
import { parseBoundary, randomIdSchema } from "../contracts/domain";
import { openDataDatabase } from "./data-database";
import { localOperation, type LocalScope } from "./scope";

export function createPackageRepository(scope: LocalScope) {
  const db = openDataDatabase(scope),
    packages: Table<TeacherPackage, string> = db.table("packages");
  const meta: Table<{ key: string; value: string }, string> =
    db.table("localMeta");
  return {
    save: (input: TeacherPackage, expectedRevision: number) =>
      localOperation(() =>
        db.transaction("rw", packages, meta, async () => {
          const value = parseTeacherPackage(input),
            previous = await packages.get(value.id);
          if ((previous?.revision ?? 0) !== expectedRevision)
            throw new Error("Package revision conflict");
          if (
            previous?.frozen &&
            JSON.stringify(previous) !== JSON.stringify(value)
          )
            throw new Error("Frozen package cannot change");
          await packages.put(value);
          await meta.bulkPut([
            { key: "package:last", value: value.id },
            { key: `package:class:${value.classId}`, value: value.id },
          ]);
        }),
      ),
    read: (id: string) =>
      localOperation(async () => {
        const row = await packages.get(parseBoundary(randomIdSchema, id));
        return row ? parseTeacherPackage(row) : undefined;
      }),
    list: (classId?: string) =>
      localOperation(async () =>
        (classId
          ? await packages
              .where("classId")
              .equals(parseBoundary(randomIdSchema, classId))
              .toArray()
          : await packages.toArray()
        ).map(parseTeacherPackage),
      ),
    remove: (id: string) =>
      localOperation(async () => {
        const key = parseBoundary(randomIdSchema, id);
        if ((await packages.get(key))?.frozen)
          throw new Error("Frozen package is in use");
        await packages.delete(key);
      }),
    latest: (classId?: string) =>
      localOperation(async () => {
        const pointer = await meta.get(
          classId
            ? `package:class:${parseBoundary(randomIdSchema, classId)}`
            : "package:last",
        );
        const row = pointer
          ? await packages.get(pointer.value)
          : classId
            ? await packages.where("classId").equals(classId).last()
            : await packages.toCollection().last();
        return row ? parseTeacherPackage(row) : undefined;
      }),
    close: () => db.close(),
  };
}
