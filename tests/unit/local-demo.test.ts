import { expect, it } from "vitest";
import { isLocalDemoEnvironment } from "../../src/contracts/local-demo";
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
