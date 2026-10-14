import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { isSameOrigin } from "../contracts/auth";
import { acceptedOrigins } from "./auth/origin";

// Best-effort client identity for IP-keyed rate limits.
//
// Next.js 16 exposes no transport socket address to a route handler, so we
// cannot read the true peer. Instead of trusting the left-most
// `X-Forwarded-For` entry (client-supplied, spoofable), we prefer the
// proxy-set `X-Real-IP` (nginx always sets it to `$remote_addr`) and otherwise
// take the RIGHT-most `X-Forwarded-For` entry, which is the one our own proxy
// appended last. When neither is present the caller is a direct connection and
// we report `unknown` — a shared bucket, never an attacker-chosen value.
//
// Trust boundary: this assumes the app is reached only through the local
// reverse proxy, which sets both headers and strips client-supplied ones.
// Deployments with no proxy (or a proxy that forwards client XFF verbatim) MUST
// set a real `PUBLIC_APP_ORIGIN`/`X-Real-IP` policy; see REMEDIATION_REPORT.
export function clientAddress(request: NextRequest): string {
  const real = request.headers.get("x-real-ip")?.trim();
  if (real) return real;
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const parts = forwarded
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
    if (parts.length) return parts[parts.length - 1];
  }
  return "unknown";
}

export function apiError(code: string, status: number) {
  return NextResponse.json(
    { error: { code } },
    { status, headers: { "Cache-Control": "private, no-store" } },
  );
}
export async function readBody<T>(
  request: NextRequest,
  schema: z.ZodType<T>,
  maximumBytes = 8192,
): Promise<T> {
  if (!isSameOrigin(request, acceptedOrigins(request)))
    throw new Error("FORBIDDEN");
  if (request.headers.get("content-type")?.split(";")[0] !== "application/json")
    throw new Error("INVALID_INPUT");
  const reader = request.body?.getReader();
  if (!reader) throw new Error("INVALID_INPUT");
  const chunks: Uint8Array[] = [];
  let length = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.length;
    if (length > maximumBytes) {
      await reader.cancel();
      throw new Error("PAYLOAD_TOO_LARGE");
    }
    chunks.push(value);
  }
  try {
    const data: unknown = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    const parsed = schema.safeParse(data);
    if (parsed.success) return parsed.data;
  } catch {
    /* Return a constant code, never body/schema error details. */
  }
  throw new Error("INVALID_INPUT");
}
export function handleError(error: unknown) {
  const code = error instanceof Error ? error.message : "UNAVAILABLE";
  const statuses: Record<string, number> = {
    FORBIDDEN: 403,
    INVALID_INPUT: 422,
    PAYLOAD_TOO_LARGE: 413,
    UNAUTHENTICATED: 401,
    NOT_FOUND: 404,
    CONFLICT: 409,
    SAMPLE_CONTROL_REQUIRED: 409,
    RATE_LIMITED: 429,
    AUTH_UNAVAILABLE: 503,
  };
  return apiError(
    code in statuses ? code : "UNAVAILABLE",
    statuses[code] ?? 503,
  );
}
