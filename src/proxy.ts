import { NextResponse, type NextRequest } from "next/server";
import { authContext, requireTeacher } from "./server/auth/client";
import { applicationOrigin } from "./server/auth/origin";

export async function proxy(request: NextRequest) {
  try {
    const context = authContext(request);
    try {
      await requireTeacher(context);
      return context.finish(NextResponse.next({ request }));
    } catch {
      return context.finish(
        NextResponse.redirect(new URL("/masuk", applicationOrigin(request))),
      );
    }
  } catch {
    return NextResponse.redirect(new URL("/masuk", applicationOrigin(request)));
  }
}

export const config = { matcher: ["/guru/:path*"] };
