// Local-demo privacy boundary. The demo adapter is opt-in (explicit flag) and
// only ever enabled when BOTH the auth provider and the app origin are loopback
// http origins. The hostname allowlist is loopback-only (127.0.0.1, localhost,
// [::1]) so a parallel staging instance on another loopback port can use the
// local adapter without ever accepting a network or public origin.
const LOOPBACK_HOSTNAMES = new Set(["127.0.0.1", "localhost", "[::1]"]);

function isLoopbackHttpOrigin(value: string | undefined): boolean {
  if (!value) return false;
  try {
    const url = new URL(value);
    return (
      url.protocol === "http:" &&
      LOOPBACK_HOSTNAMES.has(url.hostname) &&
      url.pathname === "/" &&
      url.search === "" &&
      url.hash === "" &&
      url.username === "" &&
      url.password === ""
    );
  } catch {
    return false;
  }
}

export function isLocalDemoEnvironment(
  flag: string | undefined,
  provider: string | undefined,
  origin: string | undefined,
): boolean {
  return (
    flag === "1" &&
    isLoopbackHttpOrigin(provider) &&
    isLoopbackHttpOrigin(origin)
  );
}

// Explicit operator opt-in for every demo/sample surface. The local-adapter
// flag alone is NOT an authorization boundary (SENTINEL F-01/F-03): a launcher
// that hardcodes the loopback pair can still be deployed to a public host, so a
// second, deliberate switch must be present. Absent or non-"1" fails closed.
export function demoModeEnabled(value: string | undefined): boolean {
  return value === "1";
}

// Same loopback rule applied to a raw `Host` header value: accept a loopback
// host name with any port, reject everything else (credentials, path, query,
// foreign hosts, malformed values).
export function isLoopbackHostHeader(host: string | null | undefined): boolean {
  if (!host) return false;
  try {
    const url = new URL(`http://${host}`);
    return (
      LOOPBACK_HOSTNAMES.has(url.hostname) &&
      url.username === "" &&
      url.password === "" &&
      url.pathname === "/" &&
      url.search === "" &&
      url.hash === ""
    );
  } catch {
    return false;
  }
}

// The single gate every demo/sample surface must clear (ORION-arbitrated
// layering, SENTINEL F-01/F-03):
//   1. PAPANNALAR_DEMO_MODE=1 — an explicit, operator-controlled opt-in that is
//      separate from the local-adapter flag (which the demo launcher sets for
//      every deployment, and is therefore not an authorization boundary).
//   2. the loopback config pair (provider + app origin);
//   3. a loopback Host header;
//   4. a direct (unproxied) request — nginx always sets X-Real-IP, so a request
//      that travelled through the public reverse proxy can never pass, even
//      though nginx rewrites Host/Origin/X-Forwarded-*.
// Any future demo entry point must call this instead of re-deriving the
// condition, so the boundary cannot drift.
export function demoSurfaceAllowed(
  request: { headers: Headers },
  env: {
    demoMode: string | undefined;
    localAdapter: string | undefined;
    provider: string | undefined;
    origin: string | undefined;
  },
): boolean {
  return (
    demoModeEnabled(env.demoMode) &&
    isLocalDemoEnvironment(env.localAdapter, env.provider, env.origin) &&
    isLoopbackHostHeader(request.headers.get("host")) &&
    !isProxiedRequest(request.headers)
  );
}

// A request that reached the app through the reverse proxy. nginx sets
// X-Real-IP unconditionally to the true peer address and Next never injects it,
// so its presence proves a proxied hop even though Host/Origin/X-Forwarded-*
// are rewritten. Demo surfaces refuse proxied requests so a public deployment
// cannot expose them even when the demo flag leaks into the environment.
// Direct loopback dev/demo requests carry no X-Real-IP.
export function isProxiedRequest(headers: Headers): boolean {
  return Boolean(headers.get("x-real-ip"));
}
