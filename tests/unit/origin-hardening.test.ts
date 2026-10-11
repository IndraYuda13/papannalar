import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
vi.mock("server-only", () => ({}));
import {
  acceptedOrigins,
  applicationOrigin,
} from "../../src/server/auth/origin";
import { clientAddress } from "../../src/server/http";

const request = (url: string, headers: Record<string, string> = {}) =>
  new NextRequest(url, { method: "POST", headers });

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("applicationOrigin (F-02)", () => {
  it("prefers PUBLIC_APP_ORIGIN over APP_ORIGIN, then falls back to the request", () => {
    vi.stubEnv("APP_ORIGIN", "http://127.0.0.1:3100");
    vi.stubEnv("PUBLIC_APP_ORIGIN", "https://papannalar.indrayuda.my.id");
    expect(applicationOrigin(request("http://127.0.0.1:3100/api"))).toBe(
      "https://papannalar.indrayuda.my.id",
    );
    vi.stubEnv("PUBLIC_APP_ORIGIN", "");
    expect(applicationOrigin(request("http://127.0.0.1:3100/api"))).toBe(
      "http://127.0.0.1:3100",
    );
    vi.stubEnv("APP_ORIGIN", "");
    expect(
      applicationOrigin(
        request("http://127.0.0.1:3100/api", { host: "127.0.0.1:3100" }),
      ),
    ).toBe("http://127.0.0.1:3100");
  });
});

describe("acceptedOrigins (F-02/F-05/F-09)", () => {
  it("includes the configured internal origin and the request's own origin", () => {
    vi.stubEnv("APP_ORIGIN", "http://127.0.0.1:3100");
    vi.stubEnv("PUBLIC_APP_ORIGIN", "");
    const got = acceptedOrigins(
      request("http://127.0.0.1:3100/api", { host: "127.0.0.1:3100" }),
    );
    expect(got).toEqual(["http://127.0.0.1:3100"]);
  });
  it("accepts both the internal and the browser-visible origin when they differ", () => {
    vi.stubEnv("APP_ORIGIN", "http://127.0.0.1:3100");
    vi.stubEnv("PUBLIC_APP_ORIGIN", "");
    const got = acceptedOrigins(
      request("https://papannalar.example/api", { host: "papannalar.example" }),
    );
    expect(new Set(got)).toEqual(
      new Set(["http://127.0.0.1:3100", "https://papannalar.example"]),
    );
  });
});

describe("clientAddress (F-04)", () => {
  it("prefers the proxy-set X-Real-IP over client-supplied X-Forwarded-For", () => {
    expect(
      clientAddress(
        request("http://127.0.0.1/api", {
          "x-real-ip": "203.0.113.7",
          "x-forwarded-for": "10.9.9.9, 203.0.113.7",
        }),
      ),
    ).toBe("203.0.113.7");
  });
  it("takes the right-most X-Forwarded-For entry, never the spoofable first", () => {
    // An attacker sets the left-most entry; our proxy appends the true peer.
    expect(
      clientAddress(
        request("http://127.0.0.1/api", {
          "x-forwarded-for": "1.2.3.4, 203.0.113.7",
        }),
      ),
    ).toBe("203.0.113.7");
  });
  it("returns a shared bucket when neither header is present", () => {
    expect(clientAddress(request("http://127.0.0.1/api"))).toBe("unknown");
    expect(
      clientAddress(request("http://127.0.0.1/api", { "x-forwarded-for": "" })),
    ).toBe("unknown");
  });
});
