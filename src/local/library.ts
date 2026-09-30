"use client";
import { z } from "zod";
import { openDataDatabase } from "./data-database";
import { readLocalAccess } from "./access";
import type { LocalScope } from "./scope";
import {
  libraryActionSchema,
  libraryStateSchema,
  runDetailSchema,
  type LibraryAction,
} from "../contracts/library";
import { classListSchema, classDetailSchema } from "../contracts/classes";
const schemas = {
  state: libraryStateSchema,
  classes: classListSchema,
  detail: runDetailSchema,
  classDetail: classDetailSchema,
};
type CacheKind = keyof typeof schemas;
export async function libraryCache<T extends CacheKind>(
  scope: LocalScope,
  kind: T,
  key: string,
  value?: z.infer<(typeof schemas)[T]>,
) {
  if ((await readLocalAccess())?.id !== scope.ownerId)
    throw new Error("LOCKED");
  const db = openDataDatabase(scope);
  try {
    const schema = schemas[kind],
      id = `${kind}:${key}`;
    if (value !== undefined)
      await db
        .table("libraryCache")
        .put({ key: id, value: schema.parse(value) });
    const row = await db
      .table<{ key: string; value: unknown }>("libraryCache")
      .get(id);
    return row
      ? (schema.parse(row.value) as z.infer<(typeof schemas)[T]>)
      : undefined;
  } finally {
    db.close();
  }
}
const pendingSchema = libraryActionSchema.options[7];
export async function queueLibraryResponse(
  scope: LocalScope,
  input: Extract<LibraryAction, { action: "response" }>,
) {
  if ((await readLocalAccess())?.id !== scope.ownerId)
    throw new Error("LOCKED");
  const db = openDataDatabase(scope),
    key = `${input.id}:${input.studentId}`;
  try {
    const old = await db
      .table<{ key: string; value: unknown }>("libraryPending")
      .get(key);
    const value = pendingSchema.parse(input);
    if (old) value.revision = pendingSchema.parse(old.value).revision;
    await db.table("libraryPending").put({ key, value });
  } finally {
    db.close();
  }
}
export async function syncLibraryResponses(
  scope: LocalScope,
  send: (a: LibraryAction) => Promise<unknown>,
) {
  if ((await readLocalAccess())?.id !== scope.ownerId)
    throw new Error("LOCKED");
  const db = openDataDatabase(scope);
  try {
    const rows = await db
      .table<{ key: string; value: unknown }>("libraryPending")
      .toArray();
    for (const row of rows) {
      const action = pendingSchema.parse(row.value);
      const result = runDetailSchema.parse(await send(action));
      await libraryCache(scope, "detail", action.id, result);
      await db.transaction("rw", db.table("libraryPending"), async () => {
        const latest = await db
          .table<{ key: string; value: unknown }>("libraryPending")
          .get(row.key);
        if (JSON.stringify(latest?.value) === JSON.stringify(row.value))
          await db.table("libraryPending").delete(row.key);
      });
      window.dispatchEvent(
        new CustomEvent("pn-library-synced", { detail: result }),
      );
    }
    return rows.length;
  } finally {
    db.close();
  }
}
export async function pendingLibraryResponses(scope: LocalScope) {
  if ((await readLocalAccess())?.id !== scope.ownerId)
    throw new Error("LOCKED");
  const db = openDataDatabase(scope);
  try {
    return (await db.table<{ value: unknown }>("libraryPending").toArray()).map(
      (row) => pendingSchema.parse(row.value),
    );
  } finally {
    db.close();
  }
}
