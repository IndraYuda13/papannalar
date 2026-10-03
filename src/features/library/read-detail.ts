"use client";
import { runDetailSchema } from "@/contracts/library";
import { libraryCache, withPendingLibraryResponses } from "@/local/library";
import type { LocalScope } from "@/local/scope";
import { libraryCall, LibraryRequestError } from "./client";

export async function readLibraryDetail(scope: LocalScope, id: string) {
  try {
    if (!navigator.onLine) throw new TypeError("OFFLINE");
    const result = runDetailSchema.parse(
      await libraryCall({ action: "detail", id }),
    );
    const detail = await withPendingLibraryResponses(scope, result);
    await libraryCache(scope, "detail", id, detail).catch(() => undefined);
    return { detail, cached: false };
  } catch (error) {
    // Access denials and invalid responses must never reveal cached data.
    if (
      !(error instanceof TypeError) &&
      !(error instanceof LibraryRequestError && error.status >= 500)
    )
      throw error;
    const cached = await libraryCache(scope, "detail", id);
    if (!cached) throw error;
    return {
      detail: await withPendingLibraryResponses(scope, cached),
      cached: true,
    };
  }
}
