// The QR is a short-lived challenge, never an auth/session token. A camera result
// is parsed locally; callers must never fetch or navigate the decoded URL.
export function pairingUrl(origin: string, code: string): string | null {
  if (!/^\d{6}$/.test(code)) return null;
  try {
    const url = new URL(origin);
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.hostname === "localhost" ||
      url.hostname.endsWith(".localhost") ||
      /^127\./.test(url.hostname) ||
      ["[::1]", "0.0.0.0"].includes(url.hostname)
    )
      return null;
    return `${url.origin}/guru?pair=${code}`;
  } catch {
    return null;
  }
}

export function parsePairingCode(value: string, origin: string): string | null {
  const input = value.trim();
  if (/^\d{6}$/.test(input)) return input;
  if (input.length > 512) return null;
  try {
    const url = new URL(input);
    const code = url.searchParams.get("pair");
    return code &&
      url.origin === new URL(origin).origin &&
      pairingUrl(origin, code) === input
      ? code
      : null;
  } catch {
    return null;
  }
}

export const PAIRING_CHALLENGE_COOKIE = "pn-pair-challenge";
export const PAIRING_CHALLENGE_TTL_MS = 300_000;
const pendingKey = "pn-pair-challenge-v1";
let pending: { code: string; expiresAt: number } | undefined;
function savePending(value: { code: string; expiresAt: number }) {
  pending = value;
  try {
    sessionStorage.setItem(pendingKey, JSON.stringify(value));
  } catch {
    /* RAM fallback. */
  }
}
// Call in the teacher entry shell before login/navigation. Nothing is claimed
// until the teacher chooses an active class/run. Its pairing control can then
// submit the already scanned challenge once without a second manual action.
export function capturePairingLink(): string | null {
  const url = new URL(window.location.href);
  if (!url.searchParams.has("pair")) return pendingPairingCode();
  const code = parsePairingCode(url.href, url.origin);
  clearPairingLink();
  url.searchParams.delete("pair");
  window.history.replaceState(
    window.history.state,
    "",
    url.pathname + url.search + url.hash,
  );
  if (code) {
    savePending({ code, expiresAt: Date.now() + PAIRING_CHALLENGE_TTL_MS });
  }
  return code;
}
export function pendingPairingCode(): string | null {
  // The proxy carries a nonsecret challenge across the fixed /masuk -> /guru
  // login redirect. Consume it once without extending its original deadline.
  if (typeof document !== "undefined") {
    const cookie = document.cookie
      .split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${PAIRING_CHALLENGE_COOKIE}=`));
    if (cookie) {
      clearPairingLink();
      const match = /^(\d{6})\.(\d{1,16})$/.exec(
        cookie.slice(PAIRING_CHALLENGE_COOKIE.length + 1),
      );
      const expiresAt = match ? Number(match[2]) : 0;
      if (
        match &&
        Number.isSafeInteger(expiresAt) &&
        expiresAt > Date.now() &&
        expiresAt <= Date.now() + PAIRING_CHALLENGE_TTL_MS
      ) {
        savePending({ code: match[1], expiresAt });
        return match[1];
      }
      return null;
    }
  }
  try {
    const value: unknown = JSON.parse(
      sessionStorage.getItem(pendingKey) ?? "null",
    );
    if (
      value &&
      typeof value === "object" &&
      "code" in value &&
      "expiresAt" in value &&
      typeof value.code === "string" &&
      /^\d{6}$/.test(value.code) &&
      typeof value.expiresAt === "number"
    )
      pending = { code: value.code, expiresAt: value.expiresAt };
  } catch {
    /* RAM fallback. */
  }
  if (!pending || pending.expiresAt <= Date.now()) {
    clearPairingLink();
    return null;
  }
  return pending.code;
}
export function clearPairingLink() {
  pending = undefined;
  if (typeof document !== "undefined")
    document.cookie = `${PAIRING_CHALLENGE_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
  try {
    sessionStorage.removeItem(pendingKey);
  } catch {
    /* RAM fallback. */
  }
}
