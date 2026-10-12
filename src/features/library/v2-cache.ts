"use client";
import { z } from "zod";
import { openDataDatabase } from "@/local/data-database";
import { readLocalAccess } from "@/local/access";
import type { LocalScope } from "@/local/scope";
export async function removeFeatureCache(scope: LocalScope, key: string) {
  if ((await readLocalAccess())?.id !== scope.ownerId)
    throw new Error("LOCKED");
  const db = openDataDatabase(scope);
  try {
    await db.table("learningCache").delete(`v2:ui:${key}`);
  } finally {
    db.close();
  }
}
export async function featureCache<T>(
  scope: LocalScope,
  key: string,
  schema: z.ZodType<T>,
  value?: T,
): Promise<T | undefined> {
  if ((await readLocalAccess())?.id !== scope.ownerId)
    throw new Error("LOCKED");
  const db = openDataDatabase(scope);
  try {
    if (value !== undefined)
      await db
        .table("learningCache")
        .put({ key: `v2:ui:${key}`, value: schema.parse(value) });
    const row = await db
      .table<{ value: unknown }>("learningCache")
      .get(`v2:ui:${key}`);
    return row ? schema.parse(row.value) : undefined;
  } finally {
    db.close();
  }
}
