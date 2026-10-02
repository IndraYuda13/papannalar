/// <reference lib="webworker" />

import { cacheTarget, type ShellManifest } from "./cache-policy";

declare const __SHELL_MANIFEST__: ShellManifest;
const worker = globalThis as unknown as ServiceWorkerGlobalScope;
const manifest = __SHELL_MANIFEST__;
const entries = [...manifest.assets, ...Object.values(manifest.shells)];

worker.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(manifest.cacheName).then((cache) =>
      cache.addAll(
        entries.map(
          (url) =>
            new Request(url, {
              credentials: "omit",
              cache: "reload",
            }),
        ),
      ),
    ),
  );
  // No skipWaiting: an update must not take over an ongoing class.
});

worker.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (key) =>
                key.startsWith("pn-shell-") && key !== manifest.cacheName,
            )
            .map((key) => caches.delete(key)),
        ),
      ),
  );
  // No clients.claim: the first controlled page is the next navigation/reload.
});

worker.addEventListener("fetch", (event) => {
  const request = event.request;
  const target = cacheTarget(
    {
      url: request.url,
      method: request.method,
      mode: request.mode,
      rsc: request.headers.has("RSC"),
    },
    worker.location.origin,
    manifest,
  );
  if (!target) return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(manifest.cacheName);
      if (request.mode === "navigate") {
        try {
          // Never put a runtime HTML/RSC/API response into CacheStorage.
          return await fetch(request);
        } catch {
          return (await cache.match(target)) ?? Response.error();
        }
      }
      return (await cache.match(target)) ?? fetch(request);
    })(),
  );
});

worker.addEventListener("message", (event) => {
  if (event.data?.type === "ACTIVATE_WHEN_SAFE" && event.ports[0]) {
    event.waitUntil(
      (async () => {
        const clients = await worker.clients.matchAll({
          type: "window",
          includeUncontrolled: true,
        });
        const safe = await Promise.all(
          clients.map(
            (client) =>
              new Promise<boolean>((resolve) => {
                const channel = new MessageChannel();
                const timeout = setTimeout(() => {
                  channel.port1.close();
                  resolve(false);
                }, 5000);
                channel.port1.onmessage = (reply: MessageEvent<unknown>) => {
                  clearTimeout(timeout);
                  channel.port1.close();
                  resolve(
                    typeof reply.data === "object" &&
                      reply.data !== null &&
                      "safe" in reply.data &&
                      reply.data.safe === true,
                  );
                };
                client.postMessage({ type: "QUERY_UPDATE_SAFETY" }, [
                  channel.port2,
                ]);
              }),
          ),
        );
        if (!safe.every(Boolean)) {
          event.ports[0].postMessage({ activated: false });
          return;
        }
        await worker.skipWaiting();
        event.ports[0].postMessage({ activated: true });
      })(),
    );
    return;
  }
  if (event.data?.type !== "AUDIT_SHELL_CACHE" || !event.ports[0]) return;
  event.waitUntil(
    (async () => {
      const cache = await caches.open(manifest.cacheName);
      const hits = await Promise.all(
        entries.map((entry) => cache.match(entry)),
      );
      const cached = hits.filter(Boolean).length;
      event.ports[0].postMessage({
        complete: cached === entries.length,
        cached,
        total: entries.length,
      });
    })(),
  );
});
