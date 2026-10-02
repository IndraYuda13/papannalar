import { type NextRequest, NextResponse } from "next/server";
import { isSameOrigin } from "@/contracts/auth";
import { authContext } from "@/server/auth/client";
import { applicationOrigin } from "@/server/auth/origin";
import { apiError, handleError } from "@/server/http";

export async function POST(request: NextRequest) {
  let context: ReturnType<typeof authContext> | undefined;
  if (!isSameOrigin(request, applicationOrigin(request)))
    return apiError("FORBIDDEN", 403);
  try {
    context = authContext(request, "board");
    let {
      data: { user },
    } = await context.client.auth.getUser();
    if (user && user.is_anonymous !== true)
      return context.finish(apiError("FORBIDDEN", 403));
    if (!user) {
      const result = await context.client.auth.signInAnonymously();
      if (result.error) throw new Error("AUTH_UNAVAILABLE");
      user = result.data.user;
    }
    if (!user || user.is_anonymous !== true) throw new Error("UNAUTHENTICATED");
    return context.finish(NextResponse.json({ id: user.id, role: "board" }));
  } catch (error) {
    const response = handleError(error);
    return context ? context.finish(response) : response;
  }
}
