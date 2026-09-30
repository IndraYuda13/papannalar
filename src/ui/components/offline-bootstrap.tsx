"use client";

import { useEffect } from "react";
import { registerShellCache } from "../../offline/shell-cache";
import { pageUpdateSafe } from "../../offline/update-safety";

export function OfflineBootstrap() {
  useEffect(() => {
    if (process.env.NODE_ENV === "production") void registerShellCache();
    const safety = (event: MessageEvent<unknown>) => {
      if (
        typeof event.data !== "object" ||
        event.data === null ||
        !("type" in event.data) ||
        event.data.type !== "QUERY_UPDATE_SAFETY" ||
        !event.ports[0]
      )
        return;
      void pageUpdateSafe().then((safe) =>
        event.ports[0].postMessage({ safe }),
      );
    };
    navigator.serviceWorker?.addEventListener("message", safety);
    return () =>
      navigator.serviceWorker?.removeEventListener("message", safety);
  }, []);
  return null;
}
