type AuthCookiePrefix = "pn-teacher-auth" | "pn-board-auth";
// Supabase SSR0.12 uses per-flow PKCE verifier slots and a pending-flow index.
// Keep the two surfaces separate, including chunked session/verifier cookies.
export function isSurfaceAuthCookie(name: string, prefix: AuthCookiePrefix) {
  if (name === prefix) return true;
  if (!name.startsWith(prefix)) return false;
  return /^(?:\.\d+|-(?:code-verifier|flows-code-verifier|flow-[A-Za-z0-9_-]{8,64}-code-verifier)(?:\.\d+)?)$/.test(
    name.slice(prefix.length),
  );
}
