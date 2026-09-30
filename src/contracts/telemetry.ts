import { z } from "zod";
import { parseBoundary } from "./domain";

// No collector is enabled. Extend these closed enums when a feature needs one.
export const diagnosticDtoSchema = z.strictObject({
  schemaVersion: z.literal(1),
  code: z.enum(["LOCAL_STORAGE_UNAVAILABLE", "SHELL_CACHE_UNAVAILABLE"]),
  feature: z.enum(["storage", "offline"]),
  durationBucket: z.enum(["under-1s", "1s-5s", "over-5s"]),
  buildVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
});
export type DiagnosticDto = z.infer<typeof diagnosticDtoSchema>;

export function serializeDiagnostic(input: DiagnosticDto): string {
  return JSON.stringify(
    parseBoundary(diagnosticDtoSchema, {
      schemaVersion: 1,
      code: input.code,
      feature: input.feature,
      durationBucket: input.durationBucket,
      buildVersion: input.buildVersion,
    }),
  );
}
