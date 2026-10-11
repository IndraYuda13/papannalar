import { NextRequest, NextResponse } from "next/server";
import { authContext, requireTeacher } from "@/server/auth/client";
import { handleError, readBody } from "@/server/http";
import { syncRecordSchema } from "@/contracts/sync";
import { takeoverSchema } from "@/contracts/sync-conflict";
import { syncRpc } from "@/server/sync";
export async function POST(request: NextRequest) {
  // Auth context built outside the try so a rotated cookie is still emitted on
  // an error response (T2-04), matching the sibling /sync route.
  const auth = authContext(request);
  try {
    await requireTeacher(auth);
    const input = await readBody(request, takeoverSchema);
    return auth.finish(
      NextResponse.json(
        syncRecordSchema.parse(await syncRpc(auth.client, "takeover", input)),
      ),
    );
  } catch (error) {
    return auth.finish(handleError(error));
  }
}
