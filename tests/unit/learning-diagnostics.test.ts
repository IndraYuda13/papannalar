import { it, expect } from "vitest";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  diagnosticDatabase,
  writeDiagnostic,
} from "../../scripts/learning-diagnostics.mjs";
const env = {
  TEST_DATABASE_URL: "postgresql://postgres@127.0.0.1:56789/pn_m01c_fixture",
  PNL_TEST_CLUSTER_ID: "123456",
};
it("uses configurable loopback isolated database and requires cluster identity", () => {
  expect(diagnosticDatabase(env).port).toBe("56789");
  for (const TEST_DATABASE_URL of [
    "postgresql://postgres@remote:56789/pn_m01c_fixture",
    "postgresql://postgres@127.0.0.1:55432/pn_m01c_fixture",
    "postgresql://postgres@127.0.0.1:56789/production",
    "http://127.0.0.1:56789/pn_m01c_fixture",
    "",
  ])
    expect(() => diagnosticDatabase({ ...env, TEST_DATABASE_URL })).toThrow();
  expect(() =>
    diagnosticDatabase({ ...env, PNL_TEST_CLUSTER_ID: "" }),
  ).toThrow();
});
it("writes configurable evidence without host-specific output and rejects traversal", async () => {
  const dir = await mkdtemp(join(tmpdir(), "pn-diagnostic-"));
  try {
    await writeDiagnostic(
      "probe.json",
      { actual: true },
      { PNL_EVIDENCE_DIR: dir },
    );
    expect(JSON.parse(await readFile(join(dir, "probe.json"), "utf8"))).toEqual(
      { actual: true },
    );
    await expect(
      writeDiagnostic("../probe.json", {}, { PNL_EVIDENCE_DIR: dir }),
    ).rejects.toThrow();
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
