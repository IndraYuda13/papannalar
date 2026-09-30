import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { authContext, requireTeacher } from "@/server/auth/client";
import { applicationOrigin } from "@/server/auth/origin";
import { readBody, handleError } from "@/server/http";
import { sampleControllerToken } from "@/server/sample-controller";
export async function POST(request: NextRequest) {
  const ctx = authContext(request);
  try {
    await requireTeacher(ctx);
    const input = await readBody(
      request,
      z.strictObject({ takeover: z.boolean() }),
    );
    const token = sampleControllerToken(request) ?? randomUUID();
    const { data, error } = await ctx.client.rpc("sample_control", {
      p_token: token,
      p_takeover: input.takeover,
      p_acquire: true,
    });
    if (error) throw new Error("UNAVAILABLE");
    if (data?.error) throw new Error("CONFLICT");
    const response = NextResponse.json({ ok: true });
    response.cookies.set("pn-sample-controller", token, {
      httpOnly: true,
      sameSite: "strict",
      secure: new URL(applicationOrigin(request)).protocol === "https:",
      path: "/",
      maxAge: 86400,
    });
    return ctx.finish(response);
  } catch (error) {
    return ctx.finish(handleError(error));
  }
}
