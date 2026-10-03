import { z } from "zod";
const key = "pn-board-reset-pending-v1";
const requestSchema = z.uuid();
type ResetStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;
export function readPendingBoardReset(
  storage: () => ResetStorage = () => localStorage,
): string | undefined {
  try {
    const parsed = requestSchema.safeParse(storage().getItem(key));
    return parsed.success ? parsed.data : undefined;
  } catch {
    return undefined;
  }
}
export function rememberBoardReset(
  requestId: string,
  storage: () => ResetStorage = () => localStorage,
) {
  const value = requestSchema.parse(requestId);
  try {
    storage().setItem(key, value);
    return true;
  } catch {
    return false;
  }
}
export function finishBoardReset(
  requestId: string,
  storage: () => ResetStorage = () => localStorage,
) {
  try {
    const store = storage();
    if (store.getItem(key) === requestId) store.removeItem(key);
  } catch {
    /* RAM-only recovery remains available with denied storage. */
  }
}
