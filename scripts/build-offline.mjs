import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { build } from "vite";

const buildId = (await readFile(".next/BUILD_ID", "utf8")).trim();
const prerender = JSON.parse(
  await readFile(".next/prerender-manifest.json", "utf8"),
);
const shells = {
  "/guru": "/offline/guru.html",
  "/guru/latihan": "/offline/guru-latihan.html",
  "/layar": "/offline/layar.html",
};
await mkdir("public/offline", { recursive: true });
for (const [route, destination] of Object.entries(shells)) {
  if (
    !prerender.routes[route] ||
    prerender.routes[route].initialRevalidateSeconds !== false
  ) {
    throw new Error(`Offline shell must remain static: ${route}`);
  }
  // Copy build-time shells only; never fetch a potentially personalized route.
  const html = await readFile(`.next/server/app${route}.html`, "utf8");
  await writeFile(`public${destination}`, html);
}

const staticFiles = await readdir(".next/static", {
  recursive: true,
  withFileTypes: true,
});
const assets = staticFiles
  .filter(
    (file) => file.isFile() && /\.(js|css|woff2?|svg|ico|png)$/.test(file.name),
  )
  .map(
    (file) =>
      `/_next/static/${path.relative(".next/static", path.join(file.parentPath, file.name)).split(path.sep).join("/")}`,
  )
  .sort();
assets.push("/icon.svg");
assets.push("/fonts/atkinson-card.woff");
assets.push("/omr-worker.js");
// Include all emitted lazy JS/CSS/font chunks; maps/RSC/API are never cached.
const workerSource = await readFile("src/offline/service-worker.ts", "utf8");
const policy = await readFile("src/offline/cache-policy.ts", "utf8");
const revision = createHash("sha256")
  .update(buildId + workerSource + policy)
  .digest("hex")
  .slice(0, 16);
const manifest = { cacheName: `pn-shell-${revision}`, assets, shells };
await writeFile(
  "public/offline/manifest.json",
  JSON.stringify(manifest, null, 2) + "\n",
);
await build({
  configFile: false,
  publicDir: false,
  define: { __SHELL_MANIFEST__: JSON.stringify(manifest) },
  build: {
    target: "es2022",
    outDir: "public",
    emptyOutDir: false,
    lib: {
      entry: "src/offline/service-worker.ts",
      formats: ["iife"],
      name: "PapanNalarShell",
      fileName: () => "sw.js",
    },
  },
});
console.log(
  `Offline manifest: ${assets.length} static assets, ${Object.keys(shells).length} public shells (${manifest.cacheName}).`,
);
