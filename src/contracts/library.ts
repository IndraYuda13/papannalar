import { z } from "zod";
import { randomIdSchema } from "./domain";
import { publicToolSchema, publicTool } from "./tools";

export const CHOICES = ["A", "B", "C", "D"] as const;
export const answerSchema = z.enum(["A", "B", "C", "D", "?"]);
const text = z.string().trim().min(1).max(400);
const base = { id: randomIdSchema, prompt: text };
export const cardItemSchema = z
  .strictObject({
    ...base,
    kind: z.literal("card"),
    options: z.tuple([text, text, text, text]),
    key: z.enum(CHOICES),
    explanation: z.string().trim().max(600),
  })
  .refine(
    (i) =>
      new Set(i.options.map((o) => o.trim().toLocaleLowerCase("id"))).size ===
      4,
    { message: "Empat pilihan harus berbeda.", path: ["options"] },
  );
export const interactiveItemSchema = z.strictObject({
  ...base,
  kind: z.literal("interactive"),
  tool: publicToolSchema,
});
export const writingItemSchema = z.strictObject({
  ...base,
  kind: z.literal("writing"),
});
export const libraryItemSchema = z.union([
  cardItemSchema,
  interactiveItemSchema,
  writingItemSchema,
]);
export type LibraryItem = z.infer<typeof libraryItemSchema>;
export const collectionDocumentSchema = z
  .strictObject({
    title: z.string().trim().min(1).max(90),
    kind: z.enum(["cards", "interactive"]),
    items: z.array(libraryItemSchema).min(1).max(5),
  })
  .refine(
    (d) =>
      d.items.every((i) =>
        d.kind === "cards" ? i.kind === "card" : i.kind !== "card",
      ),
    { message: "Gunakan satu jenis kumpulan.", path: ["items"] },
  )
  .refine((d) => new Set(d.items.map((i) => i.id)).size === d.items.length);
export type CollectionDocument = z.infer<typeof collectionDocumentSchema>;
// Draft accepts incomplete teacher text; ready is separately solver/choice validated.
export const draftDocumentSchema = z.strictObject({
  title: z.string().max(90),
  kind: z.enum(["cards", "interactive"]),
  items: z
    .array(
      z.union([
        z.strictObject({
          ...base,
          prompt: z.string().max(400),
          kind: z.literal("card"),
          options: z.tuple([
            z.string().max(400),
            z.string().max(400),
            z.string().max(400),
            z.string().max(400),
          ]),
          key: z.enum(CHOICES),
          explanation: z.string().max(600),
        }),
        z.strictObject({
          ...base,
          prompt: z.string().max(400),
          kind: z.literal("interactive"),
          tool: publicToolSchema,
        }),
        z.strictObject({
          ...base,
          prompt: z.string().max(400),
          kind: z.literal("writing"),
        }),
      ]),
    )
    .max(5),
});
export type DraftDocument = z.infer<typeof draftDocumentSchema>;
export const collectionSchema = z.strictObject({
  id: randomIdSchema,
  source: z.enum(["system", "teacher"]),
  revision: z.number().int().positive(),
  status: z.enum(["draft", "ready", "archived"]),
  document: draftDocumentSchema,
  version: z.number().int().nonnegative(),
});
export type Collection = z.infer<typeof collectionSchema>;
const rosterSchema = z
  .array(
    z.strictObject({
      id: randomIdSchema,
      attendanceNumber: z.number().int().min(1).max(40),
    }),
  )
  .max(40);
