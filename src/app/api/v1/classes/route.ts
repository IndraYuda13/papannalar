import { NextResponse, type NextRequest } from "next/server";
import { createClassSchema } from "@/contracts/classes";
import { runtimeModeSchema } from "@/contracts/domain";
import { authContext, requireTeacher } from "@/server/auth/client";
import {
  classColumns,
  classDto,
  createClass,
  classDetail,
} from "@/server/classes";
import { handleError, readBody } from "@/server/http";
import { requireSampleController } from "@/server/sample-controller";

export async function GET(request: NextRequest) {
  let context: ReturnType<typeof authContext> | undefined;
  try {
    context = authContext(request);
    await requireTeacher(context);
    const mode = runtimeModeSchema.safeParse(
      request.nextUrl.searchParams.get("mode") ?? "pilot",
    );
    if (!mode.success) throw new Error("INVALID_INPUT");
    const { data, error } = await context.client
      .from("classes")
      .select(classColumns)
      .eq("runtime_mode", mode.data)
      .order("created_at");
    if (error || !data) throw new Error("UNAVAILABLE");
    return context.finish(NextResponse.json({ classes: data.map(classDto) }));
  } catch (error) {
    const response = handleError(error);
    return context ? context.finish(response) : response;
  }
}
export async function POST(request: NextRequest) {
  let context: ReturnType<typeof authContext> | undefined;
  try {
    const input = await readBody(request, createClassSchema);
    context = authContext(request);
    await requireTeacher(context);
    await requireSampleController(request, context);
    await createClass(context.client, input);
    return context.finish(
      NextResponse.json(await classDetail(context.client, input.id), {
        status: 201,
      }),
    );
  } catch (error) {
    const response = handleError(error);
    return context ? context.finish(response) : response;
  }
}
