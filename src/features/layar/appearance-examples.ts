import {
  libraryBoardSchema,
  type LibraryBoardState,
} from "../../contracts/library";

export const APPEARANCE_EXAMPLES = [
  { id: "lift", label: "Lift" },
  { id: "fractions", label: "Pecahan" },
  { id: "choices", label: "Pilihan ganda" },
] as const;
export type AppearanceExample = (typeof APPEARANCE_EXAMPLES)[number];
// Identical public questions for every preset. No names, keys, session or pairing.
export function appearanceExample(
  example: AppearanceExample,
): LibraryBoardState["item"] {
  if (example.id === "choices")
    return libraryBoardSchema.shape.item.parse({
      id: "833df671-2f7e-4428-b372-3313d29a456f",
      kind: "card",
      prompt: "−3 − 5 = …",
      options: ["2", "−2", "−8", "8"],
    });
  return libraryBoardSchema.shape.item.parse({
    id: "e773a458-5105-4825-931e-2f33c887625f",
    kind: "interactive",
    prompt:
      example.id === "fractions"
        ? "Warnai 3/4 dari satu utuh."
        : "Lift dari lantai −2 ke lantai 5. Berapa perpindahannya?",
    ...(example.id === "fractions"
      ? {
          tool: {
            kind: "fractions" as const,
            operation: "represent" as const,
            left: { numerator: 3, denominator: 4 },
            right: { numerator: 0, denominator: 2 },
          },
        }
      : {
          tool: {
            kind: "number-line",
            origin: { numerator: -2, denominator: 1 },
            delta: { numerator: 7, denominator: 1 },
            orientation: "vertical",
          },
        }),
  });
}
