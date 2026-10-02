import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { isSameOrigin } from "../contracts/auth";
import { applicationOrigin } from "./auth/origin";

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
  if (!isSameOrigin(request, applicationOrigin(request)))
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
    RATE_LIMITED: 429,
    AUTH_UNAVAILABLE: 503,
  };
  return apiError(
    code in statuses ? code : "UNAVAILABLE",
    statuses[code] ?? 503,
  );
}
