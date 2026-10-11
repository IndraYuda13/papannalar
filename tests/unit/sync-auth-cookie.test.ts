import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
vi.mock("server-only", () => ({}));
// Resolve the route files' Next alias without changing shared config.
vi.mock("@/contracts/domain", () => import("../../src/contracts/domain"));

// T2-04: a Supabase SSR client that rotates the auth cookie during getUser()
// (the TOKEN_REFRESHED path calls options.cookies.setAll). The route must emit
// the rotated Set-Cookie through ctx.finish() even on an error response.
const rotate = vi.hoisted(() => ({
  teacher: vi.fn(),
}));
vi.mock("@supabase/ssr", () => ({
  createServerClient: (
    _url: string,
    _key: string,
    options: {
      cookieOptions?: { name?: string };
      cookies?: {
        setAll?: (
          cookies: { name: string; value: string; options: object }[],
          headers: Record<string, string>,
        ) => void;
      };
    },
  ) => {
    const name = options.cookieOptions?.name ?? "pn-teacher-auth";
    return {
      auth: {
        getUser: async () => {
          options.cookies?.setAll?.(
            [{ name, value: "ROTATED-SESSION-VALUE", options: {} }],
            { "Cache-Control": "private, no-store" },
          );
          const user = rotate.teacher();
          return user
            ? {
                data: {
                  user: {
                    id: "aaaaaaaa-0000-4000-8000-000000000001",
                    email: "teacher@qa.invalid",
                    is_anonymous: false,
                  },
                },
                error: null,
              }
            : { data: { user: null }, error: { status: 401 } };
        },
        getSession: async () => ({ data: { session: null } }),
      },
      rpc: async () => ({ data: null, error: null }),
      from: () => ({
        select: () => ({
          eq: () => ({ order: async () => ({ data: [], error: null }) }),
        }),
      }),
    };
  },
}));

import { GET, POST } from "../../src/app/api/v1/sync/route";
import { POST as TAKEOVER } from "../../src/app/api/v1/sync/takeover/route";

const ORIGIN = "http://127.0.0.1:3100";
const request = (path: string, init: { method: string; body?: string }) =>
  new NextRequest(`${ORIGIN}${path}`, {
    ...init,
    headers: {
      Origin: ORIGIN,
      "Content-Type": "application/json",
      host: "127.0.0.1:3100",
    },
  });
const rotated = (response: Response) =>
  response.headers
    .getSetCookie()
    .filter((cookie) => cookie.startsWith("pn-teacher-auth"));

beforeEach(() => {
  vi.stubEnv("APP_ORIGIN", ORIGIN);
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:55425");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "unit-test-key");
  rotate.teacher.mockReturnValue(true);
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("T2-04 rotated auth cookie is emitted on sync error paths", () => {
  it("POST /api/v1/sync with an invalid body returns 422 and keeps the rotated cookie", async () => {
    const response = await POST(
      request("/api/v1/sync", { method: "POST", body: "{}" }),
    );
    expect(response.status).toBe(422);
    expect(await response.clone().json()).toEqual({
      error: { code: "INVALID_INPUT" },
    });
    expect(rotated(response)).toHaveLength(1);
    expect(rotated(response)[0]).toContain("ROTATED-SESSION-VALUE");
  });
  it("GET /api/v1/sync with a malformed classId returns 422 and keeps the rotated cookie", async () => {
    const response = await GET(
      request("/api/v1/sync?classId=not-a-uuid", { method: "GET" }),
    );
    expect(response.status).toBe(422);
    expect(rotated(response)).toHaveLength(1);
  });
  it("POST /api/v1/sync/takeover with an invalid body returns 422 and keeps the rotated cookie", async () => {
    const response = await TAKEOVER(
      request("/api/v1/sync/takeover", { method: "POST", body: "{}" }),
    );
    expect(response.status).toBe(422);
    expect(rotated(response)).toHaveLength(1);
  });
  it("still authenticates: an unauthenticated caller gets 401, not an oracle", async () => {
    rotate.teacher.mockReturnValue(false);
    const response = await POST(
      request("/api/v1/sync", {
        method: "POST",
        body: JSON.stringify({ mutations: [] }),
      }),
    );
    expect(response.status).toBe(401);
  });
});
