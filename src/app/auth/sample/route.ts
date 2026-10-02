import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { authContext } from "@/server/auth/client";
import { isTeacherIdentity } from "@/contracts/auth";
import { applicationOrigin } from "@/server/auth/origin";
import { readBody, handleError } from "@/server/http";
const attempts = new Map<string, { count: number; until: number }>();
export async function POST(request: NextRequest) {
  const ctx = authContext(request);
  try {
    if (process.env["SAMPLE_ENABLED"] !== "true") throw new Error("NOT_FOUND");
    const input = await readBody(
      request,
      z.strictObject({ accessCode: z.string().max(100) }),
    );
    const ip =
        request.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown",
      now = Date.now();
    for (const [key, value] of attempts)
      if (value.until < now) attempts.delete(key);
    const bucket = attempts.get(ip) ?? { count: 0, until: now + 60000 };
    bucket.count++;
    attempts.set(ip, bucket);
    if (bucket.count > 20 || attempts.size > 10000)
      throw new Error("RATE_LIMITED");
    const code = process.env["SAMPLE_ACCESS_CODE"] ?? "";
    const local = new URL(applicationOrigin(request)).hostname === "127.0.0.1";
    if (
      (!local && code.length < 12) ||
      (code &&
        (Buffer.byteLength(code) !== Buffer.byteLength(input.accessCode) ||
          !timingSafeEqual(Buffer.from(code), Buffer.from(input.accessCode))))
    )
      throw new Error("FORBIDDEN");
    const email = process.env["SAMPLE_TEACHER_EMAIL"],
      password = process.env["SAMPLE_TEACHER_PASSWORD"],
      id = process.env["SAMPLE_TEACHER_ID"];
    if (!email || !password || !id) throw new Error("AUTH_UNAVAILABLE");
    const { data: current } = await ctx.client.auth.getUser();
    if (isTeacherIdentity(current.user)) {
      if (current.user?.id !== id) throw new Error("CONFLICT");
      return ctx.finish(NextResponse.json({ redirect: "/guru" }));
    }
    const { data, error } = await ctx.client.auth.signInWithPassword({
      email,
      password,
    });
    if (error || !isTeacherIdentity(data.user) || data.user?.id !== id)
      throw new Error("AUTH_UNAVAILABLE");
    const { data: registered, error: checkError } =
      await ctx.client.rpc("is_sample_teacher");
    if (checkError || registered !== true) {
      await ctx.client.auth.signOut({ scope: "local" });
      throw new Error("AUTH_UNAVAILABLE");
    }
    return ctx.finish(NextResponse.json({ redirect: "/guru" }));
  } catch (error) {
    return ctx.finish(handleError(error));
  }
}
