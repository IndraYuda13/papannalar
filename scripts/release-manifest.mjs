import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";

// Explicit source roots: never include .env.local, databases, browser profiles,
// auth callbacks, test mailboxes, or a teacher's IndexedDB export.
const roots = [
  "src",
  "scripts",
  "tests",
  "supabase/migrations",
  "supabase/tests",
  "supabase/rollback",
  "supabase/config.toml",
  ".github",
  "docs",
  "public/fonts",
  "AGENTS.md",
  "README.md",
  ".env.example",
  ".gitignore",
  ".node-version",
  ".prettierignore",
  ".prettierrc.json",
  "components.json",
  "eslint.config.mjs",
  "next-env.d.ts",
  "next.config.ts",
  "package.json",
  "playwright.config.ts",
  "pnpm-lock.yaml",
  "pnpm-workspace.yaml",
  "postcss.config.mjs",
  "tsconfig.json",
  "vitest.config.ts",
];
const sha256 = (content) => createHash("sha256").update(content).digest("hex");
const slash = (value) => value.split(path.sep).join("/");
async function filesAt(root) {
  if ((await stat(root)).isFile()) return [root];
  return (await readdir(root, { recursive: true, withFileTypes: true }))
    .filter((entry) => entry.isFile())
    .map((entry) => slash(path.join(entry.parentPath, entry.name)));
}
async function hashFile(file) {
  const content = await readFile(file);
  return { file: slash(file), bytes: content.length, sha256: sha256(content) };
}
const sourcePaths = (await Promise.all(roots.map(filesAt))).flat().sort();
const source = await Promise.all(sourcePaths.map(hashFile));
const pkg = JSON.parse(await readFile("package.json", "utf8"));
const offline = JSON.parse(
  await readFile("public/offline/manifest.json", "utf8"),
);
const assetPaths = [
  ...offline.assets.map((asset) =>
    asset.startsWith("/_next/")
      ? `.next/${asset.slice("/_next/".length)}`
      : asset === "/icon.svg"
        ? ".next/server/app/icon.svg.body"
        : `public${asset}`,
  ),
  ...Object.values(offline.shells).map((asset) => `public${asset}`),
  "public/sw.js",
  "public/offline/manifest.json",
];
const assets = await Promise.all(assetPaths.sort().map(hashFile));
const rehearsals = [];
for (const run of [1, 2, 3]) {
  try {
    rehearsals.push(
      JSON.parse(
        await readFile(`artifacts/qa/M17/run-${run}/result.json`, "utf8"),
      ),
    );
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}
const buildId = (await readFile(".next/BUILD_ID", "utf8")).trim();
if (rehearsals.some((r) => r.status !== "PASS" || r.buildId !== buildId))
  throw new Error("All three rehearsals must pass on the current build");
const coverage = JSON.parse(
  await readFile("coverage/coverage-summary.json", "utf8"),
);
const demoAssets = await Promise.all(
  [
    ...["initial", "weekly", "exit"].map(
      (kind) => `artifacts/qa/M03/m03a/${kind}.pdf`,
    ),
    "artifacts/qa/M06/independent-grade-7.pdf",
    ...rehearsals.map(
      (r) => `artifacts/qa/M17/run-${r.run}/local-rehearsal.webm`,
    ),
  ].map(hashFile),
);
const manifest = {
  kind: "LOCAL_SOFTWARE_CANDIDATE_NOT_PILOT_APPROVAL",
  generatedAt: new Date().toISOString(),
  baseCommit: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim(),
  workingTree:
    "Uncommitted implementation; source hashes identify actual files",
  buildId,
  cacheName: offline.cacheName,
  runtime: pkg.engines.node,
  packageManager: pkg.packageManager,
  dependencies: pkg.dependencies,
  devDependencies: pkg.devDependencies,
  sourceSha256: sha256(source.map((f) => `${f.file}\0${f.sha256}\n`).join("")),
  source,
  assets,
  demoAssets,
  migrations: source.filter((f) => f.file.startsWith("supabase/migrations/")),
  coverage: coverage.total,
  rehearsalStatus:
    rehearsals.length === 3 ? "PASS_LOCAL_SOFTWARE" : "NOT_RUN_OR_INCOMPLETE",
  rehearsals,
  claims: {
    requiredFeatures: [
      "F1",
      "F2",
      "F3",
      "F4",
      "F5",
      "F6",
      "F7",
      "F8",
      "F16",
      "F17",
      "F18",
      "F19",
      "F20",
    ],
    evidence: "artifacts/qa/M15/feature-audit.md and verification logs",
    optionalFeatures:
      "F9-F13 deferred; F14/F15 and four extra tools outside MVP",
    scope:
      "22 assessment steps, six interactive tools; not full interactive coverage of all steps (K01)",
    simulation:
      "500 classes: 2 Pilots/3 sessions 97.4%; 1 Pilot/4 sessions 77.2%; not physical measurements",
    external: {
      physicalCameraPrintTouchLatency: "NOT_RUN",
      hostedAuthRealtimeStaging: "NOT_RUN",
      liveAI: "NOT_RUN",
      contentAndPrivacyReview: "NEEDS_REVIEW",
      schoolParentConsentPilot: "NOT_RUN",
      stageSixMinuteRehearsalFlashDrive: "NOT_RUN",
      scheduledOctoberSubmissionFreeze:
        "NOT_RUN; current snapshot is September 30",
    },
  },
};
await mkdir("artifacts/releases/local-final-mvp", { recursive: true });
await writeFile(
  "artifacts/releases/local-final-mvp/manifest.json",
  JSON.stringify(manifest, null, 2) + "\n",
);
console.log(
  JSON.stringify({
    buildId,
    sourceSha256: manifest.sourceSha256,
    files: source.length,
    assets: assets.length,
    migrations: manifest.migrations.length,
  }),
);
