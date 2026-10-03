import { expect, it } from "vitest";
import { localOperation, LocalStorageError } from "../../src/local/scope";
import { LocalActionError } from "../../src/local/action-error";
it("keeps an actionable session conflict separate from a storage failure", async () => {
  const conflict = new LocalActionError("FINISH_PREVIOUS");
  await expect(
    localOperation(async () => {
      throw conflict;
    }),
  ).rejects.toBe(conflict);
  expect(JSON.stringify(conflict)).toContain("FINISH_PREVIOUS");
});
import {
  registerUpdateGuard,
  pageUpdateSafe,
} from "../../src/offline/update-safety";
it.each(["QuotaExceededError", "VersionError", "UnknownError"])(
  "storage error %s is constant and does not expose raw data",
  async (name) => {
    const raw = new Error("PRIVATE_STORAGE_CANARY");
    raw.name = name;
    const error = await localOperation(async () => {
      throw raw;
    }).catch((e) => e as Error);
    expect(error).toBeInstanceOf(LocalStorageError);
    expect(error.message).toBe("Local storage operation failed");
    expect(JSON.stringify(error)).not.toContain("PRIVATE_STORAGE_CANARY");
  },
);
it("update safety requires every surface and fails closed on storage errors", async () => {
  const teacher = registerUpdateGuard("teacher", async () => true);
  const board = registerUpdateGuard("board", () => false);
  expect(await pageUpdateSafe()).toBe(false);
  board();
  expect(await pageUpdateSafe()).toBe(true);
  const failing = registerUpdateGuard("storage", () => {
    throw new Error("unavailable");
  });
  expect(await pageUpdateSafe()).toBe(false);
  failing();
  teacher();
  expect(await pageUpdateSafe()).toBe(true);
});
