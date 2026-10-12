import "server-only";
import { createHash } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { loginSchema, enrollPasswordSchema } from "@/contracts/auth";
import { authContext, requireTeacher } from "./client";
import { readBody, handleError, apiError, clientAddress } from "../http";
export async function passwordAuth(
  request: NextRequest,
  mode: "login" | "register" | "enroll",
) {
  let ctx: ReturnType<typeof authContext> | undefined;
  try {
    ctx = authContext(request);
    if (mode === "enroll") await requireTeacher(ctx);
    const input = await readBody(
      request,
      mode === "enroll" ? enrollPasswordSchema : loginSchema,
    );
    const hash = (v: string) => createHash("sha256").update(v).digest("hex");
    const { data: allowed, error: rateError } = await ctx.client.rpc(
      "password_auth_limit",
      {
        p_email_hash: hash("email" in input ? String(input.email) : "enroll"),
        p_ip_hash: hash(clientAddress(request)),
      },
    );
    if (rateError) throw new Error("AUTH_UNAVAILABLE");
    if (allowed !== true) throw new Error("RATE_LIMITED");
    const result =
      mode === "enroll"
        ? await ctx.client.auth.updateUser({ password: input.password })
        : mode === "register"
          ? await ctx.client.auth.signUp(
              input as { email: string; password: string },
            )
          : await ctx.client.auth.signInWithPassword(
              input as { email: string; password: string },
            );
    if (result.error)
      return ctx.finish(
        apiError(
          result.error.status === 429 ? "RATE_LIMITED" : "AUTH_FAILED",
          result.error.status === 429 ? 429 : 401,
        ),
      );
    if (mode === "enroll")
      return ctx.finish(
        NextResponse.json({ status: "enrolled", redirect: "/guru" }),
      );
    const session = "session" in result.data ? result.data.session : null;
    if (mode === "login" && !session)
      return ctx.finish(apiError("AUTH_FAILED", 401));
    return ctx.finish(
      NextResponse.json(
        mode === "register"
          ? {
              status: session ? "signed_in" : "confirmation_required",
              redirect: session ? "/guru" : null,
              emailVerified: false,
            }
          : { status: "signed_in", redirect: "/guru" },
      ),
    );
  } catch (error) {
    const response = handleError(error);
    return ctx ? ctx.finish(response) : response;
  }
}
