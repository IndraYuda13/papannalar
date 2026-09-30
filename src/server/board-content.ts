import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { authContext, requireTeacher } from "./auth/client";
import { readBody, handleError } from "./http";
import {
  boardContentRequestSchema,
  boardContentStatusSchema,
  publicContentRequest,
} from "../contracts/board-content";
import { publicBoardPacket } from "../contracts/board-package";
import { publicPresentation } from "../contracts/presentation";

export async function boardContentRequest(
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
    const input = publicContentRequest(
      await readBody(request, boardContentRequestSchema, 524288),
    );
    const allowed =
      surface === "teacher"
        ? ["read", "write", "resolve"]
        : ["read", "cached", "uncache", "propose"];
    if (!allowed.includes(input.action)) throw new Error("FORBIDDEN");
    const { data, error } = await ctx.client.rpc("board_content_action", {
      p_action: input.action,
      p_input: input,
    });
    if (error) throw new Error("UNAVAILABLE");
    if (data?.error)
      throw new Error(
        ["FORBIDDEN", "CONFLICT", "RATE_LIMITED"].includes(data.error)
          ? data.error
          : "INVALID_INPUT",
      );
    const value = boardContentStatusSchema.parse(data);
    return ctx.finish(
      NextResponse.json(
        {
          packet: value.packet ? publicBoardPacket(value.packet) : null,
          cached: value.cached,
          packetVersion: value.packetVersion,
          proposal: value.proposal ? publicPresentation(value.proposal) : null,
          proposalStale: value.proposalStale,
          resolution: value.resolution,
          ...(value.snapshot ? { snapshot: value.snapshot } : {}),
        },
        { headers: { "Cache-Control": "no-store" } },
      ),
    );
  } catch (error) {
    const response = handleError(error);
    return ctx ? ctx.finish(response) : response;
  }
}
