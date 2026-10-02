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
  if (
    request.method !== "GET" ||
    url.origin !== origin ||
    url.search ||
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
