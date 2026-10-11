import { NextRequest, NextResponse } from "next/server";
import { authContext, requireTeacher } from "@/server/auth/client";
import { handleError, readBody } from "@/server/http";
import { syncBatchSchema, type SyncAck } from "@/contracts/sync";
import { randomIdSchema } from "@/contracts/domain";
import { createSyncValidator, readSync } from "@/server/sync";
export const runtime = "nodejs";
export async function GET(request: NextRequest) {
  // Build the auth context outside the try so a rotated cookie buffered during
  // getUser() is always emitted through finish(), even on an error response
  // (T2-04: dropping it forced a re-login loop when refresh-token rotation is
  // enabled, because the used refresh token was already invalidated server-side).
  const auth = authContext(request);
  try {
    await requireTeacher(auth);
    const id = randomIdSchema.safeParse(
      request.nextUrl.searchParams.get("classId"),
    );
    if (!id.success) throw new Error("INVALID_INPUT");
    return auth.finish(NextResponse.json(await readSync(auth.client, id.data)));
  } catch (error) {
    return auth.finish(handleError(error));
  }
}
export async function POST(request: NextRequest) {
  const auth = authContext(request);
  try {
    await requireTeacher(auth);
    const { mutations } = await readBody(request, syncBatchSchema, 262144);
    const acknowledgements: SyncAck[] = [];
    // One validator per batch: class detail + current records are loaded once per
    // classId and reused across the up-to-50 mutations (T2-06), so a batch no
    // longer issues ~150+ sequential round-trips and repeated class-row locks.
    const validator = createSyncValidator(auth.client);
    for (const mutation of mutations) {
      try {
        acknowledgements.push(await validator.apply(mutation));
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
    return auth.finish(handleError(error));
  }
}
