import { build } from "vite";

export default async function setup() {
  await build({
    configFile: false,
    publicDir: false,
    build: {
      target: "es2022",
      outDir: ".browser-tests",
      emptyOutDir: false,
      lib: {
        entry: "tests/browser/offline-fixture.ts",
        formats: ["iife"],
        name: "OfflineFixture",
        fileName: () => "offline-fixture.js",
      },
    },
  });
  await build({
    configFile: false,
    publicDir: false,
    build: {
      target: "es2022",
      outDir: ".browser-tests",
      emptyOutDir: false,
      lib: {
        entry: "tests/browser/sync-fixture.ts",
        formats: ["iife"],
        name: "SyncFixture",
        fileName: () => "sync-fixture.js",
      },
    },
  });
  await build({
    configFile: false,
    publicDir: false,
    build: {
      target: "es2022",
      outDir: ".browser-tests",
      emptyOutDir: false,
      lib: {
        entry: "tests/browser/card-photo.ts",
        formats: ["iife"],
        name: "CardPhoto",
        fileName: () => "card-photo.js",
      },
    },
  });
  await build({
    configFile: false,
    publicDir: false,
    build: {
      target: "es2022",
      outDir: ".browser-tests",
      emptyOutDir: false,
      lib: {
        entry: "tests/browser/exit-fixture.ts",
        formats: ["iife"],
        name: "ExitFixture",
        fileName: () => "exit-fixture.js",
      },
    },
  });
  await build({
    configFile: false,
    publicDir: false,
    build: {
      target: "es2022",
      outDir: ".browser-tests",
      emptyOutDir: false,
      lib: {
        entry: "tests/browser/turn-fixture.ts",
        formats: ["iife"],
        name: "TurnFixture",
        fileName: () => "turn-fixture.js",
      },
    },
  });
  await build({
    configFile: false,
    publicDir: false,
    build: {
      target: "es2022",
      outDir: ".browser-tests",
      emptyOutDir: false,
      lib: {
        entry: "tests/browser/oral-fixture.ts",
        formats: ["iife"],
        name: "OralFixture",
        fileName: () => "oral-fixture.js",
      },
    },
  });
  await build({
    configFile: false,
    publicDir: false,
    build: {
      target: "es2022",
      outDir: ".browser-tests",
      emptyOutDir: false,
      lib: {
        entry: "tests/browser/package-fixture.ts",
        formats: ["iife"],
        name: "PackageFixture",
        fileName: () => "package-fixture.js",
      },
    },
  });
  await build({
    configFile: false,
    publicDir: false,
    build: {
      target: "es2022",
      outDir: ".browser-tests",
      emptyOutDir: false,
      lib: {
        entry: "tests/browser/assessment-fixture.ts",
        formats: ["iife"],
        name: "AssessmentFixture",
        fileName: () => "assessment-fixture.js",
      },
    },
  });
  await build({
    configFile: false,
    publicDir: false,
    build: {
      target: "es2022",
      outDir: ".browser-tests",
      emptyOutDir: false,
      lib: {
        entry: "tests/browser/omr-fixture.ts",
        formats: ["iife"],
        name: "OmrFixture",
        fileName: () => "omr-fixture.js",
      },
    },
  });
  await build({
    configFile: false,
    publicDir: false,
    build: {
      target: "es2022",
      outDir: ".browser-tests",
      emptyOutDir: false,
      lib: {
        entry: "tests/browser/fixture.ts",
        formats: ["iife"],
        name: "PrivacyFixture",
        fileName: () => "fixture.js",
      },
    },
  });
}
