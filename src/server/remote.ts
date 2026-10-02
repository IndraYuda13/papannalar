import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { authContext, requireTeacher } from "./auth/client";
import { readBody, handleError } from "./http";
import {
  teacherRemoteSchema,
  boardRemoteSchema,
  remoteStatusSchema,
} from "../contracts/remote";
export async function remoteRequest(
  request: NextRequest,
  surface: "teacher" | "board",
) {
  const ctx = authContext(request, surface);
  try {
    if (surface === "teacher") await requireTeacher(ctx);
    else {
      const { data, error } = await ctx.client.auth.getUser();
      if (error || !data.user?.is_anonymous) throw new Error("UNAUTHENTICATED");
    }
    const input =
      surface === "teacher"
        ? await readBody(request, teacherRemoteSchema)
        : await readBody(request, boardRemoteSchema);
    const { data, error } = await ctx.client.rpc("remote_tool_action", {
      p_action: input.action,
      p_input: input,
    });
    if (error) throw new Error("UNAVAILABLE");
    // A board poll/receipt may cross a legitimate task transition. This is an
    // inactive channel, never an acceptance or ACK of the previous command.
    if (surface === "board" && data?.error === "CONFLICT")
      return ctx.finish(
        NextResponse.json({
          instanceId: null,
          sequence: 0,
          command: null,
          receipt: null,
        }),
      );
    if (data?.error)
      throw new Error(
        ["FORBIDDEN", "CONFLICT", "RATE_LIMITED"].includes(data.error)
          ? data.error
          : "INVALID_INPUT",
      );
    return ctx.finish(NextResponse.json(remoteStatusSchema.parse(data)));
  } catch (error) {
    return ctx.finish(handleError(error));
  }
}
