"use client";
import { z } from "zod";
import { openDataDatabase } from "./data-database";
import { readLocalAccess } from "./access";
import type { LocalScope } from "./scope";
import {
  libraryActionSchema,
  libraryStateSchema,
  draftDocumentSchema,
  runDetailSchema,
  type LibraryAction,
  type LibraryResponse,
  type LibraryRun,
} from "../contracts/library";
import { classListSchema, classDetailSchema } from "../contracts/classes";
const schemas = {
  state: libraryStateSchema,
  classes: classListSchema,
  detail: runDetailSchema,
  classDetail: classDetailSchema,
  editorDraft: z.strictObject({
    id: z.uuid(),
    revision: z.number().int().nonnegative(),
    document: draftDocumentSchema,
  }),
  answerDraft: z.strictObject({
    formId: z.uuid(),
    version: z.number().int().positive(),
    studentId: z.uuid(),
    answers: z
      .array(z.enum(["", "A", "B", "C", "D", "?"]))
      .min(1)
      .max(5),
    revision: z.number().int().nonnegative(),
    review: z.boolean(),
  }),
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
type PendingRow = { key: string; value: unknown; conflict?: boolean };
type Detail = { run: LibraryRun; responses: LibraryResponse[] };

/** Pending answers remain visible when a stale server receipt arrives. */
export async function withPendingLibraryResponses(
  scope: LocalScope,
  detail: Detail,
): Promise<Detail> {
  const pending = (await pendingLibraryResponses(scope)).filter(
    (a) =>
      a.id === detail.run.id &&
      a.formId === detail.run.formId &&
      a.version === detail.run.version,
  );
  return {
    run: detail.run,
    responses: [
      ...detail.responses.filter(
        (r) => !pending.some((a) => a.studentId === r.studentId),
      ),
      ...pending.map((a) => ({
        studentId: a.studentId,
        answers: a.answers,
        status: a.status,
        revision: a.revision + 1,
        correct: detail.run.document.items.filter(
          (q, i) => q.kind === "card" && q.key === a.answers[i],
        ).length,
      })),
    ],
  };
}

export async function libraryResponseConflicts(scope: LocalScope) {
  if ((await readLocalAccess())?.id !== scope.ownerId)
    throw new Error("LOCKED");
  const db = openDataDatabase(scope);
  try {
    return (await db.table<PendingRow>("libraryPending").toArray())
      .filter((r) => r.conflict)
      .map((r) => pendingSchema.parse(r.value));
  } finally {
    db.close();
  }
}

/** Caller shows both versions and records the teacher's explicit choice. */
export async function resolveLibraryResponse(
  scope: LocalScope,
  expected: Extract<LibraryAction, { action: "response" }>,
  remote: LibraryResponse | undefined,
  choice: "local" | "server",
) {
  if ((await readLocalAccess())?.id !== scope.ownerId)
    throw new Error("LOCKED");
  const db = openDataDatabase(scope),
    key = `${expected.id}:${expected.studentId}`;
  try {
    await db.transaction("rw", db.table("libraryPending"), async () => {
      const row = await db.table<PendingRow>("libraryPending").get(key);
      if (
        !row?.conflict ||
        JSON.stringify(pendingSchema.parse(row.value)) !==
          JSON.stringify(expected)
      )
        throw new Error("CONFLICT");
      if (choice === "server") await db.table("libraryPending").delete(key);
      else
        await db.table("libraryPending").put({
          key,
          value: pendingSchema.parse({
            ...expected,
            revision: remote?.revision ?? 0,
          }),
        });
    });
  } finally {
    db.close();
  }
}
export async function removeLibraryCache(
  scope: LocalScope,
  kind: CacheKind,
  key: string,
) {
  if ((await readLocalAccess())?.id !== scope.ownerId)
    throw new Error("LOCKED");
  const db = openDataDatabase(scope);
  try {
    await db.table("libraryCache").delete(`${kind}:${key}`);
  } finally {
    db.close();
  }
}
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
    let accepted = 0;
    for (const row of rows) {
      if ((await readLocalAccess())?.id !== scope.ownerId) break;
      const action = pendingSchema.parse(row.value);
      let result: Detail;
      try {
        result = runDetailSchema.parse(await send(action));
      } catch (error) {
        if (error instanceof Error && error.message === "CONFLICT") {
          await db.transaction("rw", db.table("libraryPending"), async () => {
            const latest = await db
              .table<PendingRow>("libraryPending")
              .get(row.key);
            if (latest)
              await db
                .table("libraryPending")
                .put({ ...latest, conflict: true });
          });
          window.dispatchEvent(new Event("pn-library-conflict"));
          continue;
        }
        break;
      }
      await db.transaction("rw", db.table("libraryPending"), async () => {
        const latest = await db
          .table<{ key: string; value: unknown }>("libraryPending")
          .get(row.key);
        if (JSON.stringify(latest?.value) === JSON.stringify(row.value))
          await db.table("libraryPending").delete(row.key);
        else if (latest) {
          const next = pendingSchema.parse(latest.value);
          const saved = result.responses.find(
            (r) => r.studentId === action.studentId,
          );
          // Only advance over the accepted predecessor from this exact queue.
          if (saved && next.revision === action.revision)
            await db
              .table("libraryPending")
              .put({ ...latest, value: { ...next, revision: saved.revision } });
        }
      });
      const projected = await withPendingLibraryResponses(scope, result);
      await libraryCache(scope, "detail", action.id, projected);
      accepted++;
      window.dispatchEvent(
        new CustomEvent("pn-library-synced", { detail: projected }),
      );
    }
    return accepted;
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
