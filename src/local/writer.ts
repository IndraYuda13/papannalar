"use client";
import type Dexie from "dexie";
/** An unknown offline writer cannot be policed across devices: server epoch is final. */
export async function assertSessionWriter(db: Dexie, sessionId: string) {
  const canonical = await db.table("syncMeta").get(sessionId);
  if (!canonical?.deviceId) return;
  const device = await db.table("syncMeta").get("device");
  if (canonical.deviceId !== device?.deviceId)
    throw new Error("Read-only session; take over online first");
}
