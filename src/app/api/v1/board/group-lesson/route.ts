import { NextResponse, type NextRequest } from "next/server";
import { authContext } from "@/server/auth/client";
import { readBody, handleError } from "@/server/http";
import {
  groupBoardActionSchema,
  groupBoardStateSchema,
} from "@/contracts/group-board";
import { learningRpc } from "@/server/learning/rpc";
export async function POST(request: NextRequest) {
  const ctx = authContext(request, "board");
  try {
    const { data, error } = await ctx.client.auth.getUser();
    if (error || data.user?.is_anonymous !== true)
      throw new Error("UNAUTHENTICATED");
    const input = await readBody(request, groupBoardActionSchema, 131072);
    const value = await learningRpc(ctx.client, "group_board_action", {
      p_input: input,
    });
    return ctx.finish(
      NextResponse.json(
        value === null ? null : groupBoardStateSchema.parse(value),
      ),
    );
  } catch (error) {
    return ctx.finish(handleError(error));
  }
}
