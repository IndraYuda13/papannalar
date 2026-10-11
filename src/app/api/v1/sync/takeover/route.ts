import { NextRequest, NextResponse } from "next/server";
import { authContext, requireTeacher } from "@/server/auth/client";
import { handleError, readBody } from "@/server/http";
import { syncRecordSchema } from "@/contracts/sync";
import { takeoverSchema } from "@/contracts/sync-conflict";
import { syncRpc } from "@/server/sync";
export async function POST(request: NextRequest) {
  try {
    // Authenticate before parsing (SENTINEL F-09): an unauthenticated caller
    // must get 401, never a 422-vs-401 oracle about the body schema.
    const auth = authContext(request);
    await requireTeacher(auth);
    const input = await readBody(request, takeoverSchema);
    return auth.finish(
      NextResponse.json(
        syncRecordSchema.parse(await syncRpc(auth.client, "takeover", input)),
      ),
    );
  } catch (error) {
    return handleError(error);
  }
}
