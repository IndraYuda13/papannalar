import "server-only";
import type { authContext } from "./auth/client";
import { classDetail } from "./classes";
import {
  syncAckSchema,
  syncRecordsSchema,
  type SessionSync,
  type SyncMutation,
} from "../contracts/sync";
import {
  hydrateSyncSession,
  replaySyncHistory,
} from "../features/session/sync-replay";
type Client = ReturnType<typeof authContext>["client"];
export async function syncRpc(
  client: Client,
  action: "apply" | "read" | "takeover",
  input: unknown,
): Promise<unknown> {
  const { data, error } = await client.rpc("sync_action", {
    p_action: action,
    p_input: input,
  });
  if (error) throw new Error("UNAVAILABLE");
  if (data && typeof data === "object" && "error" in data) {
    const code = data.error;
    throw new Error(
      typeof code === "string" &&
        ["FORBIDDEN", "CONFLICT", "INVALID_INPUT", "RATE_LIMITED"].includes(
          code,
        )
        ? code
        : "UNAVAILABLE",
    );
  }
  return data;
}
export async function readSync(client: Client, classId: string) {
  return syncRecordsSchema.parse(await syncRpc(client, "read", { classId }));
}
// Per-class validation context hoisted out of the mutation loop (T2-06). A batch
// of up to 50 mutations previously repeated readSync (a FOR UPDATE lock on the
// class row) + classDetail (two PostgREST reads) for every mutation, ~150+
// sequential round-trips and repeated row locks before anything was applied. We
// load the class detail and the current records once per classId and reuse them,
// updating the record set locally as each session-save is accepted.
export function createSyncValidator(client: Client) {
  // Only identity + payload are needed to replay a class's history, so the cache
  // holds the minimal shape and does not need the server-assigned revision /
  // writerEpoch / deviceId.
  type CachedRecord = { sessionId: string; payload: SessionSync };
  const classes = new Map<string, Awaited<ReturnType<typeof classDetail>>>();
  const records = new Map<string, readonly CachedRecord[]>();
  async function context(classId: string) {
    let detail = classes.get(classId);
    let existing = records.get(classId);
    if (!detail) {
      detail = await classDetail(client, classId);
      classes.set(classId, detail);
    }
    if (!existing) {
      existing = (await readSync(client, classId)).records.map((r) => ({
        sessionId: r.sessionId,
        payload: r.payload,
      }));
      records.set(classId, existing);
    }
    return { detail, existing };
  }
  return {
    async apply(mutation: SyncMutation) {
      if (mutation.operation === "session-save") {
        if (
          !mutation.payload ||
          mutation.payload.cycle.classId !== mutation.classId ||
          mutation.payload.cycle.id !== mutation.sessionId
        )
          throw new Error("INVALID_INPUT");
        const { detail, existing } = await context(mutation.classId);
        try {
          hydrateSyncSession(mutation.payload, detail.class);
          replaySyncHistory(
            [
              ...existing
                .filter((r) => r.sessionId !== mutation.sessionId)
                .map((r) => r.payload),
              mutation.payload,
            ],
            detail.class,
          );
        } catch {
          throw new Error("INVALID_INPUT");
        }
        const ack = syncAckSchema.parse(
          await syncRpc(client, "apply", mutation),
        );
        // Keep the local view coherent for later mutations of the same class.
        if (ack.status === "accepted")
          records.set(mutation.classId, [
            ...existing.filter((r) => r.sessionId !== mutation.sessionId),
            { sessionId: mutation.sessionId, payload: mutation.payload },
          ]);
        return ack;
      }
      if (mutation.payload !== null) throw new Error("INVALID_INPUT");
      return syncAckSchema.parse(await syncRpc(client, "apply", mutation));
    },
  };
}
export async function applySync(client: Client, mutation: SyncMutation) {
  return createSyncValidator(client).apply(mutation);
}
