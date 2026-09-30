"use client";

export async function registerShellCache(): Promise<boolean> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator))
    return false;
  try {
    await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
      updateViaCache: "none",
    });
    return true;
  } catch {
    // Registration is optional. No raw error/user data is logged or sent.
    return false;
  }
}

// Shell-only readiness, never a claim that session/engine/content is ready.
export async function auditShellCache(): Promise<boolean> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator))
    return false;
  const registration = await navigator.serviceWorker.getRegistration("/");
  if (!registration?.active) return false;
  return new Promise((resolve) => {
    const channel = new MessageChannel();
    const finish = (ready: boolean) => {
      clearTimeout(timeout);
      channel.port1.close();
      resolve(ready);
    };
    const timeout = setTimeout(() => finish(false), 3000);
    channel.port1.onmessage = (event: MessageEvent<unknown>) => {
      const data = event.data;
      finish(
        typeof data === "object" &&
          data !== null &&
          "complete" in data &&
          data.complete === true,
      );
    };
    registration.active?.postMessage({ type: "AUDIT_SHELL_CACHE" }, [
      channel.port2,
    ]);
  });
}
