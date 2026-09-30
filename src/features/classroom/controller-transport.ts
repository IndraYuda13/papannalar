const key = "pn-presentation-controller-v1";
let memoryId: string | undefined;
export function presentationControllerId(): string {
  if (memoryId) return memoryId;
  try {
    const saved = sessionStorage.getItem(key);
    if (
      saved &&
      /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(
        saved,
      )
    )
      memoryId = saved;
  } catch {
    /* Storage denied: this tab can still connect. */
  }
  memoryId ??= crypto.randomUUID();
  try {
    sessionStorage.setItem(key, memoryId);
  } catch {
    /* RAM fallback. */
  }
  return memoryId;
}
// The entry shell calls this on logout/account change, after explicit revoke.
export function forgetPresentationController() {
  memoryId = undefined;
  try {
    sessionStorage.removeItem(key);
  } catch {
    /* RAM fallback. */
  }
}
