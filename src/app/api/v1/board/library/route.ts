import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { authContext } from "@/server/auth/client";
import { readBody, handleError } from "@/server/http";
import { randomIdSchema } from "@/contracts/domain";
import { libraryBoardSchema } from "@/contracts/library";
export async function POST(request: NextRequest) {
  const ctx = authContext(request, "board");
  try {
    const { data: auth, error: authError } = await ctx.client.auth.getUser();
    if (authError || auth.user?.is_anonymous !== true)
      throw new Error("UNAUTHENTICATED");
    const input = await readBody(
      request,
      z.strictObject({ presentationId: randomIdSchema }),
    );
    const { data, error } = await ctx.client.rpc("library_board", {
      p_presentation: input.presentationId,
    });
    if (error) throw new Error("UNAVAILABLE");
    if (data?.error) throw new Error("FORBIDDEN");
    return ctx.finish(
      NextResponse.json(data === null ? null : libraryBoardSchema.parse(data)),
    );
  } catch (error) {
    return ctx.finish(handleError(error));
  }
}
