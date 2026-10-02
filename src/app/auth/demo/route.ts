import { NextResponse, type NextRequest } from "next/server";
import { isLocalDemoEnvironment } from "@/contracts/local-demo";
import { isSameOrigin } from "@/contracts/auth";
import { authContext } from "@/server/auth/client";
import { apiError, handleError } from "@/server/http";
export async function POST(request: NextRequest) {
  const origin = process.env["APP_ORIGIN"],
    provider = process.env["NEXT_PUBLIC_SUPABASE_URL"];
  if (
    !isLocalDemoEnvironment(
      process.env["PAPANNALAR_LOCAL_ADAPTER"],
      provider,
      origin,
    ) ||
    request.headers.get("host") !== "127.0.0.1:3100"
  )
    return apiError("NOT_FOUND", 404);
  if (!isSameOrigin(request, origin!)) return apiError("FORBIDDEN", 403);
  const ctx = authContext(request);
  try {
    const email = "local-demo@qa.invalid";
    const result = await ctx.client.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${origin}/auth/callback` },
    });
    if (result.error) throw new Error("AUTH_UNAVAILABLE");
    const response = await fetch(
      `${provider}/__test/link?email=${encodeURIComponent(email)}`,
      { cache: "no-store" },
    );
    const data: unknown = await response.json();
    if (
      !data ||
      typeof data !== "object" ||
      !("url" in data) ||
      typeof data.url !== "string"
    )
      throw new Error("AUTH_UNAVAILABLE");
    const url = new URL(data.url);
    if (url.origin !== origin || url.pathname !== "/auth/callback")
      throw new Error("FORBIDDEN");
    return ctx.finish(NextResponse.redirect(url, 303));
  } catch (error) {
    return ctx.finish(handleError(error));
  }
}
