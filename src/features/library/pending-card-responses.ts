"use client";
import {
  libraryV2ActionSchema,
  type LibraryV2Action,
} from "@/contracts/library";
import type { LocalScope } from "@/local/scope";
import { openDataDatabase } from "@/local/data-database";
import { readLocalAccess } from "@/local/access";
export async function pendingCardResponses(scope: LocalScope, runId: string) {
  if ((await readLocalAccess())?.id !== scope.ownerId)
    throw new Error("LOCKED");
  const db = openDataDatabase(scope);
  try {
    const rows = await db
      .table<{ value: unknown }>("learningPending")
      .toArray();
    return rows
      .map((r) => libraryV2ActionSchema.parse(r.value))
      .filter(
        (r): r is Extract<LibraryV2Action, { action: "response" }> =>
          r.action === "response" && r.id === runId,
      );
  } finally {
    db.close();
  }
}
