"use client";
import { createSyncRepository } from "../../local/sync";
import { readLocalAccess } from "../../local/access";
import type { LocalScope } from "../../local/scope";
import {
  syncRecordsSchema,
  syncRecordSchema,
  type SyncRecord,
  type SessionSync,
} from "../../contracts/sync";
import { classDetailSchema, type ClassDto } from "../../contracts/classes";
import { reviewSyncConflict } from "../../contracts/sync-conflict";
import { synchronize } from "./sync-client";
async function access(scope: LocalScope) {
  if ((await readLocalAccess())?.id !== scope.ownerId)
    throw new Error("Local access locked");
}
export type SyncReview = {
  classroom: ClassDto;
  record: SyncRecord;
  local: SessionSync;
  review: ReturnType<typeof reviewSyncConflict>;
};
export async function readSyncReviews(scope: LocalScope) {
  await access(scope);
  const repo = createSyncRepository(scope);
  try {
    const entries = (await repo.list()).filter((e) => e.state === "review");
    const reviews: SyncReview[] = [];
    for (const entry of entries) {
      const detailResponse = await fetch(`/api/v1/classes/${entry.classId}`, {
        cache: "no-store",
      });
      const recordsResponse = await fetch(
        `/api/v1/sync?classId=${entry.classId}`,
        { cache: "no-store" },
      );
      if (!detailResponse.ok || !recordsResponse.ok)
        throw new Error("Canonical session unavailable");
      const detail = classDetailSchema.parse(await detailResponse.json());
      const record = syncRecordsSchema
        .parse(await recordsResponse.json())
        .records.find((r) => r.sessionId === entry.sessionId);
      if (!record || detail.class.mode !== scope.mode)
        throw new Error("Canonical session unavailable");
      const local = await repo.snapshot(entry.sessionId);
      reviews.push({
        classroom: detail.class,
        record,
        local,
        review: reviewSyncConflict(local, record.payload),
      });
    }
    return reviews;
  } finally {
    repo.close();
  }
}
export async function restoreSyncClass(scope: LocalScope, classroom: ClassDto) {
  await access(scope);
  const response = await fetch(`/api/v1/sync?classId=${classroom.id}`, {
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Canonical session unavailable");
  const records = syncRecordsSchema.parse(await response.json()).records;
  const repo = createSyncRepository(scope);
  try {
    await repo.device();
    for (const record of records) await repo.restore(record, classroom);
    window.dispatchEvent(new Event("pn-sync-restored"));
    return records;
  } finally {
    repo.close();
  }
}
export async function resolveSyncReview(
  scope: LocalScope,
  review: SyncReview,
  choice: "server" | "local",
) {
  await access(scope);
  const repo = createSyncRepository(scope);
  try {
    // Check local freshness before changing the online writer, and again in the write transaction.
    if (
      JSON.stringify(await repo.snapshot(review.record.sessionId)) !==
      JSON.stringify(review.local)
    )
      throw new Error("Local state changed; review again");
    let record = review.record;
    if (choice === "local") {
      if (!review.review.compatible) throw new Error("Frozen binding differs");
      const response = await fetch("/api/v1/sync/takeover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classId: review.classroom.id,
          sessionId: record.sessionId,
          deviceId: await repo.device(),
          baseRevision: record.revision,
          expectedEpoch: record.writerEpoch,
        }),
      });
      if (!response.ok)
        throw new Error("Canonical revision changed; review again");
      record = syncRecordSchema.parse(await response.json());
    }
    await repo.restore(record, review.classroom, {
      payload: review.local,
      choice,
    });
    window.dispatchEvent(new Event("pn-sync-restored"));
    return choice === "local" ? await synchronize(scope) : undefined;
  } finally {
    repo.close();
  }
}
export async function takeOverRestoredSession(
  scope: LocalScope,
  classroom: ClassDto,
  record: SyncRecord,
) {
  const repo = createSyncRepository(scope);
  try {
    const local = await repo.snapshot(record.sessionId);
    return resolveSyncReview(
      scope,
      {
        classroom,
        record,
        local,
        review: reviewSyncConflict(local, record.payload),
      },
      "local",
    );
  } finally {
    repo.close();
  }
}
