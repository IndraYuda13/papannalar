import { NextRequest, NextResponse } from "next/server";
import { authContext, requireTeacher } from "@/server/auth/client";
import { handleError, readBody } from "@/server/http";
import { syncRecordSchema } from "@/contracts/sync";
import { takeoverSchema } from "@/contracts/sync-conflict";
import { syncRpc } from "@/server/sync";
export async function POST(request: NextRequest) {
  try {
    const input = await readBody(request, takeoverSchema),
      auth = authContext(request);
    await requireTeacher(auth);
    return auth.finish(
      NextResponse.json(
        syncRecordSchema.parse(await syncRpc(auth.client, "takeover", input)),
      ),
    );
  } catch (error) {
    return handleError(error);
  }
}
