import { expect, it } from "vitest";
import {
  boardPairingSchema,
  teacherPairingSchema,
  boardResetReceiptSchema,
} from "../../src/contracts/presentation";
import {
  readPendingBoardReset,
  rememberBoardReset,
  finishBoardReset,
} from "../../src/features/layar/board-reset";
const id = "51000000-0000-4000-8000-000000000001";
it("board reset accepts only an idempotent request identity, never a target teacher/class/foreign board", () => {
  expect(boardPairingSchema.parse({ action: "reset", resetId: id })).toEqual({
    action: "reset",
    resetId: id,
  });
  for (const extra of [
    { presentationId: id },
    { ownerId: id },
    { classId: id },
    { boardId: id },
  ])
    expect(
      boardPairingSchema.safeParse({ action: "reset", resetId: id, ...extra })
        .success,
    ).toBe(false);
  expect(
    teacherPairingSchema.safeParse({ action: "reset", resetId: id }).success,
  ).toBe(false);
  expect(boardResetReceiptSchema.safeParse({ ok: false }).success).toBe(false);
  expect(
    boardResetReceiptSchema.safeParse({ ok: true, token: "private" }).success,
  ).toBe(false);
});
it("pending reset survives reload and an older response cannot clear a newer request", () => {
  const values = new Map<string, string>();
  const storage = () => ({
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
    removeItem: (key: string) => {
      values.delete(key);
    },
  });
  expect(readPendingBoardReset(storage)).toBeUndefined();
  expect(rememberBoardReset(id, storage)).toBe(true);
  expect(readPendingBoardReset(storage)).toBe(id);
  const newer = "51000000-0000-4000-8000-000000000002";
  rememberBoardReset(newer, storage);
  finishBoardReset(id, storage);
  expect(readPendingBoardReset(storage)).toBe(newer);
  finishBoardReset(newer, storage);
  expect(readPendingBoardReset(storage)).toBeUndefined();
  values.set("pn-board-reset-pending-v1", "bad");
  expect(readPendingBoardReset(storage)).toBeUndefined();
});
it("denied storage still permits a RAM-only reset without crashing the board", () => {
  const denied = () => {
    throw new DOMException("Denied", "SecurityError");
  };
  expect(readPendingBoardReset(denied)).toBeUndefined();
  expect(rememberBoardReset(id, denied)).toBe(false);
  expect(() => finishBoardReset(id, denied)).not.toThrow();
});
