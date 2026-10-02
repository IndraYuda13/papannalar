import { z } from "zod";
import {
  parseBoundary,
  randomIdSchema,
  runtimeModeSchema,
} from "../contracts/domain";

export const localScopeSchema = z.strictObject({
  ownerId: randomIdSchema,
  mode: runtimeModeSchema,
});
export type LocalScope = z.infer<typeof localScopeSchema>;
export class LocalStorageError extends Error {
  constructor(public readonly code: "QUOTA" | "VERSION" | "UNAVAILABLE") {
    super("Local storage operation failed");
    this.name = "LocalStorageError";
  }
}

export function localDatabaseName(
  prefix: "pn-data" | "pn-names",
  input: LocalScope,
) {
  const scope = parseBoundary(localScopeSchema, input);
  if (typeof window === "undefined" || !globalThis.indexedDB) {
    throw new Error("Local storage unavailable");
  }
  return `${prefix}:${scope.mode}:${scope.ownerId}`;
}

export async function localOperation<T>(
  operation: () => Promise<T>,
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    // Never attach the raw record, name or browser exception to diagnostics.
    const name = error instanceof Error ? error.name : "";
    const code =
      name === "QuotaExceededError"
        ? "QUOTA"
        : name === "VersionError"
          ? "VERSION"
          : "UNAVAILABLE";
    if (typeof window !== "undefined")
      window.dispatchEvent(
        new CustomEvent("pn-local-storage-error", { detail: code }),
      );
    throw new LocalStorageError(code);
  }
}
