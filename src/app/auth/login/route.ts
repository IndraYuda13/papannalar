import { type NextRequest, NextResponse } from "next/server";
import { loginSchema } from "@/contracts/auth";
import { authContext } from "@/server/auth/client";
import { deliveredLoginLink } from "@/server/auth/delivered-link";
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
    // In-band delivery for the loopback test provider (which cannot send
    // email): when the operator opts in, hand the just-minted link back so the
    // same browser can complete sign-in immediately.
    const link = await deliveredLoginLink(input.email);
    return context.finish(
      NextResponse.json(link ? { sent: true, link } : { sent: true }),
    );
  } catch (error) {
    const response = handleError(error);
    return context ? context.finish(response) : response;
  }
}
