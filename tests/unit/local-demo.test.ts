import { expect, it } from "vitest";
import {
  demoModeEnabled,
  demoSurfaceAllowed,
  isLocalDemoEnvironment,
  isLoopbackHostHeader,
  isProxiedRequest,
} from "../../src/contracts/local-demo";

const headers = (entries: Record<string, string>) => new Headers(entries);
const loopbackEnv = {
  demoMode: "1",
  localAdapter: "1",
  provider: "http://127.0.0.1:55425",
  origin: "http://127.0.0.1:3200",
};

it("local demo access requires explicit flag and exact isolated loopback origins", () => {
  expect(
    isLocalDemoEnvironment(
      "1",
      "http://127.0.0.1:54325",
      "http://127.0.0.1:3100",
    ),
  ).toBe(true);
  for (const [flag, url, origin] of [
    [undefined, "http://127.0.0.1:54325", "http://127.0.0.1:3100"],
    ["1", "https://app.supabase.co", "http://127.0.0.1:3100"],
    ["1", "http://127.0.0.1:54325", "https://papannalar.example"],
    ["1", "bad", "bad"],
    ["0", "http://127.0.0.1:54325", "http://127.0.0.1:3100"],
  ])
    expect(isLocalDemoEnvironment(flag, url, origin)).toBe(false);
});
it("local demo accepts an alternate loopback pair used by a staging instance", () => {
  expect(
    isLocalDemoEnvironment(
      "1",
      "http://127.0.0.1:55425",
      "http://127.0.0.1:3200",
    ),
  ).toBe(true);
  expect(
    isLocalDemoEnvironment(
      "1",
      "http://localhost:55425",
      "http://localhost:3200",
    ),
  ).toBe(true);
  expect(
    isLocalDemoEnvironment("1", "http://[::1]:55425", "http://[::1]:3200"),
  ).toBe(true);
});
it("local demo still rejects non-loopback, non-http and malformed origins", () => {
  for (const [flag, url, origin] of [
    // A LAN address is not loopback even though it is a private network.
    ["1", "http://127.0.0.1:54325", "http://192.168.1.5:3100"],
    ["1", "http://192.168.1.5:54325", "http://127.0.0.1:3100"],
    // A loopback host name prefixed onto a foreign domain must not pass.
    ["1", "http://127.0.0.1:54325", "http://127.0.0.1.evil.example:3100"],
    // Only http is a loopback origin: https on loopback is not the local adapter.
    ["1", "http://127.0.0.1:54325", "https://127.0.0.1:3100"],
    // Every non-"1" flag value, including the string "true", stays off.
    ["true", "http://127.0.0.1:54325", "http://127.0.0.1:3100"],
    ["", "http://127.0.0.1:54325", "http://127.0.0.1:3100"],
    // A pathname other than "/" is not a bare origin.
    ["1", "http://127.0.0.1:54325/supabase", "http://127.0.0.1:3100"],
    ["1", "http://127.0.0.1:54325", "http://127.0.0.1:3100/masuk"],
    // Credentials and query strings are not bare loopback origins.
    ["1", "http://user@127.0.0.1:54325", "http://127.0.0.1:3100"],
    ["1", "http://127.0.0.1:54325", "http://127.0.0.1:3100?x=1"],
  ])
    expect(isLocalDemoEnvironment(flag, url, origin)).toBe(false);
});
it("loopback host header accepts any loopback name with any port", () => {
  for (const host of [
    "127.0.0.1:3100",
    "127.0.0.1:3200",
    "127.0.0.1",
    "localhost:55425",
    "[::1]:3200",
    "LOCALHOST:3200",
  ])
    expect(isLoopbackHostHeader(host)).toBe(true);
});
it("loopback host header rejects foreign, malformed and smuggled values", () => {
  for (const host of [
    undefined,
    null,
    "",
    "evil.example:3100",
    "192.168.1.5:3100",
    "127.0.0.1.evil.example:3100",
    "user@127.0.0.1:3100",
    "127.0.0.1:3100,evil.example",
    "127.0.0.1:3100/../x",
  ])
    expect(isLoopbackHostHeader(host)).toBe(false);
});

// F-01/F-03: the single fail-closed gate every demo/sample surface must clear.
it("demoSurfaceAllowed requires an explicit opt-in flag and fails closed without it", () => {
  const loopbackHost = headers({ host: "127.0.0.1:3200" });
  expect(demoSurfaceAllowed({ headers: loopbackHost }, loopbackEnv)).toBe(true);
  // No flag -> 404, even on a perfect loopback config + request.
  expect(
    demoSurfaceAllowed(
      { headers: loopbackHost },
      { ...loopbackEnv, demoMode: undefined },
    ),
  ).toBe(false);
  for (const demoMode of ["", "true", "0", "yes"])
    expect(
      demoSurfaceAllowed({ headers: loopbackHost }, { ...loopbackEnv, demoMode }),
    ).toBe(false);
  expect(demoModeEnabled(undefined)).toBe(false);
  expect(demoModeEnabled("1")).toBe(true);
});
it("demoSurfaceAllowed refuses a proxied request (nginx X-Real-IP) even on a loopback host", () => {
  // A request that travelled through the public reverse proxy carries X-Real-IP
  // set to the true peer, so nginx's Host rewrite cannot smuggle it in.
  expect(
    demoSurfaceAllowed(
      { headers: headers({ host: "127.0.0.1:3100", "x-real-ip": "203.0.113.9" }) },
      loopbackEnv,
    ),
  ).toBe(false);
  expect(isProxiedRequest(headers({ "x-real-ip": "203.0.113.9" }))).toBe(true);
  expect(isProxiedRequest(headers({}))).toBe(false);
});
it("demoSurfaceAllowed refuses a non-loopback Host or non-loopback config pair", () => {
  expect(
    demoSurfaceAllowed(
      { headers: headers({ host: "evil.example" }) },
      loopbackEnv,
    ),
  ).toBe(false);
  expect(
    demoSurfaceAllowed(
      { headers: headers({ host: "127.0.0.1:3200" }) },
      { ...loopbackEnv, origin: "https://papannalar.example" },
    ),
  ).toBe(false);
  expect(
    demoSurfaceAllowed(
      { headers: headers({ host: "127.0.0.1:3200" }) },
      { ...loopbackEnv, provider: "https://app.supabase.co" },
    ),
  ).toBe(false);
  // The local-adapter flag alone must not enable the surface.
  expect(
    demoSurfaceAllowed(
      { headers: headers({ host: "127.0.0.1:3200" }) },
      { ...loopbackEnv, localAdapter: undefined },
    ),
  ).toBe(false);
});
