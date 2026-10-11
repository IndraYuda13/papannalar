import "server-only";
import { headers } from "next/headers";
import { demoSurfaceAllowed } from "../contracts/local-demo";

// One place that reads the demo contract's environment and request surfaces, so
// every demo/sample entry point (route handlers and server components) applies
// the identical fail-closed gate. See contracts/local-demo.ts.
export function demoEnvironment() {
  return {
    demoMode: process.env["PAPANNALAR_DEMO_MODE"],
    localAdapter: process.env["PAPANNALAR_LOCAL_ADAPTER"],
    provider: process.env["NEXT_PUBLIC_SUPABASE_URL"],
    origin: process.env["APP_ORIGIN"],
  };
}

export function demoAllowedForRequest(request: { headers: Headers }): boolean {
  return demoSurfaceAllowed(request, demoEnvironment());
}

export async function demoAllowedForServerComponent(): Promise<boolean> {
  return demoSurfaceAllowed({ headers: await headers() }, demoEnvironment());
}

// Operator visibility (ORION-arbitrated Layer 1): enabling the demo surfaces in
// production is a deliberate act. Warn loudly once, but do NOT auto-disable —
// the owner may intentionally run a demo instance on a public host.
if (process.env["NODE_ENV"] === "production") {
  if (
    process.env["PAPANNALAR_DEMO_MODE"] === "1" &&
    process.env["PAPANNALAR_ALLOW_PUBLIC_DEMO"] !== "1"
  )
    console.warn(
      "[papannalar] PAPANNALAR_DEMO_MODE=1 in production without PAPANNALAR_ALLOW_PUBLIC_DEMO=1. Demo/sample surfaces are reachable from direct loopback callers and mint real teacher/sample sessions; set PAPANNALAR_ALLOW_PUBLIC_DEMO=1 to acknowledge, or unset PAPANNALAR_DEMO_MODE on a public host.",
    );
  else if (process.env["PAPANNALAR_LOCAL_ADAPTER"] === "1")
    console.warn(
      "[papannalar] PAPANNALAR_LOCAL_ADAPTER=1 in production: the local demo adapter is configured but demo/sample surfaces stay disabled unless PAPANNALAR_DEMO_MODE=1. Deploy a production entrypoint with a real APP_ORIGIN on public hosts.",
    );
}
