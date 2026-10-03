export type ShellManifest = {
  cacheName: string;
  assets: string[];
  shells: Record<"/guru" | "/layar", string> & { "/guru/latihan"?: string };
};

export function cacheTarget(
  request: { url: string; method: string; mode: string; rsc: boolean },
  origin: string,
  manifest: ShellManifest,
): string | undefined {
  const url = new URL(request.url);
  const context = [...url.searchParams];
  // Return the canonical public shell, never cache a teacher's query URL.
  const practiceContext =
    request.mode === "navigate" &&
    url.pathname === "/guru/latihan" &&
    new Set(context.map(([key]) => key)).size === context.length &&
    context.every(([key, value]) =>
      key === "mode"
        ? value === "demo" || value === "pilot"
        : key === "class" &&
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu.test(
            value,
          ),
    );
  if (
    request.method !== "GET" ||
    url.origin !== origin ||
    (url.search &&
      !(
        practiceContext ||
        (request.mode !== "navigate" &&
          url.pathname === "/icon.svg" &&
          /^\?icon\.[A-Za-z0-9_-]{1,80}\.svg$/.test(url.search))
      )) ||
    request.rsc
  )
    return undefined;

  if (request.mode === "navigate") {
    if (url.pathname === "/" || url.pathname === "/guru")
      return manifest.shells["/guru"];
    if (url.pathname === "/layar") return manifest.shells["/layar"];
    if (url.pathname === "/guru/latihan")
      return manifest.shells["/guru/latihan"];
    return undefined;
  }
  return manifest.assets.includes(url.pathname) ? url.pathname : undefined;
}
