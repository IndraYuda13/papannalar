import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";
vi.mock("server-only", () => ({}));
const auth = vi.hoisted(() => ({ require: vi.fn() }));
vi.mock("../../src/server/auth/client", () => ({
  authContext: () => ({ finish: (r: NextResponse) => r }),
  requireTeacher: auth.require,
}));
import { proxy } from "../../src/proxy";
import {
  capturePairingLink,
  pendingPairingCode,
  clearPairingLink,
  PAIRING_CHALLENGE_COOKIE,
} from "../../src/features/classroom/pairing-url";
const origin = "https://kelas.example",
  start = Date.parse("2026-09-30T10:00:00Z");
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(start);
  vi.stubEnv("APP_ORIGIN", origin);
  auth.require.mockRejectedValue(new Error("UNAUTHENTICATED"));
});
afterEach(() => {
  clearPairingLink();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.useRealTimers();
});
function browserCookie(value: string) {
  let cookie = value;
  const storage = new Map<string, string>();
  vi.stubGlobal("document", {
    get cookie() {
      return cookie;
    },
    set cookie(next: string) {
      cookie = next.includes("Max-Age=0") ? "" : next;
    },
  });
  vi.stubGlobal("sessionStorage", {
    getItem: (k: string) => storage.get(k) ?? null,
    setItem: (k: string, v: string) => storage.set(k, v),
    removeItem: (k: string) => storage.delete(k),
  });
  vi.stubGlobal("window", { location: { href: `${origin}/guru` } });
  return () => cookie;
}
describe("native QR survives the fixed login redirect without a token or open redirect", () => {
  it("keeps a short challenge before login and consumes it after authentication with the original expiry", async () => {
    const response = await proxy(new NextRequest(`${origin}/guru?pair=012345`));
    expect(response.headers.get("location")).toBe(`${origin}/masuk`);
    const cookie = response.cookies.get(PAIRING_CHALLENGE_COOKIE);
    expect(cookie?.value).toBe(`012345.${start + 300_000}`);
    expect(cookie).toMatchObject({
      maxAge: 300,
      path: "/",
      sameSite: "lax",
      secure: true,
      httpOnly: false,
    });
    expect(response.headers.get("Referrer-Policy")).toBe("no-referrer");
    const currentCookie = browserCookie(
      `${PAIRING_CHALLENGE_COOKIE}=${cookie!.value}`,
    );
    vi.advanceTimersByTime(120_000);
    expect(capturePairingLink()).toBe("012345");
    expect(currentCookie()).toBe("");
    vi.advanceTimersByTime(179_999);
    expect(pendingPairingCode()).toBe("012345");
    vi.advanceTimersByTime(1);
    expect(pendingPairingCode()).toBeNull();
  });
  it("does not carry extra redirect parameters, duplicate codes or malformed values", async () => {
    for (const search of [
      "?pair=123456&next=https://evil.example",
      "?pair=123456&pair=654321",
      "?pair=12345",
    ]) {
      const response = await proxy(new NextRequest(`${origin}/guru${search}`));
      expect(response.headers.get("location")).toBe(`${origin}/masuk`);
      expect(response.cookies.get(PAIRING_CHALLENGE_COOKIE)?.maxAge).toBe(0);
    }
  });
  it("ignores expired or forged far-future prefills and removes the cookie", () => {
    for (const value of [
      `123456.${start - 1}`,
      `123456.${start + 900_000}`,
      "https://evil.example",
    ]) {
      const cookie = browserCookie(`${PAIRING_CHALLENGE_COOKIE}=${value}`);
      expect(capturePairingLink()).toBeNull();
      expect(cookie()).toBe("");
    }
  });
  it("retains the authenticated route and only stores the nonsecret challenge", async () => {
    auth.require.mockResolvedValue({ id: "teacher" });
    const response = await proxy(new NextRequest(`${origin}/guru?pair=123456`));
    expect(response.headers.get("location")).toBeNull();
    expect(response.cookies.getAll()).toHaveLength(1);
    expect(response.cookies.getAll()[0].name).toBe(PAIRING_CHALLENGE_COOKIE);
  });
});
