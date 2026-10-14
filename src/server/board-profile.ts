import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { authContext, requireTeacher } from "./auth/client";
import { readBody, handleError } from "./http";
import {
  boardProfileSchema,
  publicBoardProfile,
} from "../contracts/board-profile";
import { randomIdSchema } from "../contracts/domain";
export async function boardProfileRequest(
  request: NextRequest,
  surface: "board" | "teacher",
) {
  const ctx = authContext(request, surface);
  try {
    if (surface === "teacher") await requireTeacher(ctx);
    else {
      const { data, error } = await ctx.client.auth.getUser();
      if (error || !data.user?.is_anonymous) throw new Error("UNAUTHENTICATED");
    }
    // Authenticate first, then parse: a malformed presentationId must read as
    // INVALID_INPUT (422), never as a transient 503 that would distinguish
    // "malformed" from "not yours" by status code.
    const input =
      surface === "board"
        ? publicBoardProfile(await readBody(request, boardProfileSchema))
        : (() => {
            const id = randomIdSchema.safeParse(
              request.nextUrl.searchParams.get("presentationId"),
            );
            if (!id.success) throw new Error("INVALID_INPUT");
            return { presentationId: id.data };
          })();
    const { data, error } = await ctx.client.rpc("board_profile_action", {
      p_action: surface === "board" ? "save" : "read",
      p_input: input,
    });
    if (error) throw new Error("UNAVAILABLE");
    if (data?.error)
      throw new Error(
        ["FORBIDDEN", "RATE_LIMITED"].includes(data.error)
          ? data.error
          : "INVALID_INPUT",
      );
    return ctx.finish(
      NextResponse.json(
        surface === "board"
          ? { saved: true }
          : {
              profile:
                data === null
                  ? null
                  : publicBoardProfile(boardProfileSchema.parse(data)),
            },
      ),
    );
  } catch (error) {
    return ctx.finish(handleError(error));
  }
}
