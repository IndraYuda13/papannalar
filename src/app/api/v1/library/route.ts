import { NextResponse, type NextRequest } from "next/server";
import { authContext, requireTeacher } from "@/server/auth/client";
import { readBody, handleError } from "@/server/http";
import {
  collectionDocumentSchema,
  libraryActionSchema,
} from "@/contracts/library";
import { emptyModel, exampleFrames, checkModel } from "@/core/tools/patterns";
import { sampleControllerToken } from "@/server/sample-controller";
export async function POST(request: NextRequest) {
  const ctx = authContext(request);
  try {
    await requireTeacher(ctx);
    const input = await readBody(request, libraryActionSchema, 24000);
    if (input.action === "save" && input.ready) {
      const parsed = collectionDocumentSchema.safeParse(input.document);
      if (!parsed.success) throw new Error("INVALID_INPUT");
      for (const item of parsed.data.items)
        if (item.kind === "interactive") {
          try {
            emptyModel(item.tool);
            const frames = exampleFrames(item.tool);
            if (
              !frames.length ||
              !checkModel(item.tool, frames[frames.length - 1])
            )
              throw new Error();
          } catch {
            throw new Error("INVALID_INPUT");
          }
        }
    }
    const { data, error } = await ctx.client.rpc("library_action", {
      p_input: input,
      p_controller: sampleControllerToken(request),
    });
    if (error) throw new Error("UNAVAILABLE");
    if (data?.error) throw new Error(String(data.error));
    return ctx.finish(NextResponse.json(data));
  } catch (error) {
    return ctx.finish(handleError(error));
  }
}
