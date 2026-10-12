import { NextResponse, type NextRequest } from "next/server";
import { authContext, requireTeacher } from "@/server/auth/client";
import { readBody, handleError } from "@/server/http";
import {
  resultsActionSchema,
  resultsIndexSchema,
  resultDetailSchema,
} from "@/contracts/results-index";
import { learningRpc } from "@/server/learning/rpc";
export async function POST(request: NextRequest) {
  const ctx = authContext(request);
  try {
    await requireTeacher(ctx);
    const input = await readBody(request, resultsActionSchema);
    const data = await learningRpc(ctx.client, "learning_results", {
      p_input: input,
    });
    return ctx.finish(
      NextResponse.json(
        input.action === "list"
          ? resultsIndexSchema.parse(data)
          : resultDetailSchema.parse(data),
      ),
    );
  } catch (error) {
    return ctx.finish(handleError(error));
  }
}
