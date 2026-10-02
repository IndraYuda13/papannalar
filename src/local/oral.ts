"use client";
import type { Table } from "dexie";
import { parseOralRun } from "../contracts/oral";
import type { OralRun } from "../core/oral/state";
import { parseBoundary, randomIdSchema } from "../contracts/domain";
import { openDataDatabase } from "./data-database";
import { localOperation, type LocalScope } from "./scope";
export function createOralRepository(scope: LocalScope) {
  const db = openDataDatabase(scope),
    rows: Table<OralRun, string> = db.table("oralRuns");
  const meta: Table<{ key: string; value: string }, string> =
    db.table("localMeta");
  return {
    save: (input: OralRun, expectedRevision: number) =>
      localOperation(() =>
        db.transaction("rw", rows, meta, async () => {
          const raw = parseOralRun(input),
            previous = await rows.get(raw.id);
          const siblings = await rows
            .where("classId")
            .equals(raw.classId)
            .toArray();
          const value = parseOralRun({
            ...raw,
            sequence:
              (previous ? (previous.sequence ?? 0) : undefined) ??
              raw.sequence ??
              Math.max(
                0,
                ...siblings
                  .filter(
                    (r) =>
                      r.studentId === raw.studentId &&
                      r.afterSessionOrdinal === raw.afterSessionOrdinal,
                  )
                  .map((r) => r.sequence ?? 0),
              ) + 1,
          });
          if ((previous?.revision ?? 0) !== expectedRevision)
            throw new Error("Oral revision conflict");
          if (
            previous &&
            [
              "classId",
              "studentId",
              "target",
              "start",
              "seed",
              "baseline",
              "afterSessionOrdinal",
            ].some(
              (key) =>
                JSON.stringify(previous[key as keyof OralRun]) !==
                JSON.stringify(value[key as keyof OralRun]),
            )
          )
            throw new Error("Oral baseline is frozen");
          await rows.put(value);
          await meta.bulkPut([
            { key: "oral:last", value: value.id },
            { key: `oral:class:${value.classId}`, value: value.id },
            { key: `oral:student:${value.studentId}`, value: value.id },
          ]);
        }),
      ),
    read: (id: string) =>
      localOperation(async () => {
        const row = await rows.get(parseBoundary(randomIdSchema, id));
        return row ? parseOralRun(row) : undefined;
      }),
    list: (classId?: string) =>
      localOperation(async () =>
        (classId
          ? await rows
              .where("classId")
              .equals(parseBoundary(randomIdSchema, classId))
              .toArray()
          : await rows.toArray()
        ).map(parseOralRun),
      ),
    latest: (key = "last") =>
      localOperation(async () => {
        const pointer = await meta.get(`oral:${key}`);
        const row = pointer ? await rows.get(pointer.value) : undefined;
        return row ? parseOralRun(row) : undefined;
      }),
    close: () => db.close(),
  };
}
