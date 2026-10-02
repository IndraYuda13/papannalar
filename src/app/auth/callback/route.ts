import { type NextRequest, NextResponse } from "next/server";
import { authContext, requireTeacher } from "@/server/auth/client";
import { applicationOrigin } from "@/server/auth/origin";

export async function GET(request: NextRequest) {
  let context: ReturnType<typeof authContext> | undefined;
  try {
    context = authContext(request);
    const code = request.nextUrl.searchParams.get("code");
    if (!code || code.length > 2048) throw new Error("INVALID_LINK");
    const { error } = await context.client.auth.exchangeCodeForSession(code);
    if (error) throw error;
    await requireTeacher(context);
    // Fixed destination; ignore attacker-supplied next/redirect URLs.
    return context.finish(
      NextResponse.redirect(new URL("/guru", applicationOrigin(request))),
    );
  } catch {
    const response = NextResponse.redirect(
      new URL("/masuk?error=tautan", applicationOrigin(request)),
    );
    response.headers.set("Cache-Control", "no-store");
    response.headers.set("Referrer-Policy", "no-referrer");
    return context ? context.finish(response) : response;
  }
}
