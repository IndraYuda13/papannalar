import "server-only";
import type { NextRequest } from "next/server";

// Browser-visible origin resolution.
//
// Order of preference (SENTINEL F-02):
//  1. PUBLIC_APP_ORIGIN — the operator's real external origin. When the app is
//     fronted by the local nginx (which rewrites Host/Origin/X-Forwarded-*), this
//     is the only trustworthy source for the origin the browser actually used,
//     so cookies get `Secure` and same-origin checks compare the real origin.
//  2. APP_ORIGIN — the legacy/local value; still loopback for the local
//     audit/demo harness, so tests keep working unchanged.
//  3. The request's own protocol+Host (dev fallback only).
export function applicationOrigin(request: NextRequest): string {
  const configured =
    process.env["PUBLIC_APP_ORIGIN"] || process.env["APP_ORIGIN"];
  if (configured) return new URL(configured).origin;
  // Local dev fallback; configure PUBLIC_APP_ORIGIN behind a deployment proxy.
  return new URL(
    `${request.nextUrl.protocol}//${request.headers.get("host") ?? request.nextUrl.host}`,
  ).origin;
}

// Origins a state-changing request may carry. The internal loopback origin is
// included because the deployed nginx rewrites `Origin` to it; once the proxy
// passes the browser Origin through (see REMEDIATION_REPORT rollout steps) the
// public origin is the one that matches, and a foreign origin matches neither
// and is refused. Returning a set keeps every CSRF guard (readBody, logout,
// board/identity) enforcing as soon as the proxy stops rewriting.
export function acceptedOrigins(request: NextRequest): readonly string[] {
  const internal = applicationOrigin(request);
  const host = request.headers.get("host");
  const scheme = request.nextUrl.protocol.replace(":", "");
  const derived = host ? `${scheme}://${host}` : internal;
  return internal === derived ? [internal] : [internal, derived];
}

if (
  process.env["NODE_ENV"] === "production" &&
  !process.env["PUBLIC_APP_ORIGIN"] &&
  process.env["APP_ORIGIN"]
) {
  try {
    if (new URL(process.env["APP_ORIGIN"]!).protocol !== "https:")
      console.warn(
        "[papannalar] APP_ORIGIN is not https in production and PUBLIC_APP_ORIGIN is unset: session cookies will not carry Secure and same-origin checks compare a loopback value. Set PUBLIC_APP_ORIGIN to the public https origin.",
      );
  } catch {
    /* invalid APP_ORIGIN is handled at first use */
  }
}
