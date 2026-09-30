import { type NextRequest, NextResponse } from "next/server";
import { loginSchema } from "@/contracts/auth";
import { authContext } from "@/server/auth/client";
import { applicationOrigin } from "@/server/auth/origin";
import { handleError, readBody } from "@/server/http";

export async function POST(request: NextRequest) {
  let context: ReturnType<typeof authContext> | undefined;
  try {
    const input = await readBody(request, loginSchema);
    context = authContext(request);
    const { error } = await context.client.auth.signInWithOtp({
      email: input.email,
      options: {
        emailRedirectTo: new URL(
          "/auth/callback",
          applicationOrigin(request),
        ).toString(),
      },
    });
    if (error) throw new Error("AUTH_UNAVAILABLE");
    return context.finish(NextResponse.json({ sent: true }));
  } catch (error) {
    const response = handleError(error);
    return context ? context.finish(response) : response;
  }
}
