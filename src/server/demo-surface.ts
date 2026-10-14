import "server-only";
import { headers } from "next/headers";
import { demoSurfaceAllowed } from "../contracts/local-demo";

// Strictly-local loopback origins for the config-only check below.
const LOOPBACK = /^https?:\/\/(127\.0\.0\.1|localhost|\[::1\])(:|\/|$)/;

function externalPublicOrigin(): string | undefined {
  const value = process.env["PUBLIC_APP_ORIGIN"];
  return value && !LOOPBACK.test(value) ? value : undefined;
}

// One place that reads the demo contract's environment and request surfaces, so
// every demo/sample entry point (route handlers and server components) applies
// the identical fail-closed gate. See contracts/local-demo.ts.
export function demoEnvironment() {
  return {
    demoMode: process.env["PAPANNALAR_DEMO_MODE"],
    localAdapter: process.env["PAPANNALAR_LOCAL_ADAPTER"],
    provider: process.env["NEXT_PUBLIC_SUPABASE_URL"],
    origin: process.env["APP_ORIGIN"],
    publicAppOrigin: process.env["PUBLIC_APP_ORIGIN"],
    allowPublicDemo: process.env["PAPANNALAR_ALLOW_PUBLIC_DEMO"],
  };
}

export function demoAllowedForRequest(request: { headers: Headers }): boolean {
  return demoSurfaceAllowed(request, demoEnvironment());
}

export async function demoAllowedForServerComponent(): Promise<boolean> {
  return demoSurfaceAllowed({ headers: await headers() }, demoEnvironment());
}

// Config-only demo signal for surfaces that cannot see the request (a server
// component rendering a link). The per-request gate in demoSurfaceAllowed() is
// still authoritative for the minting routes, so this is a visibility hint.
export function demoConfiguredForEnvironment(): boolean {
  return (
    process.env["PAPANNALAR_DEMO_MODE"] === "1" &&
    (!externalPublicOrigin() ||
      process.env["PAPANNALAR_ALLOW_PUBLIC_DEMO"] === "1")
  );
}

// Operator visibility layer. The gate fails closed when
// PUBLIC_APP_ORIGIN names an external origin; this warns when demo mode is on so
// an accidental public demo is loud rather than silent.
if (process.env["PAPANNALAR_DEMO_MODE"] === "1") {
  if (
    externalPublicOrigin() &&
    process.env["PAPANNALAR_ALLOW_PUBLIC_DEMO"] !== "1"
  )
    console.warn(
      "[papannalar] PAPANNALAR_DEMO_MODE=1 with an external PUBLIC_APP_ORIGIN. Demo/sample surfaces stay 404 unless PAPANNALAR_ALLOW_PUBLIC_DEMO=1 acknowledges a public demo; set it to do so, or unset PAPANNALAR_DEMO_MODE.",
    );
  else if (!process.env["PUBLIC_APP_ORIGIN"])
    console.warn(
      "[papannalar] PAPANNALAR_DEMO_MODE=1 with no PUBLIC_APP_ORIGIN set. Demo/sample surfaces are enabled for local (loopback, direct) callers; on a public host set PUBLIC_APP_ORIGIN to the external origin so the gate fails closed.",
    );
}
