"use client";
import { z } from "zod";
import { randomIdSchema } from "../contracts/domain";
import { openDataDatabase } from "./data-database";
import { readLocalAccess } from "./access";
import type { LocalScope } from "./scope";
const schema = z.strictObject({
  classId: randomIdSchema,
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  absent: z.array(randomIdSchema).max(40),
});
// Daily teacher attendance aid. No names, no replacement for the frozen assessment roster.
export async function classPresence(
  scope: LocalScope,
  classId: string,
  date: string,
  absent?: string[],
) {
  if ((await readLocalAccess())?.id !== scope.ownerId)
    throw new Error("LOCKED");
  const db = openDataDatabase(scope),
    key = `${classId}:${date}`;
  try {
    if (absent !== undefined)
      await db
        .table("classPresence")
        .put({ key, value: schema.parse({ classId, date, absent }) });
    const row = await db.table<{ value: unknown }>("classPresence").get(key);
    return row ? schema.parse(row.value).absent : [];
  } finally {
    db.close();
  }
}
