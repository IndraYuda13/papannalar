import { z } from "zod";
import {
  attendanceNumberSchema,
  parseBoundary,
  randomIdSchema,
} from "./domain";

export const publicGroupSchema = z.strictObject({
  id: randomIdSchema,
  label: z.enum([
    "Segitiga Biru",
    "Lingkaran Oranye",
    "Kotak Hijau",
    "Belah Ketupat Ungu",
  ]),
  attendanceNumbers: z.array(attendanceNumberSchema).min(1).max(40),
});

// Only the initial public projection contract; no pairing or mode engine yet.
// Roster/group bindings are ephemeral on the board, never stored in its cache.
export const boardPublicStateSchema = z.strictObject({
  schemaVersion: z.literal(1),
  groups: z.array(publicGroupSchema).max(4),
});
export type BoardPublicState = z.infer<typeof boardPublicStateSchema>;
type BoardProjectionInput = Pick<BoardPublicState, "groups">;

export function toBoardPublicState(
  input: BoardProjectionInput,
): BoardPublicState {
  return parseBoundary(boardPublicStateSchema, {
    schemaVersion: 1,
    groups: input.groups.map((group) => ({
      id: group.id,
      label: group.label,
      attendanceNumbers: group.attendanceNumbers.map((number) => number),
    })),
  });
}

export function serializeBoardState(input: BoardProjectionInput): string {
  return JSON.stringify(toBoardPublicState(input));
}
