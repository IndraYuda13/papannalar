import { afterEach, describe, expect, it, vi } from "vitest";
import {
  pairingUrl,
  parsePairingCode,
  capturePairingLink,
  pendingPairingCode,
  clearPairingLink,
} from "../../src/features/classroom/pairing-url";
const origin = "https://kelas.example";
afterEach(() => {
  clearPairingLink();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
describe("safe native-camera and in-app QR contract", () => {
  it("contains only the app origin and six-digit short challenge", () => {
    expect(pairingUrl(origin, "012345")).toBe(`${origin}/guru?pair=012345`);
    expect(parsePairingCode(`${origin}/guru?pair=012345`, origin)).toBe(
      "012345",
    );
    expect(parsePairingCode(" 012345 ", origin)).toBe("012345");
  });
  it.each([
    "http://kelas.example",
    "http://127.0.0.1:3100",
    "https://127.0.0.1",
    "https://localhost",
    "https://[::1]",
    "https://foo.localhost",
    "https://user:password@kelas.example",
    "javascript:alert(1)",
  ])("does not put %s in a phone QR", (value) => {
    expect(pairingUrl(value, "123456")).toBeNull();
  });
  it.each([
    "https://evil.example/guru?pair=123456",
    "https://kelas.example.evil.example/guru?pair=123456",
    "https://kelas.example/guru?pair=123456&token=SECRET",
    "https://kelas.example/guru?pair=123456&pair=654321",
    "https://kelas.example/guru?pair=123456#secret",
    "https://kelas.example/guru?pair=12345",
    "https://kelas.example/redirect?pair=123456",
    "https://user@kelas.example/guru?pair=123456",
    "//kelas.example/guru?pair=123456",
    "javascript:alert(1)",
  ])("rejects untrusted decoded text %s without navigation", (value) => {
    expect(parsePairingCode(value, origin)).toBeNull();
  });
  it("captures native link once, scrubs the URL and expires it through login/navigation", () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    const data = new Map<string, string>();
    vi.stubGlobal("sessionStorage", {
      getItem: (k: string) => data.get(k) ?? null,
      setItem: (k: string, v: string) => data.set(k, v),
      removeItem: (k: string) => data.delete(k),
    });
    const replaceState = vi.fn();
    vi.stubGlobal("window", {
      location: { href: `${origin}/guru?pair=012345` },
      history: { state: null, replaceState },
    });
    expect(capturePairingLink()).toBe("012345");
    expect(replaceState).toHaveBeenCalledWith(null, "", "/guru");
    vi.advanceTimersByTime(299_999);
    expect(pendingPairingCode()).toBe("012345");
    vi.advanceTimersByTime(1);
    expect(pendingPairingCode()).toBeNull();
    expect(data.size).toBe(0);
  });
});
