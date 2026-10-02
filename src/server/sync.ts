import "server-only";
import type { authContext } from "./auth/client";
import { classDetail } from "./classes";
import {
  syncAckSchema,
  syncRecordsSchema,
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
export async function applySync(client: Client, mutation: SyncMutation) {
  if (mutation.operation === "session-save") {
    if (
      !mutation.payload ||
      mutation.payload.cycle.classId !== mutation.classId ||
      mutation.payload.cycle.id !== mutation.sessionId
    )
      throw new Error("INVALID_INPUT");
    const detail = await classDetail(client, mutation.classId);
    const previous = await readSync(client, mutation.classId);
    try {
      hydrateSyncSession(mutation.payload, detail.class);
      replaySyncHistory(
        [
          ...previous.records
            .filter((r) => r.sessionId !== mutation.sessionId)
            .map((r) => r.payload),
          mutation.payload,
        ],
        detail.class,
      );
    } catch {
      throw new Error("INVALID_INPUT");
    }
  } else if (mutation.payload !== null) throw new Error("INVALID_INPUT");
  return syncAckSchema.parse(await syncRpc(client, "apply", mutation));
}
