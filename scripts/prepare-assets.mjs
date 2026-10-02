import { copyFile, mkdir } from "node:fs/promises";
import { build } from "vite";
await mkdir("public/fonts", { recursive: true });
await build({
  configFile: false,
  publicDir: false,
  build: {
    target: "es2022",
    outDir: "public",
    emptyOutDir: false,
    lib: {
      entry: "src/workers/omr/worker.ts",
      formats: ["iife"],
      name: "PapanNalarOmr",
      fileName: () => "omr-worker.js",
    },
  },
});
// Project's pinned OFL font package, never copied from the agent/tool environment.
await copyFile(
  "node_modules/@fontsource/atkinson-hyperlegible/files/atkinson-hyperlegible-latin-400-normal.woff",
  "public/fonts/atkinson-card.woff",
);
await copyFile(
  "node_modules/@fontsource/atkinson-hyperlegible/LICENSE",
  "public/fonts/Atkinson-LICENSE.txt",
);
