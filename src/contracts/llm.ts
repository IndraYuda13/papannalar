import { z } from "zod";
import { parseBoundary, randomIdSchema } from "./domain";

// A reference only, not proof of approval. A future server adapter must load
// owned, reviewed content itself. No student ID, attendance number or free text.
export const enrichmentReferenceSchema = z.strictObject({
  schemaVersion: z.literal(1),
  packageId: randomIdSchema,
  contentVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
});
export type EnrichmentReference = z.infer<typeof enrichmentReferenceSchema>;

export function serializeEnrichmentReference(
  input: EnrichmentReference,
): string {
  return JSON.stringify(
    parseBoundary(enrichmentReferenceSchema, {
      schemaVersion: 1,
      packageId: input.packageId,
      contentVersion: input.contentVersion,
    }),
  );
}
