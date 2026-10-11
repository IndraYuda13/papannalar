import { expect, it } from "vitest";
import {
  isLocalDemoEnvironment,
  isLoopbackHostHeader,
} from "../../src/contracts/local-demo";
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
