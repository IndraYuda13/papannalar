import "server-only";
import { isLocalDemoEnvironment } from "../../contracts/local-demo";
import { createHmac, randomInt } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { authContext, requireTeacher } from "../auth/client";
import { applicationOrigin } from "../auth/origin";
import {
  requireSampleController,
  sampleControllerToken,
} from "../sample-controller";
import { pairingUrl } from "../../features/classroom/pairing-url";
import { readBody, handleError } from "../http";
import {
  boardPairingSchema,
  teacherPairingSchema,
  snapshotSchema,
  challengeSchema,
  connectionPulseSchema,
  presentationResumeSchema,
} from "../../contracts/presentation";

export async function pairingRequest(
  request: NextRequest,
  surface: "teacher" | "board",
) {
  let ctx: ReturnType<typeof authContext> | undefined;
  try {
    ctx = authContext(request, surface);
    const input =
      surface === "board"
        ? await readBody(request, boardPairingSchema)
        : await readBody(request, teacherPairingSchema);
    if (surface === "teacher") {
      await requireTeacher(ctx);
      if (["claim", "publish", "revoke", "heartbeat"].includes(input.action))
        await requireSampleController(request, ctx);
    } else {
      const { data, error } = await ctx.client.auth.getUser();
      if (error || !data.user || data.user.is_anonymous !== true)
        throw new Error("UNAUTHENTICATED");
    }
    const pepper = process.env["PAIRING_SECRET"];
    if (!pepper || pepper.length < 32) throw new Error("AUTH_UNAVAILABLE");
    const hash = (value: string) =>
      createHmac("sha256", pepper).update(value).digest("hex");
    const rpc = async (action: string, params: object) => {
      const { data, error } = await ctx!.client.rpc("presentation_action", {
        p_action: action,
        p_input:
          surface === "teacher" &&
          ["claim", "publish", "revoke", "heartbeat"].includes(action)
            ? { ...params, sampleController: sampleControllerToken(request) }
            : params,
      });
      if (error) throw new Error("UNAVAILABLE");
      if (data?.error)
        throw new Error(
          ["FORBIDDEN", "NOT_FOUND", "CONFLICT", "RATE_LIMITED"].includes(
            data.error,
          )
            ? data.error
            : "UNAVAILABLE",
        );
      return data;
    };
    if (input.action === "create") {
      const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
      const data = await rpc("create", {
        codeHash: hash(code),
        ...(input.presentationId
          ? { presentationId: input.presentationId }
          : {}),
        ipHash: hash(
          request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
            "unknown",
        ),
      });
      return ctx.finish(
        NextResponse.json(
          challengeSchema.parse({
            id: data.id,
            code,
            expiresAt: data.expiresAt,
            pairingUrl: pairingUrl(applicationOrigin(request), code),
          }),
        ),
      );
    }
    if (input.action === "claim") {
      const data = await rpc("claim", {
        codeHash: hash(input.code),
        classId: input.classId,
        sessionId: input.sessionId,
        payload: input.payload,
        ...(input.controllerId ? { controllerId: input.controllerId } : {}),
        ipHash: hash(
          request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
            "unknown",
        ),
      });
      return ctx.finish(NextResponse.json(snapshotSchema.parse(data)));
    }
    if (input.action === "channel") {
      await rpc("snapshot", input);
      const url = process.env["NEXT_PUBLIC_SUPABASE_URL"]!;
      if (
        isLocalDemoEnvironment(
          process.env["PAPANNALAR_LOCAL_ADAPTER"],
          url,
          process.env["APP_ORIGIN"],
        ) &&
        request.headers.get("host") === "127.0.0.1:3100"
      )
        return ctx.finish(NextResponse.json({ kind: "snapshot" }));
      const { data } = await ctx.client.auth.getSession();
      if (!data.session) throw new Error("UNAUTHENTICATED");
      return ctx.finish(
        NextResponse.json({
          kind: "realtime",
          url,
          key: process.env["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"],
          token: data.session.access_token,
        }),
      );
    }
    if (input.action === "ack") {
      try {
        await rpc("ack", input);
        return ctx.finish(NextResponse.json({ applied: true }));
      } catch (error) {
        // An in-flight heartbeat may lose a race to the next presentation.
        // This is a negative receipt, never an ACK of an unseen revision.
        if (error instanceof Error && error.message === "CONFLICT")
          return ctx.finish(NextResponse.json({ applied: false }));
        throw error;
      }
    }
    const data = await rpc(input.action, input);
    return ctx.finish(
      NextResponse.json(
        input.action === "snapshot" || input.action === "publish"
          ? snapshotSchema.parse(data)
          : input.action === "heartbeat"
            ? connectionPulseSchema.parse(data)
            : input.action === "resume"
              ? presentationResumeSchema.parse(data)
              : data,
      ),
    );
  } catch (error) {
    const response = handleError(error);
    return ctx ? ctx.finish(response) : response;
  }
}
