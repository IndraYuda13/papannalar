"use client";
import type { Table } from "dexie";
import { parseRotation } from "../contracts/stations";
import type { Rotation } from "../core/stations/rotation";
import { openDataDatabase } from "./data-database";
import { localOperation, type LocalScope } from "./scope";
export function createRotationRepository(scope: LocalScope) {
  const db = openDataDatabase(scope),
    rows: Table<Rotation, string> = db.table("rotations");
  return {
    read: (id: string) =>
      localOperation(async () => {
        const value = await rows.get(id);
        return value ? parseRotation(value) : undefined;
      }),
    save: (input: Rotation, expectedRevision: number) =>
      localOperation(() =>
        db.transaction("rw", rows, async () => {
          const value = parseRotation(input),
            old = await rows.get(value.id);
          if (
            (old?.revision ?? 0) !== expectedRevision ||
            value.revision !== expectedRevision + 1
          )
            throw new Error("Rotation conflict");
          if (
            old &&
            JSON.stringify(old.groupIds) !== JSON.stringify(value.groupIds)
          )
            throw new Error("Rotation groups frozen");
          if (
            old &&
            (value.round < old.round ||
              old.schedule.some((row, i) =>
                row
                  .slice(0, old.round + 1)
                  .some(
                    (station, round) => station !== value.schedule[i][round],
                  ),
              ))
          )
            throw new Error("Past station assignments frozen");
          await rows.put(value);
        }),
      ),
    close: () => db.close(),
  };
}
