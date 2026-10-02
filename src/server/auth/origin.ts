import "server-only";
import type { NextRequest } from "next/server";

export function applicationOrigin(request: NextRequest): string {
  const configured = process.env["APP_ORIGIN"];
  if (configured) return new URL(configured).origin;
  // Local dev fallback; configure APP_ORIGIN behind a deployment proxy.
  return new URL(
    `${request.nextUrl.protocol}//${request.headers.get("host") ?? request.nextUrl.host}`,
  ).origin;
}
