import { type NextRequest, NextResponse } from "next/server";
import { authContext, requireTeacher } from "@/server/auth/client";
import { handleError } from "@/server/http";

export async function GET(request: NextRequest) {
  let context: ReturnType<typeof authContext> | undefined;
  try {
    context = authContext(request);
    const user = await requireTeacher(context);
    return context.finish(NextResponse.json({ id: user.id, role: "teacher" }));
  } catch (error) {
    const response = handleError(error);
    return context ? context.finish(response) : response;
  }
}
