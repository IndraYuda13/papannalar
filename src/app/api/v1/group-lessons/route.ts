import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { authContext, requireTeacher } from "@/server/auth/client";
import { readBody, handleError } from "@/server/http";
import {
  groupLessonActionSchema,
  groupLessonSchema,
} from "@/contracts/group-lesson";
import { groupBoardStateSchema } from "@/contracts/group-board";
import { sampleControllerToken } from "@/server/sample-controller";
import { learningRpc } from "@/server/learning/rpc";
export async function POST(request: NextRequest) {
  const ctx = authContext(request);
  try {
    await requireTeacher(ctx);
    const input = await readBody(request, groupLessonActionSchema, 131072);
    const data = await learningRpc(
      ctx.client,
      input.action === "board-action"
        ? "group_board_action"
        : "group_lesson_action",
      input.action === "board-action"
        ? { p_input: input.input, p_teacher_lesson: input.id }
        : { p_input: input, p_controller: sampleControllerToken(request) },
    );
    const value =
      input.action === "board-action"
        ? groupBoardStateSchema.parse(data)
        : input.action === "list"
          ? z.strictObject({ lessons: z.array(groupLessonSchema) }).parse(data)
          : groupLessonSchema.parse(data);
    return ctx.finish(NextResponse.json(value));
  } catch (error) {
    return ctx.finish(handleError(error));
  }
}
