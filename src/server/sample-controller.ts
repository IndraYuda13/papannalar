import "server-only";
import type { NextRequest } from "next/server";
import type { authContext } from "./auth/client";
import { randomIdSchema } from "@/contracts/domain";
export function sampleControllerToken(request: NextRequest) {
  const token = randomIdSchema.safeParse(
    request.cookies.get("pn-sample-controller")?.value,
  );
  return token.success ? token.data : null;
}
export async function requireSampleController(
  request: NextRequest,
  ctx: ReturnType<typeof authContext>,
) {
  const { data, error } = await ctx.client.rpc("sample_control", {
    p_token: sampleControllerToken(request),
    p_takeover: false,
    p_acquire: false,
  });
  if (error) throw new Error("UNAVAILABLE");
  if (data?.error) throw new Error("CONFLICT");
}
