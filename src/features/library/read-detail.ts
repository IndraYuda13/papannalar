"use client";
import type { LocalScope } from "@/local/scope";
import { readLearningResult } from "@/local/learning-client";
export async function readLibraryDetail(scope: LocalScope, id: string) {
  const result = await readLearningResult(scope, { source: "library", id });
  if (result.source !== "library") throw new Error("INVALID_RESULT");
  return { detail: result.detail, cached: !navigator.onLine };
}
