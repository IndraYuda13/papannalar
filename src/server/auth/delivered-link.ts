import "server-only";

/**
 * In-band magic-link delivery for deployments whose auth provider is the local
 * test double (`tests/harness/provider.mjs`): that provider stores the pending
 * link in memory and never sends email, so a teacher cannot complete the
 * standard "check your email" flow. When — and only when — the operator
 * explicitly opts in with `PAPANNALAR_LOGIN_LINK_REVEAL=1`, POST /auth/login
 * returns the link it just minted so the same browser can open it directly.
 *
 * The returned value is ALWAYS a same-site path (`/auth/callback?code=…`),
 * never the provider's absolute URL: the provider origin is loopback-only, so
 * the operator's browser could not reach it from the public origin, and the
 * PKCE verifier cookie that completes the exchange rides on the response this
 * link travels with.
 *
 * Fail closed: a missing flag, missing provider, malformed payload or foreign
 * path all yield null, and the caller keeps the standard `{ sent: true }`
 * response. Security note (recorded in the deploy report): while the flag is
 * on, anyone who can reach the site can mint a session for any email — that is
 * acceptable only for demo deployments backed by the test double, and the flag
 * must be unset before any real-user deployment.
 */
export async function deliveredLoginLink(
  email: string,
): Promise<string | null> {
  if (process.env["PAPANNALAR_LOGIN_LINK_REVEAL"] !== "1") return null;
  const provider = process.env["NEXT_PUBLIC_SUPABASE_URL"];
  if (!provider) return null;
  try {
    const response = await fetch(
      `${provider}/__test/link?email=${encodeURIComponent(email)}`,
      { cache: "no-store" },
    );
    if (!response.ok) return null;
    const data: unknown = await response.json();
    if (typeof data !== "object" || data === null || !("url" in data))
      return null;
    const raw = (data as { url: unknown }).url;
    if (typeof raw !== "string") return null;
    const url = new URL(raw);
    const code = url.searchParams.get("code");
    if (url.pathname !== "/auth/callback" || !code) return null;
    if (!/^[0-9a-f-]{36}$/i.test(code)) return null;
    return `${url.pathname}?code=${encodeURIComponent(code)}`;
  } catch {
    return null;
  }
}
