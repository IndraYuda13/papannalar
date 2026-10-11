import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

// Resolve the module in a child process so each case sees a controlled
// environment: PNL_APP_PORT / PNL_PROVIDER_PORT are read at import time.
function resolve(env: Record<string, string>) {
  const run = spawnSync(
    process.execPath,
    [
      "--input-type=module",
      "-e",
      'const m = await import("./tests/harness/ports.mjs"); console.log(JSON.stringify({ app: m.appPort, provider: m.providerPort, appOrigin: m.appOrigin, providerOrigin: m.providerOrigin }));',
    ],
    {
      cwd: process.cwd(),
      env: { ...process.env, PNL_APP_PORT: "", PNL_PROVIDER_PORT: "", ...env },
      encoding: "utf8",
    },
  );
  if (run.status !== 0)
    throw new Error("port resolution rejected the environment");
  return JSON.parse(run.stdout);
}

describe("local test/demo ports", () => {
  it("keeps the documented defaults when the overrides are unset", () => {
    expect(resolve({})).toEqual({
      app: 3100,
      provider: 54325,
      appOrigin: "http://127.0.0.1:3100",
      providerOrigin: "http://127.0.0.1:54325",
    });
  });
  it("applies each override independently", () => {
    expect(resolve({ PNL_APP_PORT: "3200" })).toMatchObject({ app: 3200 });
    expect(resolve({ PNL_PROVIDER_PORT: "55425" })).toMatchObject({
      provider: 55425,
    });
    expect(
      resolve({ PNL_APP_PORT: "3202", PNL_PROVIDER_PORT: "55427" }),
    ).toMatchObject({
      app: 3202,
      provider: 55427,
      appOrigin: "http://127.0.0.1:3202",
      providerOrigin: "http://127.0.0.1:55427",
    });
  });
  it("rejects a non-numeric or out-of-range port instead of guessing", () => {
    for (const value of ["abc", "0", "70000", "-1", "31.5"])
      expect(() => resolve({ PNL_APP_PORT: value })).toThrow();
  });
});
