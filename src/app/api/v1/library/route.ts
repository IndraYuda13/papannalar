import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { authContext, requireTeacher } from "@/server/auth/client";
import { readBody, handleError } from "@/server/http";
import {
  collectionDocumentSchema,
  libraryActionSchema,
  libraryV2ActionSchema,
  libraryStateV2Schema,
  runV2Schema,
  runDetailV2Schema,
  collectionV2Schema,
} from "@/contracts/library";
import { emptyModel, exampleFrames, checkModel } from "@/core/tools/patterns";
import { sampleControllerToken } from "@/server/sample-controller";
export async function POST(request: NextRequest) {
  const ctx = authContext(request);
  try {
    await requireTeacher(ctx);
    const input = await readBody(
      request,
      z.union([libraryActionSchema, libraryV2ActionSchema]),
      32768,
    );
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
    const { data, error } = await ctx.client.rpc(
      "contractVersion" in input ? "library_action_v2" : "library_action",
      {
        p_input: input,
        p_controller: sampleControllerToken(request),
      },
    );
    if (error) throw new Error("UNAVAILABLE");
    if (data?.error) throw new Error(String(data.error));
    const value =
      "contractVersion" in input
        ? input.action === "list"
          ? libraryStateV2Schema.parse(data)
          : ["detail", "response"].includes(input.action)
            ? runDetailV2Schema.parse(data)
            : ["save", "archive"].includes(input.action)
              ? collectionV2Schema.parse(data)
              : input.action === "roster"
                ? data
                : runV2Schema.parse(data)
        : data;
    return ctx.finish(NextResponse.json(value));
  } catch (error) {
    return ctx.finish(handleError(error));
  }
}
