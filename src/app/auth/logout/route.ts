import { type NextRequest, NextResponse } from "next/server";
import { isSameOrigin } from "@/contracts/auth";
import { authContext } from "@/server/auth/client";
import { applicationOrigin } from "@/server/auth/origin";
import { apiError } from "@/server/http";

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request, applicationOrigin(request)))
    return apiError("FORBIDDEN", 403);
  const response = NextResponse.json(
    { signedOut: true },
    { headers: { "Cache-Control": "no-store" } },
  );
  try {
    const context = authContext(request);
    await context.client.auth.signOut({ scope: "local" });
    context.finish(response);
  } catch {
    /* Clear this device even if the provider is unavailable. */
  }
  for (const cookie of request.cookies.getAll()) {
    if (cookie.name.startsWith("pn-teacher-auth"))
      response.cookies.set(cookie.name, "", {
        path: "/",
        maxAge: 0,
        httpOnly: true,
        sameSite: "lax",
      });
  }
  return response;
}
