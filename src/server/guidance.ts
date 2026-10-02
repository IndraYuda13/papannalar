import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { authContext, requireTeacher } from "./auth/client";
import { readBody, handleError } from "./http";
import {
  guidanceReportSchema,
  guidanceStatusSchema,
} from "../contracts/guidance";
export async function guidanceRequest(
  request: NextRequest,
  surface: "board" | "teacher",
) {
  let ctx: ReturnType<typeof authContext> | undefined;
  try {
    ctx = authContext(request, surface);
    if (surface === "teacher") await requireTeacher(ctx);
    else {
      const { data, error } = await ctx.client.auth.getUser();
      if (error || !data.user?.is_anonymous) throw new Error("UNAUTHENTICATED");
    }
    const input = await readBody(request, guidanceReportSchema);
    if (input.action !== (surface === "teacher" ? "read" : "ack"))
      throw new Error("FORBIDDEN");
    const { data, error } = await ctx.client.rpc("guidance_status", {
      p_input: input,
    });
    if (error) throw new Error("UNAVAILABLE");
    if (data?.error === "CONFLICT")
      return ctx.finish(
        NextResponse.json(
          { taskEpoch: input.taskEpoch, hint: 0, active: false },
          { headers: { "Cache-Control": "no-store" } },
        ),
      );
    if (data?.error)
      throw new Error(
        ["FORBIDDEN", "CONFLICT"].includes(data.error)
          ? data.error
          : "INVALID_INPUT",
      );
    return ctx.finish(
      NextResponse.json(guidanceStatusSchema.parse(data), {
        headers: { "Cache-Control": "no-store" },
      }),
    );
  } catch (error) {
    const response = handleError(error);
    return ctx ? ctx.finish(response) : response;
  }
}
