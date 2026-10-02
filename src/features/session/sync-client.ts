"use client";
import { createSyncRepository } from "../../local/sync";
import { readLocalAccess } from "../../local/access";
import type { LocalScope } from "../../local/scope";
import { syncResultSchema } from "../../contracts/sync";
/** One bounded round. Browser closure needs no worker: exact mutations remain in IDB. */
async function synchronizeOnce(scope: LocalScope, signal?: AbortSignal) {
  const repository = createSyncRepository(scope);
  try {
    const grant = await readLocalAccess();
    if (grant?.id !== scope.ownerId) throw new Error("Local access locked");
    await repository.prepare();
    const entries = await repository.list(),
      blockedClasses = new Set<string>();
    let accepted = 0;
    for (const entry of entries.slice(0, 50)) {
      if (signal?.aborted) break;
      if ((await readLocalAccess())?.id !== scope.ownerId) break;
      if (blockedClasses.has(entry.classId)) continue;
      if (
        entry.mutation.payload &&
        !(await repository.parentsReady(
          entry.classId,
          entry.mutation.payload.cycle.ordinal,
        ))
      ) {
        blockedClasses.add(entry.classId);
        continue;
      }
      if (
        !["pending", "retry"].includes(entry.state) ||
        entry.attempts >= 6 ||
        entry.nextAttempt > Date.now()
      ) {
        blockedClasses.add(entry.classId);
        continue;
      }
      try {
        const response = await fetch("/api/v1/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mutations: [entry.mutation] }),
          cache: "no-store",
          signal,
        });
        if (!response.ok) {
          const retry = response.headers.get("Retry-After");
          const seconds = retry
            ? /^\d+$/.test(retry)
              ? Number(retry)
              : Math.max(0, (Date.parse(retry) - Date.now()) / 1000)
            : 0;
          await repository.failed(
            entry.eventId,
            response.status,
            Number.isFinite(seconds) ? seconds : 0,
          );
          blockedClasses.add(entry.classId);
          if (response.status === 401 || response.status === 403) break;
          continue;
        }
        const result = syncResultSchema.parse(await response.json());
        const ack = result.acknowledgements.find(
          (a) => a.eventId === entry.eventId,
        );
        if (!ack) throw new Error("Missing acknowledgement");
        await repository.acknowledge(ack);
        if (ack.status === "accepted") accepted++;
        else blockedClasses.add(entry.classId);
      } catch {
        await repository.failed(entry.eventId, 503);
        blockedClasses.add(entry.classId);
      }
    }
    return { accepted, entries: await repository.list() };
  } finally {
    repository.close();
  }
}
const running = new Map<string, ReturnType<typeof synchronizeOnce>>();
export function synchronize(scope: LocalScope, signal?: AbortSignal) {
  const key = `${scope.ownerId}:${scope.mode}`;
  const previous = running.get(key);
  if (previous) return previous;
  const task = synchronizeOnce(scope, signal).finally(() =>
    running.delete(key),
  );
  running.set(key, task);
  return task;
}
