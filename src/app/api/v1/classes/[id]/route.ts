import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { updateClassSchema } from "@/contracts/classes";
import { randomIdSchema } from "@/contracts/domain";
import { authContext, requireTeacher } from "@/server/auth/client";
import { classColumns, classDetail, classDto } from "@/server/classes";
import { handleError, readBody } from "@/server/http";
import { requireSampleController } from "@/server/sample-controller";

type Params = { params: Promise<{ id: string }> };
async function getId(params: Params) {
  const result = randomIdSchema.safeParse((await params.params).id);
  if (!result.success) throw new Error("INVALID_INPUT");
  return result.data;
}
export async function GET(request: NextRequest, params: Params) {
  let context: ReturnType<typeof authContext> | undefined;
  try {
    context = authContext(request);
    await requireTeacher(context);
    return context.finish(
      NextResponse.json(await classDetail(context.client, await getId(params))),
    );
  } catch (error) {
    const response = handleError(error);
    return context ? context.finish(response) : response;
  }
}
export async function PATCH(request: NextRequest, params: Params) {
  let context: ReturnType<typeof authContext> | undefined;
  try {
    const input = await readBody(request, updateClassSchema);
    context = authContext(request);
    await requireTeacher(context);
    await requireSampleController(request, context);
    const { data, error } = await context.client
      .from("classes")
      .update({
        label: input.label,
        grade: input.grade,
        revision: input.revision + 1,
      })
      .eq("id", await getId(params))
      .eq("revision", input.revision)
      .select(classColumns)
      .maybeSingle();
    if (error) throw new Error("UNAVAILABLE");
    if (!data) throw new Error("CONFLICT");
    return context.finish(NextResponse.json({ class: classDto(data) }));
  } catch (error) {
    const response = handleError(error);
    return context ? context.finish(response) : response;
  }
}
export async function DELETE(request: NextRequest, params: Params) {
  let context: ReturnType<typeof authContext> | undefined;
  try {
    const input = await readBody(
      request,
      z.strictObject({ revision: z.number().int().positive() }),
    );
    context = authContext(request);
    await requireTeacher(context);
    await requireSampleController(request, context);
    const { data, error } = await context.client
      .from("classes")
      .delete()
      .eq("id", await getId(params))
      .eq("revision", input.revision)
      .select("id")
      .maybeSingle();
    if (error) throw new Error("UNAVAILABLE");
    if (!data) throw new Error("CONFLICT");
    return context.finish(NextResponse.json({ deleted: true }));
  } catch (error) {
    const response = handleError(error);
    return context ? context.finish(response) : response;
  }
}
