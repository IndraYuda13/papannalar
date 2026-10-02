"use client";
import { openDataDatabase } from "./data-database";
import { localDatabaseName, type LocalScope } from "./scope";
import { createSyncRepository } from "./sync";
import { readLocalAccess } from "./access";
import { parseCycle } from "../contracts/cycle";
import { parseAssessmentContext } from "../contracts/assessment";
import { parseTeacherPackage } from "../contracts/package";
import { parseOralRun } from "../contracts/oral";
export type StorageHealth = {
  packages: number;
  cycles: number;
  activeClass: boolean;
  pending: boolean;
  localOnly: number;
  evicted: boolean;
};
export async function storageHealth(scope: LocalScope): Promise<StorageHealth> {
  const db = openDataDatabase(scope),
    sync = createSyncRepository(scope);
  try {
    await sync.prepare();
    const result = await db.transaction("rw", db.tables, async () => {
      const markerKey = `pn-storage:${localDatabaseName("pn-data", scope)}`;
      let previous: string | null = null;
      try {
        previous = localStorage.getItem(markerKey);
      } catch {
        /* Storage may be disabled. */
      }
      const sentinel = await db.table("localMeta").get("storage:sentinel");
      const evicted =
        Boolean(previous && previous !== sentinel?.value) ||
        (await db.table("localMeta").get("storage:lost"))?.value === "1";
      if (evicted)
        await db.table("localMeta").put({ key: "storage:lost", value: "1" });
      if (!sentinel)
        await db.table("localMeta").put({
          key: "storage:sentinel",
          value: previous ?? crypto.randomUUID(),
        });
      const value = (await db.table("localMeta").get("storage:sentinel"))
        .value as string;
      const cycles = (await db.table("cycles").toArray()).map(parseCycle);
      const contexts = (await db.table("sessions").toArray()).map(
        parseAssessmentContext,
      );
      const packages = (await db.table("packages").toArray()).map(
        parseTeacherPackage,
      );
      const oral = (await db.table("oralRuns").toArray()).map(parseOralRun);
      return {
        markerKey,
        value,
        packages: packages.length,
        cycles: cycles.length,
        evicted,
        activeClass:
          cycles.some((c) => !c.classEnded) ||
          contexts.some(
            (c) => !c.packageId && !c.parentSessionId && !c.session.finalized,
          ),
        pending:
          (await db.table("outbox").count()) > 0 ||
          (await db.table("syncQueue").count()) > 0,
        localOnly:
          packages.filter((p) => !cycles.some((c) => c.packageId === p.id))
            .length +
          oral.filter(
            (r) =>
              !cycles.some(
                (c) =>
                  c.classId === r.classId && c.ordinal >= r.afterSessionOrdinal,
              ),
          ).length,
      };
    });
    try {
      localStorage.setItem(result.markerKey, result.value);
    } catch {
      /* Detection after total origin eviction is necessarily best effort. */
    }
    return {
      packages: result.packages,
      cycles: result.cycles,
      activeClass: result.activeClass,
      pending: result.pending,
      localOnly: result.localOnly,
      evicted: result.evicted,
    };
  } finally {
    db.close();
    sync.close();
  }
}
export async function teacherUpdateSafe() {
  const grant = await readLocalAccess();
  if (!grant) return true;
  for (const mode of ["demo", "pilot"] as const) {
    const health = await storageHealth({ ownerId: grant.id, mode });
    if (health.activeClass || health.pending) return false;
  }
  return true;
}
