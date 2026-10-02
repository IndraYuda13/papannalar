import "server-only";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isTeacherIdentity } from "../../contracts/auth";
import { applicationOrigin } from "./origin";
import { isSurfaceAuthCookie } from "./cookies";

type Surface = "teacher" | "board";
export function authContext(
  request: NextRequest,
  surface: Surface = "teacher",
) {
  const url = process.env["NEXT_PUBLIC_SUPABASE_URL"];
  const key = process.env["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) throw new Error("AUTH_UNAVAILABLE");
  const cookieName =
    surface === "teacher" ? "pn-teacher-auth" : "pn-board-auth";
  const changed: { name: string; value: string; options: CookieOptions }[] = [];
  const cookieHeaders: Record<string, string> = {};
  const client = createServerClient(url, key, {
    cookieOptions: {
      name: cookieName,
      path: surface === "teacher" ? "/" : "/api/v1/board",
      httpOnly: true,
      sameSite: "lax",
      secure: new URL(applicationOrigin(request)).protocol === "https:",
    },
    cookies: {
      getAll: () =>
        request.cookies
          .getAll()
          .filter((cookie) => isSurfaceAuthCookie(cookie.name, cookieName)),
      setAll(cookies, headers) {
        for (const cookie of cookies) {
          request.cookies.set(cookie.name, cookie.value);
          changed.push(cookie);
        }
        Object.assign(cookieHeaders, headers);
      },
    },
  });
  function finish(response: NextResponse) {
    for (const cookie of changed)
      response.cookies.set(cookie.name, cookie.value, cookie.options);
    for (const [header, value] of Object.entries(cookieHeaders))
      response.headers.set(header, value);
    response.headers.set("Cache-Control", "private, no-store, max-age=0");
    response.headers.set("Referrer-Policy", "no-referrer");
    return response;
  }
  return { client, finish };
}

export async function requireTeacher(context: ReturnType<typeof authContext>) {
  // getUser asks Supabase Auth to validate the token; never trust getSession.
  const { data, error } = await context.client.auth.getUser();
  if (error || !isTeacherIdentity(data.user))
    throw new Error("UNAUTHENTICATED");
  return data.user!;
}
