import { z } from "zod";
import { parseBoundary } from "./domain";
export const boardProfileSchema = z
  .strictObject({
    schemaVersion: z.literal(1),
    touches: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(4)]),
    pointerEvents: z.boolean(),
    indexedDb: z.boolean(),
    serviceWorker: z.boolean(),
    width: z.number().int().min(1).max(16384),
    heightPixels: z.number().int().min(1).max(16384),
    browser: z.enum(["chromium", "edge", "firefox", "safari", "unknown"]),
    major: z.number().int().min(0).max(9999),
    samples: z.number().int().min(0).max(120),
    medianMs: z.number().min(0).max(60000).nullable(),
    p95Ms: z.number().min(0).max(60000).nullable(),
    height: z.enum(["normal", "high"]),
    durationSeconds: z.number().int().min(0).max(86400),
  })
  .refine(
    (p) =>
      (p.samples === 0
        ? p.medianMs === null && p.p95Ms === null
        : p.medianMs !== null && p.p95Ms !== null && p.p95Ms >= p.medianMs) &&
      (p.pointerEvents || p.touches === 0),
  );
export type BoardProfile = z.infer<typeof boardProfileSchema>;
export function publicBoardProfile(p: BoardProfile): BoardProfile {
  return parseBoundary(boardProfileSchema, {
    schemaVersion: 1,
    touches: p.touches,
    pointerEvents: p.pointerEvents,
    indexedDb: p.indexedDb,
    serviceWorker: p.serviceWorker,
    width: p.width,
    heightPixels: p.heightPixels,
    browser: p.browser,
    major: p.major,
    samples: p.samples,
    medianMs: p.medianMs,
    p95Ms: p.p95Ms,
    height: p.height,
    durationSeconds: p.durationSeconds,
  });
}
