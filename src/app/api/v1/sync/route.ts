import { NextRequest, NextResponse } from "next/server";
import { authContext, requireTeacher } from "@/server/auth/client";
import { handleError, readBody } from "@/server/http";
import { syncBatchSchema, type SyncAck } from "@/contracts/sync";
import { randomIdSchema } from "@/contracts/domain";
import { applySync, readSync } from "@/server/sync";
export const runtime = "nodejs";
export async function GET(request: NextRequest) {
  try {
    const auth = authContext(request);
    await requireTeacher(auth);
    const id = randomIdSchema.safeParse(
      request.nextUrl.searchParams.get("classId"),
    );
    if (!id.success) throw new Error("INVALID_INPUT");
    return auth.finish(NextResponse.json(await readSync(auth.client, id.data)));
  } catch (error) {
    return handleError(error);
  }
}
export async function POST(request: NextRequest) {
  try {
    const auth = authContext(request);
    await requireTeacher(auth);
    const { mutations } = await readBody(request, syncBatchSchema, 262144);
    const acknowledgements: SyncAck[] = [];
    for (const mutation of mutations) {
      try {
        acknowledgements.push(await applySync(auth.client, mutation));
      } catch (error) {
        if (
          !(error instanceof Error) ||
          !["CONFLICT", "INVALID_INPUT"].includes(error.message)
        )
          throw error;
        acknowledgements.push({
          eventId: mutation.eventId,
          status: error.message === "CONFLICT" ? "conflict" : "rejected",
          revision: mutation.baseRevision,
          sequence: 0,
        });
      }
    }
    return auth.finish(NextResponse.json({ acknowledgements }));
  } catch (error) {
    return handleError(error);
  }
}
