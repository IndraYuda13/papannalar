import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isSameOrigin, isTeacherIdentity } from "../../../contracts/auth";
import { randomIdSchema } from "../../../contracts/domain";
import { authContext } from "../../../server/auth/client";
import { applicationOrigin } from "../../../server/auth/origin";
import { apiError, handleError, readBody } from "../../../server/http";
import { sampleControllerToken } from "../../../server/sample-controller";
import { isSurfaceAuthCookie } from "../../../server/auth/cookies";

const inputSchema = z.strictObject({ controllerId: randomIdSchema.optional() });
const receiptSchema = z.strictObject({
  ok: z.literal(true),
  revoked: z.number().int().nonnegative(),
});

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request, applicationOrigin(request)))
    return apiError("FORBIDDEN", 403);
  let input: z.infer<typeof inputSchema>;
  try {
    input = request.body ? await readBody(request, inputSchema, 256) : {};
  } catch (error) {
    return handleError(error);
  }
  const response = NextResponse.json(
    { signedOut: true },
    {
      headers: {
        "Cache-Control": "no-store",
        "Referrer-Policy": "no-referrer",
      },
    },
  );
  try {
    const context = authContext(request);
    if (input.controllerId) {
      const { data, error } = await context.client.auth.getUser();
      if (error && ![400, 401, 403].includes(error.status ?? 0))
        return context.finish(apiError("UNAVAILABLE", 503));
      if (isTeacherIdentity(data.user)) {
        // The DB matches owner + tab and checks the sample cookie atomically.
        // An observer can sign out; it never acquires or revokes another grant.
        const result = await context.client.rpc("presentation_logout", {
          p_controller_id: input.controllerId,
          p_sample_controller: sampleControllerToken(request),
        });
        if (result.error || !receiptSchema.safeParse(result.data).success)
          return context.finish(apiError("UNAVAILABLE", 503));
      }
    }
    try {
      await context.client.auth.signOut({ scope: "local" });
    } catch {
      // The controller was revoked. Clear this device's cookies regardless.
    }
    context.finish(response);
  } catch {
    // Keep the credential available for a pending revocation retry. The client
    // locks local access first; it must not report a failed revoke as complete.
    if (input.controllerId) return apiError("UNAVAILABLE", 503);
  }
  for (const cookie of request.cookies.getAll()) {
    if (
      isSurfaceAuthCookie(cookie.name, "pn-teacher-auth") ||
      cookie.name === "pn-sample-controller" ||
      cookie.name === "pn-pair-challenge"
    )
      response.cookies.set(cookie.name, "", {
        path: "/",
        maxAge: 0,
        httpOnly: true,
        sameSite: "lax",
        secure: new URL(applicationOrigin(request)).protocol === "https:",
      });
  }
  return response;
}
