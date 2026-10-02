import { NextResponse, type NextRequest } from "next/server";
import { authContext, requireTeacher } from "./server/auth/client";
import { applicationOrigin } from "./server/auth/origin";
import {
  parsePairingCode,
  PAIRING_CHALLENGE_COOKIE,
  PAIRING_CHALLENGE_TTL_MS,
} from "./features/classroom/pairing-url";

export async function proxy(request: NextRequest) {
  const origin = applicationOrigin(request);
  const code = parsePairingCode(
    `${origin}${request.nextUrl.pathname}${request.nextUrl.search}`,
    origin,
  );
  function rememberChallenge(response: NextResponse) {
    response.headers.set("Cache-Control", "private, no-store");
    response.headers.set("Referrer-Policy", "no-referrer");
    if (request.nextUrl.searchParams.has("pair"))
      response.cookies.set(
        PAIRING_CHALLENGE_COOKIE,
        code ? `${code}.${Date.now() + PAIRING_CHALLENGE_TTL_MS}` : "",
        {
          path: "/",
          maxAge: code ? PAIRING_CHALLENGE_TTL_MS / 1000 : 0,
          secure: new URL(origin).protocol === "https:",
          sameSite: "lax",
          httpOnly: false,
        },
      );
    return response;
  }
  try {
    const context = authContext(request);
    try {
      await requireTeacher(context);
      return rememberChallenge(context.finish(NextResponse.next({ request })));
    } catch {
      return rememberChallenge(
        context.finish(
          NextResponse.redirect(new URL("/masuk", applicationOrigin(request))),
        ),
      );
    }
  } catch {
    return rememberChallenge(
      NextResponse.redirect(new URL("/masuk", applicationOrigin(request))),
    );
  }
}

export const config = { matcher: ["/guru/:path*"] };
