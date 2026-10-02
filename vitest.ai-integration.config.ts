import { defineConfig } from "vitest/config";
export default defineConfig({
  test: {
    environment: "node",
    maxWorkers: 1,
    include: ["tests/integration/**/*.test.ts"],
    testTimeout: 30000,
  },
});
