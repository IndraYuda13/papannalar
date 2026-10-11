export type SyncFailure =
  | "login"
  | "forbidden"
  | "review"
  | "invalid"
  | "retry"
  // The server acknowledged a session-delete for this entry (T2-09). It is a
  // real, teacher-visible outcome, not an invisible "invalid": the local edit
  // was not saved because the session no longer exists server-side.
  | "deleted";
export function syncFailure(status: number): SyncFailure {
  if (status === 401) return "login";
  if (status === 403 || status === 404) return "forbidden";
  if (status === 409) return "review";
  if (status === 413 || status === 422) return "invalid";
  return "retry";
}
export function retryDelay(
  attempt: number,
  jitter: number,
  retryAfterSeconds = 0,
) {
  if (!Number.isInteger(attempt) || attempt < 0 || jitter < 0 || jitter > 1)
    throw new Error("Invalid retry input");
  return Math.max(
    Math.ceil(
      Math.min(30_000, 1000 * 2 ** Math.min(attempt, 5)) * (0.8 + jitter * 0.4),
    ),
    retryAfterSeconds * 1000,
  );
}
