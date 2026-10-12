import { z } from "zod";
import { randomIdSchema } from "./domain";
export const TOPIC_COMPETENCIES = [
  {
    topicId: "bilangan",
    competencyId: "bilangan-operasi",
    label: "Operasi bilangan",
  },
  {
    topicId: "pecahan",
    competencyId: "pecahan-representasi",
    label: "Memahami pecahan",
  },
  {
    topicId: "pecahan",
    competencyId: "pecahan-operasi",
    label: "Operasi pecahan",
  },
  {
    topicId: "perbandingan",
    competencyId: "perbandingan-senilai",
    label: "Perbandingan senilai",
  },
  { topicId: "aljabar", competencyId: "aljabar-model", label: "Model aljabar" },
  {
    topicId: "grafik",
    competencyId: "grafik-hubungan",
    label: "Membaca hubungan pada grafik",
  },
] as const;
export const competencyMappingSchema = z
  .strictObject({
    topicId: z.string().max(80),
    competencyId: z.string().max(80),
    mappingVersion: z.literal(1),
  })
  .refine((v) =>
    TOPIC_COMPETENCIES.some(
      (c) => c.topicId === v.topicId && c.competencyId === v.competencyId,
    ),
  )
  .nullable();
export const collectionMappingSchema = z
  .strictObject({
    default: competencyMappingSchema,
    overrides: z
      .array(
        z.strictObject({
          itemId: randomIdSchema,
          mapping: competencyMappingSchema,
        }),
      )
      .max(5),
  })
  .refine(
    (v) =>
      new Set(v.overrides.map((o) => o.itemId)).size === v.overrides.length,
  );
export const emptyCollectionMapping = () => ({ default: null, overrides: [] });
export const evidenceSelectionSchema = z
  .strictObject({
    studentId: randomIdSchema,
    status: z.enum(["known", "unknown"]),
    reason: z.enum([
      "comparable",
      "no_result",
      "unmapped",
      "incomplete",
      "not_comparable",
    ]),
    evidence: z
      .strictObject({
        source: z.literal("library_cards"),
        runId: randomIdSchema,
        collectionId: randomIdSchema,
        version: z.number().int().positive(),
        responseRevision: z.number().int().positive(),
        assessedAt: z.string(),
        competencyId: z.string(),
        comparisonKey: z.string(),
        itemIds: z.array(randomIdSchema).min(1).max(5),
        correct: z.number().int().min(0).max(5),
        total: z.number().int().min(1).max(5),
      })
      .nullable(),
  })
  .refine((v) => (v.status === "known") === (v.evidence !== null));
export type CompetencyMapping = z.infer<typeof competencyMappingSchema>;
export type CollectionMapping = z.infer<typeof collectionMappingSchema>;
export type EvidenceSelection = z.infer<typeof evidenceSelectionSchema>;