export const runSchema = z.strictObject({
  id: randomIdSchema,
  classId: randomIdSchema,
  classLabel: z.string(),
  collectionId: randomIdSchema,
  version: z.number().int().positive(),
  document: collectionDocumentSchema,
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  mode: z.enum(["teach", "assessment"]),
  status: z.enum(["active", "closed"]),
  position: z.number().int().min(0).max(4),
  revision: z.number().int().positive(),
  formId: randomIdSchema,
  roster: rosterSchema,
  synthetic: z.boolean(),
});
export type LibraryRun = z.infer<typeof runSchema>;
export const responseSchema = z.strictObject({
  studentId: randomIdSchema,
  answers: z.array(answerSchema).min(1).max(5),
  revision: z.number().int().positive(),
  correct: z.number().int().min(0).max(5),
  status: z.enum(["received", "review"]),
});
export type LibraryResponse = z.infer<typeof responseSchema>;
export const libraryStateSchema = z.strictObject({
  collections: z.array(collectionSchema),
  runs: z.array(runSchema),
  sample: z.boolean(),
});
export const runDetailSchema = z.strictObject({
  run: runSchema,
  responses: z.array(responseSchema),
});
const itemPublic = z.union([
  z.strictObject({
    ...base,
    kind: z.literal("card"),
    options: z.tuple([text, text, text, text]),
  }),
  interactiveItemSchema,
  writingItemSchema,
]);
export const libraryBoardSchema = z.strictObject({
  id: randomIdSchema,
  title: z.string().max(90),
  position: z.number().int().min(0).max(4),
  total: z.number().int().min(1).max(5),
  revision: z.number().int().positive(),
  item: itemPublic,
  status: z.enum(["active", "closed"]),
});
export type LibraryBoardState = z.infer<typeof libraryBoardSchema>;
export function publicLibraryItem(i: LibraryItem): z.infer<typeof itemPublic> {
  if (i.kind === "card")
    return itemPublic.parse({
      id: i.id,
      kind: i.kind,
      prompt: i.prompt,
      options: i.options.map((o) => o),
    });
  if (i.kind === "writing")
    return itemPublic.parse({ id: i.id, kind: i.kind, prompt: i.prompt });
  return itemPublic.parse({
    id: i.id,
    kind: i.kind,
    prompt: i.prompt,
    tool: publicTool(i.tool),
  });
}
export const libraryActionSchema = z.discriminatedUnion("action", [
  z.strictObject({ action: z.literal("list") }),
  z.strictObject({
    action: z.literal("save"),
    id: randomIdSchema,
    revision: z.number().int().nonnegative(),
    ready: z.boolean(),
    document: draftDocumentSchema,
  }),
  z.strictObject({
    action: z.literal("archive"),
    id: randomIdSchema,
    revision: z.number().int().positive(),
  }),
  z.strictObject({
    action: z.literal("start"),
    id: randomIdSchema,
    classId: randomIdSchema,
    collectionId: randomIdSchema,
    version: z.number().int().positive(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    mode: z.enum(["teach", "assessment"]),
  }),
  z.strictObject({ action: z.literal("detail"), id: randomIdSchema }),
  z.strictObject({
    action: z.literal("position"),
    id: randomIdSchema,
    revision: z.number().int().positive(),
    position: z.number().int().min(0).max(4),
  }),
  z.strictObject({
    action: z.literal("close"),
    id: randomIdSchema,
    revision: z.number().int().positive(),
  }),
  z.strictObject({
    action: z.literal("response"),
    id: randomIdSchema,
    formId: randomIdSchema,
    pageIndex: z.literal(0),
    version: z.number().int().positive(),
    studentId: randomIdSchema,
    answers: z.array(answerSchema).min(1).max(5),
    revision: z.number().int().nonnegative(),
    status: z.enum(["received", "review"]),
  }),
  z.strictObject({
    action: z.literal("roster"),
    classId: randomIdSchema,
    studentId: randomIdSchema,
    attendanceNumber: z.number().int().min(1).max(40),
    active: z.boolean(),
  }),
]);
export type LibraryAction = z.infer<typeof libraryActionSchema>;
export function libraryNetworkAction(a: LibraryAction): LibraryAction {
  // Strict parsing rejects prohibited keys instead of serializing a local view.
  return libraryActionSchema.parse(a);
}
