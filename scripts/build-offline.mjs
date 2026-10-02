import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { build } from "vite";
import { gzipSync } from "node:zlib";

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
const emittedAssets = staticFiles
  .filter(
    (file) => file.isFile() && /\.(js|css|woff2?|svg|ico|png)$/.test(file.name),
  )
  .map(
    (file) =>
      `/_next/static/${path.relative(".next/static", path.join(file.parentPath, file.name)).split(path.sep).join("/")}`,
  )
  .sort();
const optionalVisualAssets = [];
const visualChunks = [];
for (const asset of emittedAssets.filter((asset) => asset.endsWith(".js"))) {
  const bytes = await readFile(`.next${asset.replace("/_next", "")}`);
  // Include vendor splits as well as the scene entry. These strings survive
  // minification in Three/GLTF diagnostics and our explicit canvas marker.
  if (/PN_DECORATIVE_SCENE_V2|THREE\.|GLTFLoader/.test(bytes.toString())) {
    optionalVisualAssets.push(asset);
    visualChunks.push({
      path: asset,
      bytes: bytes.length,
      gzipBytes: gzipSync(bytes).length,
    });
  }
}
if (!optionalVisualAssets.length)
  throw new Error("Optional scene chunk audit failed");
for (const [route, destination] of Object.entries(shells)) {
  const html = await readFile(`public${destination}`, "utf8");
  if (optionalVisualAssets.some((asset) => html.includes(asset)))
    throw new Error(
      `Optional scene entered the initial offline shell: ${route}`,
    );
}
const assets = emittedAssets.filter(
  (asset) => !optionalVisualAssets.includes(asset),
);
assets.push("/icon.svg");
assets.push("/fonts/atkinson-card.woff");
assets.push("/omr-worker.js");
for (const asset of ["learning-board", "balance-scale", "algebra-kit"])
  assets.push(`/assets/pn-ui-v2/posters/${asset}.webp`);
// Math/scanner lazy chunks remain available offline. The decorative engine and
// GLBs are optional, network-only when a visible scene's preferences allow;
// posters work offline.
// Maps/RSC/API/private runtime responses are never cached.
const workerSource = await readFile("src/offline/service-worker.ts", "utf8");
const policy = await readFile("src/offline/cache-policy.ts", "utf8");
const revision = createHash("sha256")
  .update(buildId + workerSource + policy)
  .digest("hex")
  .slice(0, 16);
const manifest = {
  cacheName: `pn-shell-${revision}`,
  assets,
  shells,
  optionalVisualAssets,
};
await writeFile(
  "public/offline/manifest.json",
  JSON.stringify(manifest, null, 2) + "\n",
);
await mkdir("artifacts/qa/ui-ai-v2", { recursive: true });
await writeFile(
  "artifacts/qa/ui-ai-v2/bundle.json",
  JSON.stringify(
    {
      buildId,
      optionalVisualChunks: visualChunks,
      optionalVisualGzipBytes: visualChunks.reduce(
        (sum, file) => sum + file.gzipBytes,
        0,
      ),
      budgetGzipBytes: 250000,
      excludedFromOfflinePrecache: true,
      precachedPosters: assets.filter((asset) => asset.endsWith(".webp")),
    },
    null,
    2,
  ) + "\n",
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
