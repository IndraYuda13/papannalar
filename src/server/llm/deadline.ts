import "server-only";
export async function withDeadline<T>(
  milliseconds: number,
  parent: AbortSignal,
  work: (signal: AbortSignal) => Promise<T>,
): Promise<T> {
  const controller = new AbortController();
  const cancel = () => controller.abort();
  parent.addEventListener("abort", cancel, { once: true });
  if (parent.aborted) cancel();
  const timer = setTimeout(cancel, Math.max(1, milliseconds));
  let listener: (() => void) | undefined;
  try {
    if (controller.signal.aborted) throw new Error("TIMEOUT");
    return await Promise.race([
      work(controller.signal),
      new Promise<never>((_, reject) => {
        listener = () => reject(new Error("TIMEOUT"));
        controller.signal.addEventListener("abort", listener, { once: true });
        if (controller.signal.aborted) listener();
      }),
    ]);
  } finally {
    clearTimeout(timer);
    parent.removeEventListener("abort", cancel);
    if (listener) controller.signal.removeEventListener("abort", listener);
    controller.abort();
  }
}
