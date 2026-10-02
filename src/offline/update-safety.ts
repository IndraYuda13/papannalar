"use client";
type Guard = () => boolean | Promise<boolean>;
const guards = new Map<string, Guard>();
export function registerUpdateGuard(id: string, guard: Guard) {
  guards.set(id, guard);
  return () => {
    guards.delete(id);
  };
}
export async function pageUpdateSafe() {
  if (
    typeof document !== "undefined" &&
    ((document.querySelector('[data-surface="guru"]') &&
      !guards.has("teacher")) ||
      (document.querySelector('[data-surface="layar"]') &&
        !guards.has("board")))
  )
    return false;
  try {
    return (
      await Promise.all([...guards.values()].map((guard) => guard()))
    ).every(Boolean);
  } catch {
    return false;
  }
}
export async function activateWaitingUpdate() {
  const registration = await navigator.serviceWorker?.getRegistration("/");
  if (!registration?.waiting || !(await pageUpdateSafe())) return false;
  return new Promise<boolean>((resolve) => {
    const channel = new MessageChannel();
    const timeout = setTimeout(() => {
      channel.port1.close();
      resolve(false);
    }, 7000);
    channel.port1.onmessage = (event: MessageEvent<unknown>) => {
      clearTimeout(timeout);
      channel.port1.close();
      resolve(
        typeof event.data === "object" &&
          event.data !== null &&
          "activated" in event.data &&
          event.data.activated === true,
      );
    };
    registration.waiting!.postMessage({ type: "ACTIVATE_WHEN_SAFE" }, [
      channel.port2,
    ]);
  });
}
