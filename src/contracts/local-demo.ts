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
// flag alone is not an authorization boundary: a launcher
// that hardcodes the loopback pair can still be deployed to a public host, so a
// second, deliberate switch must be present. Absent or non-"1" fails closed.
export function demoModeEnabled(value: string | undefined): boolean {
  return value === "1";
}

// A request that reached the app through the reverse proxy. nginx sets
// X-Real-IP unconditionally to the true peer address and Next never injects it,
// so its presence proves a proxied hop even though Host/Origin/X-Forwarded-*
// are rewritten. Demo surfaces refuse proxied requests so a public deployment
// cannot expose them even when the demo flag leaks into the environment.
// Direct loopback dev/demo requests carry no X-Real-IP.
//
// This is a PROTECTED DEPLOYMENT INVARIANT, not a self-contained guarantee: it
// holds only while the ingress unconditionally sets X-Real-IP and :3100 is
// reachable solely through that ingress. The NODE_ENV floor in
// demoSurfaceAllowed() does not depend on any proxy property and is the
// backstop if that invariant ever changes. See REMEDIATION_REPORT.md.
export function isProxiedRequest(headers: Headers): boolean {
  return Boolean(headers.get("x-real-ip"));
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

// A present X-Forwarded-* header that is not itself loopback/http is proof of a
// non-local hop, so it must not be smuggled past a loopback Host.
// Next.js itself injects x-forwarded-for/host/proto with the local
// socket values for direct requests, so a direct loopback call still passes.
function forwardedHeadersAreLocal(headers: Headers): boolean {
  const proto = headers.get("x-forwarded-proto");
  if (proto && proto.split(",")[0]!.trim() !== "http") return false;
  const host = headers.get("x-forwarded-host");
  if (host && !isLoopbackHostHeader(host.split(",")[0]!.trim())) return false;
  return true;
}

// Config-derived production floor. A real public deployment
// sets PUBLIC_APP_ORIGIN to its external https origin; when it
// does, demo surfaces are refused unless the operator explicitly acknowledges a
// public demo with PAPANNALAR_ALLOW_PUBLIC_DEMO=1. This term depends on no proxy
// property (it cannot flip if the ingress stops setting X-Real-IP) and is the
// backstop for the isProxiedRequest invariant below. NODE_ENV is deliberately
// NOT used: Next.js inlines `process.env.NODE_ENV` at build time, so a `next
// start` server always reads "production" and cannot distinguish the local
// harness from the public host.
function productionFloorIsSatisfied(
  publicAppOrigin: string | undefined,
  allowPublicDemo: string | undefined,
): boolean {
  if (!publicAppOrigin) return true;
  try {
    if (LOOPBACK_HOSTNAMES.has(new URL(publicAppOrigin).hostname)) return true;
  } catch {
    // A malformed PUBLIC_APP_ORIGIN must fail closed.
    return allowPublicDemo === "1";
  }
  return allowPublicDemo === "1";
}

// The single gate every demo/sample surface must clear (defense in depth layering):
//   1. PAPANNALAR_DEMO_MODE=1 — an explicit, operator-controlled opt-in that is
//      separate from the local-adapter flag (which the demo launcher sets for
//      every deployment, and is therefore not an authorization boundary). The
//      `pnpm video` launcher no longer forces it, so an unchanged prod unit
//      leaves demo 404.
//   2. the loopback config pair (provider + app origin);
//   3. a loopback Host header and no foreign X-Forwarded-Host/Proto;
//   4. a direct (unproxied) request — nginx always sets X-Real-IP;
//   5. no external PUBLIC_APP_ORIGIN, unless PAPANNALAR_ALLOW_PUBLIC_DEMO=1
//      acknowledges an intentional public demo (config-derived backstop).
// Any future demo entry point must call this instead of re-deriving the
// condition, so the boundary cannot drift.
export function demoSurfaceAllowed(
  request: { headers: Headers },
  env: {
    demoMode: string | undefined;
    localAdapter: string | undefined;
    provider: string | undefined;
    origin: string | undefined;
    publicAppOrigin: string | undefined;
    allowPublicDemo: string | undefined;
  },
): boolean {
  return (
    demoModeEnabled(env.demoMode) &&
    isLocalDemoEnvironment(env.localAdapter, env.provider, env.origin) &&
    isLoopbackHostHeader(request.headers.get("host")) &&
    forwardedHeadersAreLocal(request.headers) &&
    !isProxiedRequest(request.headers) &&
    productionFloorIsSatisfied(env.publicAppOrigin, env.allowPublicDemo)
  );
}
