import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { id } from "../fixtures/placement";
vi.mock("server-only", () => ({}));
// Resolve the parent helper's existing Next alias without changing shared config.
vi.mock("@/contracts/domain", () => import("../../src/contracts/domain"));
const mock = vi.hoisted(() => ({
  rpc: vi.fn(),
  user: vi.fn(),
  signOut: vi.fn(),
  lock: vi.fn(),
}));
vi.mock("../../src/server/auth/client", () => ({
  authContext: () => ({
    client: {
      rpc: mock.rpc,
      auth: { getUser: mock.user, signOut: mock.signOut },
    },
    finish: (r: NextResponse) => r,
  }),
}));
vi.mock("../../src/local/access", () => ({ lockLocalAccess: mock.lock }));
import { POST } from "../../src/app/auth/logout/route";

const origin = "https://kelas.example";
function request(body?: unknown, requestOrigin: string | null = origin) {
  const headers = new Headers({
    Cookie: `pn-teacher-auth=teacher; pn-teacher-auth.0=chunk; pn-sample-controller=${id(20)}; pn-pair-challenge=123456; pn-board-auth=board; pn-teacher-auth-flow-abcdefgh-code-verifier=pending; pn-teacher-auth-flows-code-verifier=pending-index`,
  });
  if (requestOrigin) headers.set("Origin", requestOrigin);
  if (body !== undefined) headers.set("Content-Type", "application/json");
  return new NextRequest(`${origin}/auth/logout`, {
    method: "POST",
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("APP_ORIGIN", origin);
  mock.user.mockResolvedValue({
    data: {
      user: { id: id(1), email: "unit@qa.invalid", is_anonymous: false },
    },
    error: null,
  });
  mock.rpc.mockResolvedValue({ data: { ok: true, revoked: 1 }, error: null });
  mock.signOut.mockResolvedValue({ error: null });
  mock.lock.mockResolvedValue(undefined);
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("logout route scopes revocation before clearing this auth session", () => {
  it("passes only the tab UUID and validated HTTP cookie before local signOut", async () => {
    const response = await POST(request({ controllerId: id(2) }));
    expect(response.status).toBe(200);
    expect(mock.rpc).toHaveBeenCalledExactlyOnceWith("presentation_logout", {
      p_controller_id: id(2),
      p_sample_controller: id(20),
    });
    expect(mock.rpc.mock.invocationCallOrder[0]).toBeLessThan(
      mock.signOut.mock.invocationCallOrder[0],
    );
    expect(mock.signOut).toHaveBeenCalledWith({ scope: "local" });
    expect(response.cookies.get("pn-teacher-auth")?.maxAge).toBe(0);
    expect(response.cookies.get("pn-sample-controller")?.maxAge).toBe(0);
    expect(response.cookies.get("pn-pair-challenge")?.maxAge).toBe(0);
    expect(
      response.cookies.get("pn-teacher-auth-flow-abcdefgh-code-verifier")
        ?.maxAge,
    ).toBe(0);
    expect(
      response.cookies.get("pn-teacher-auth-flows-code-verifier")?.maxAge,
    ).toBe(0);
    expect(response.cookies.get("pn-board-auth")).toBeUndefined();
  });
  it("allows an observer's DB no-op without acquiring sample control", async () => {
    mock.rpc.mockResolvedValue({ data: { ok: true, revoked: 0 }, error: null });
    expect((await POST(request({ controllerId: id(3) }))).status).toBe(200);
    expect(mock.rpc).toHaveBeenCalledTimes(1);
    expect(mock.rpc.mock.calls[0]?.[0]).toBe("presentation_logout");
  });
  it("never interprets a missing controller ID as account-wide revocation", async () => {
    expect((await POST(request())).status).toBe(200);
    expect((await POST(request({}))).status).toBe(200);
    expect(mock.rpc).not.toHaveBeenCalled();
    expect(mock.user).not.toHaveBeenCalled();
  });
  it.each([
    null,
    { controllerId: "other" },
    { controllerId: id(2), sampleController: id(20) },
    { ownerId: id(1) },
  ])(
    "rejects malformed or overbroad input %j before any mutation",
    async (body) => {
      expect((await POST(request(body))).status).toBe(422);
      expect(mock.rpc).not.toHaveBeenCalled();
      expect(mock.signOut).not.toHaveBeenCalled();
    },
  );
  it.each([null, "https://other.example"])(
    "requires the exact application origin (%s)",
    async (requestOrigin) => {
      expect(
        (await POST(request({ controllerId: id(2) }, requestOrigin))).status,
      ).toBe(403);
      expect(mock.rpc).not.toHaveBeenCalled();
      expect(mock.signOut).not.toHaveBeenCalled();
    },
  );
  it("keeps auth available for revocation retry on a DB failure", async () => {
    mock.rpc.mockResolvedValue({
      data: null,
      error: { message: "not logged" },
    });
    const response = await POST(request({ controllerId: id(2) }));
    expect(response.status).toBe(503);
    expect(mock.signOut).not.toHaveBeenCalled();
    expect(response.cookies.getAll()).toHaveLength(0);
    expect(await response.json()).toEqual({ error: { code: "UNAVAILABLE" } });
  });
  it("does not discard a pending revoke when the auth provider is unavailable", async () => {
    mock.user.mockResolvedValue({
      data: { user: null },
      error: { status: 503 },
    });
    expect((await POST(request({ controllerId: id(2) }))).status).toBe(503);
    expect(mock.rpc).not.toHaveBeenCalled();
    expect(mock.signOut).not.toHaveBeenCalled();
  });
  it("clears an already expired login without pretending it can revoke a grant", async () => {
    mock.user.mockResolvedValue({
      data: { user: null },
      error: { status: 401 },
    });
    expect((await POST(request({ controllerId: id(2) }))).status).toBe(200);
    expect(mock.rpc).not.toHaveBeenCalled();
    expect(mock.signOut).toHaveBeenCalledWith({ scope: "local" });
  });
  it("still clears device cookies if signOut fails after confirmed revocation", async () => {
    mock.signOut.mockRejectedValue(new Error("unavailable"));
    const response = await POST(request({ controllerId: id(2) }));
    expect(response.status).toBe(200);
    expect(response.cookies.get("pn-teacher-auth")?.maxAge).toBe(0);
  });
});

function browser() {
  const storage = new Map<string, string>([
    ["pn-presentation-controller-v1", id(2)],
  ]);
  vi.stubGlobal("sessionStorage", {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
  });
  vi.stubGlobal("navigator", { onLine: true });
  vi.stubGlobal("document", { cookie: "pn-pair-challenge=123456" });
  return storage;
}
describe("logout helper retains the original tab identity until server revocation succeeds", () => {
  it("locks first, sends a strict body and clears identity only after success", async () => {
    vi.resetModules();
    const storage = browser();
    const fetcher = vi.fn(async () => new Response('{"signedOut":true}'));
    vi.stubGlobal("fetch", fetcher);
    const { logoutTeacher } =
      await import("../../src/features/classroom/logout-transport");
    await logoutTeacher();
    expect(mock.lock.mock.invocationCallOrder[0]).toBeLessThan(
      fetcher.mock.invocationCallOrder[0],
    );
    expect(fetcher.mock.calls[0]).toMatchObject([
      "/auth/logout",
      { method: "POST", body: JSON.stringify({ controllerId: id(2) }) },
    ]);
    expect(mock.lock).toHaveBeenLastCalledWith(false);
    expect(storage.has("pn-presentation-controller-v1")).toBe(false);
    expect(storage.has("pn-presentation-logout-v1")).toBe(false);
  });
  it("retries offline logout after reload with the original UUID, not a new grant", async () => {
    vi.resetModules();
    const storage = browser();
    vi.stubGlobal("navigator", { onLine: false });
    const fetcher = vi.fn(async () => new Response('{"signedOut":true}'));
    vi.stubGlobal("fetch", fetcher);
    const first = await import("../../src/features/classroom/logout-transport");
    await expect(first.logoutTeacher()).rejects.toThrow("LOGOUT_PENDING");
    expect(fetcher).not.toHaveBeenCalled();
    expect(storage.get("pn-presentation-logout-v1")).toBe(id(2));
    expect(mock.lock).not.toHaveBeenCalledWith(false);
    storage.set("pn-presentation-controller-v1", id(4));
    vi.resetModules();
    vi.stubGlobal("navigator", { onLine: true });
    const recovered =
      await import("../../src/features/classroom/logout-transport");
    await recovered.logoutTeacher();
    expect(fetcher.mock.calls[0]).toMatchObject([
      "/auth/logout",
      { body: JSON.stringify({ controllerId: id(2) }) },
    ]);
  });
  it("does not unlock or forget the grant on a rejected server response; parallel calls share one request", async () => {
    vi.resetModules();
    const storage = browser();
    const fetcher = vi.fn(async () => new Response("{}", { status: 503 }));
    vi.stubGlobal("fetch", fetcher);
    const { logoutTeacher } =
      await import("../../src/features/classroom/logout-transport");
    const first = logoutTeacher(),
      second = logoutTeacher();
    expect(first).toBe(second);
    await expect(first).rejects.toThrow("LOGOUT_PENDING");
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(storage.get("pn-presentation-controller-v1")).toBe(id(2));
    expect(mock.lock).not.toHaveBeenCalledWith(false);
  });
  it("a different tab completing the shared local lock retries the originating controller only", async () => {
    vi.resetModules();
    const storage = browser();
    const shared = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => shared.get(key) ?? null,
      setItem: (key: string, value: string) => shared.set(key, value),
      removeItem: (key: string) => shared.delete(key),
    });
    vi.stubGlobal("navigator", { onLine: false });
    const first = await import("../../src/features/classroom/logout-transport");
    await expect(first.logoutTeacher()).rejects.toThrow("LOGOUT_PENDING");
    storage.clear();
    storage.set("pn-presentation-controller-v1", id(5));
    vi.resetModules();
    vi.stubGlobal("navigator", { onLine: true });
    const fetcher = vi.fn(async () => new Response('{"signedOut":true}'));
    vi.stubGlobal("fetch", fetcher);
    const other = await import("../../src/features/classroom/logout-transport");
    await other.logoutTeacher();
    expect(fetcher.mock.calls[0]).toMatchObject([
      "/auth/logout",
      { body: JSON.stringify({ controllerId: id(2) }) },
    ]);
    expect(shared.size).toBe(0);
  });
});
