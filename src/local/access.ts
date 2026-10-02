"use client";
import Dexie from "dexie";
import { z } from "zod";
import { randomIdSchema } from "../contracts/domain";

// A local UI lock, never an authentication credential for the server.
const grantSchema = z.strictObject({
  id: randomIdSchema,
  expiresAt: z.number().int().positive(),
});
type Grant = z.infer<typeof grantSchema>;
let lockedInMemory = false;
function flag(key: "locked" | "logout", value?: boolean) {
  try {
    if (value !== undefined)
      localStorage.setItem(`pn-access-${key}`, value ? "1" : "0");
    return localStorage.getItem(`pn-access-${key}`) === "1";
  } catch {
    return key === "locked" && lockedInMemory;
  }
}
function database() {
  const db = new Dexie("pn-teacher-access");
  db.version(1).stores({ access: "" });
  return db;
}
export async function readLocalAccess(): Promise<Grant | undefined> {
  if (lockedInMemory || flag("locked") || flag("logout")) return undefined;
  const db = database();
  try {
    const grant = grantSchema.safeParse(
      await db.table("access").get("current"),
    );
    return grant.success && grant.data.expiresAt > Date.now()
      ? grant.data
      : undefined;
  } finally {
    db.close();
  }
}
export async function rememberLocalAccess(id: string) {
  const db = database();
  try {
    return await db.transaction("rw", db.table("access"), async () => {
      if (
        flag("logout") ||
        (await db.table("access").get("pendingLogout")) === true
      )
        return false;
      await db
        .table("access")
        .put(
          grantSchema.parse({ id, expiresAt: Date.now() + 8 * 60 * 60 * 1000 }),
          "current",
        );
      lockedInMemory = false;
      flag("locked", false);
      return true;
    });
  } finally {
    db.close();
  }
}
export async function lockLocalAccess(pendingLogout = true) {
  lockedInMemory = true;
  flag("locked", true);
  flag("logout", pendingLogout);
  const channel = new BroadcastChannel("pn-teacher-access");
  channel.postMessage("locked");
  channel.close();
  const db = database();
  try {
    await db.transaction("rw", db.table("access"), async () => {
      await db.table("access").delete("current");
      await db.table("access").put(pendingLogout, "pendingLogout");
    });
  } catch {
    // Lock UI immediately even when quota/storage fails. Retry server logout online.
  } finally {
    db.close();
  }
}
export async function hasPendingLogout() {
  if (flag("logout")) return true;
  const db = database();
  try {
    return (await db.table("access").get("pendingLogout")) === true;
  } finally {
    db.close();
  }
}
