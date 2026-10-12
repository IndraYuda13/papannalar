import { afterEach, describe, expect, test, vi } from "vitest";

// The module under test is a server-only module; unit tests stub the marker
// package the same way the other server-module tests do.
vi.mock("server-only", () => ({}));

import { deliveredLoginLink } from "../../src/server/auth/delivered-link";

const FLAG = "PAPANNALAR_LOGIN_LINK_REVEAL";
const PROVIDER = "NEXT_PUBLIC_SUPABASE_URL";
const CODE = "0c30b054-2353-429e-80d5-7dd39791e593";

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env[FLAG];
  delete process.env[PROVIDER];
});

describe("deliveredLoginLink", () => {
  test("returns null without the operator opt-in", async () => {
    process.env[PROVIDER] = "http://127.0.0.1:54325";
    expect(await deliveredLoginLink("a@b.c")).toBeNull();
  });

  test("returns null when the flag is on but the provider is unset", async () => {
    process.env[FLAG] = "1";
    expect(await deliveredLoginLink("a@b.c")).toBeNull();
  });

  test("returns a same-site callback path when enabled", async () => {
    process.env[FLAG] = "1";
    process.env[PROVIDER] = "http://127.0.0.1:54325";
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            url: `http://127.0.0.1:3100/auth/callback?code=${CODE}`,
          }),
          { status: 200 },
        ),
    );
    vi.stubGlobal("fetch", fetchMock);
    expect(await deliveredLoginLink("a@b.c")).toBe(
      `/auth/callback?code=${CODE}`,
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:54325/__test/link?email=a%40b.c",
      { cache: "no-store" },
    );
  });

  test("refuses a foreign path and a malformed code", async () => {
    process.env[FLAG] = "1";
    process.env[PROVIDER] = "http://127.0.0.1:54325";
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              url: `http://127.0.0.1:3100/guru?code=${CODE}`,
            }),
            { status: 200 },
          ),
      ),
    );
    expect(await deliveredLoginLink("a@b.c")).toBeNull();

    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              url: "http://127.0.0.1:3100/auth/callback?code=not-a-uuid",
            }),
            { status: 200 },
          ),
      ),
    );
    expect(await deliveredLoginLink("a@b.c")).toBeNull();
  });
});
