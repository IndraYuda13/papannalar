import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const privateLayers = [
  "@/server/**",
  "@/local/**",
  "@/features/guru/**",
  "**/server/**",
  "**/local/**",
  "**/features/guru/**",
];
const localIdentity = [
  "@/local/names",
  "**/local/names",
  "./names",
  "../names",
];

export default defineConfig([
  ...nextVitals,
  ...nextTypescript,
  globalIgnores([
    ".next/**",
    ".local/**",
    "next-env.d.ts",
    "artifacts/**",
    "test-results/**",
    "playwright-report/**",
    "coverage/**",
    ".browser-tests/**",
    "public/sw.js",
    "public/omr-worker.js",
  ]),
  {
    files: ["src/**/*.{ts,tsx}"],
    rules: { "@typescript-eslint/no-explicit-any": "error" },
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/features/guru/**", "src/local/names.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: localIdentity,
              message:
                "Nama lokal hanya boleh dibaca boundary UI guru/CSV lokal.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/contracts/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              regex:
                "^(?!(?:zod$|\\./[^/]+$|\\.\\./core/|\\.\\./content/(?:ladder|templates|contexts|strategies)/)).+",
              message:
                "Kontrak tidak mengimpor UI, storage atau adapter jaringan.",
            },
          ],
        },
      ],
      "no-restricted-globals": [
        "error",
        "fetch",
        "WebSocket",
        "XMLHttpRequest",
      ],
    },
  },
  {
    files: ["src/local/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-globals": [
        "error",
        "fetch",
        "WebSocket",
        "XMLHttpRequest",
        "navigator",
      ],
    },
  },
  {
    files: ["src/core/**/*.{ts,tsx}", "src/content/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              regex: "^(?!(?:\\.{1,2}/|@/core/|@/content/ladder/)).+",
              message:
                "Core harus murni: tanpa framework, provider atau adapter.",
            },
            {
              group: [
                ...privateLayers,
                "@/ui/**",
                "@/app/**",
                "@/features/**",
                "@/contracts/**",
                "**/ui/**",
                "**/app/**",
                "**/features/**",
                "**/contracts/**",
              ],
              message: "Core tidak bergantung pada UI, storage atau network.",
            },
          ],
        },
      ],
      "no-restricted-globals": [
        "error",
        "fetch",
        "WebSocket",
        "XMLHttpRequest",
        "window",
        "document",
        "navigator",
        "Date",
        "crypto",
        "setTimeout",
        "setInterval",
      ],
      "no-restricted-properties": [
        "error",
        {
          object: "Math",
          property: "random",
          message: "Core deterministik memerlukan input/seed eksplisit.",
        },
      ],
    },
  },
  {
    files: ["src/app/layar/**/*.{ts,tsx}", "src/features/layar/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                ...privateLayers,
                "@/core/bkt/**",
                "@/core/placement/**",
                "@/core/groups/**",
              ],
              message:
                "Layar Kelas hanya memakai kontrak publik; data guru tetap privat.",
            },
          ],
        },
      ],
    },
  },
]);
