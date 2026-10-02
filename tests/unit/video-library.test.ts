import { describe, it, expect } from "vitest";
import {
  collectionDocumentSchema,
  draftDocumentSchema,
  publicLibraryItem,
  libraryNetworkAction,
} from "../../src/contracts/library";
import { jakartaDate } from "../../src/features/library/client";
const id = "90000000-0000-4000-8000-000000000001";
const card = {
  id,
  kind: "card" as const,
  prompt: "−3 + 5 = …",
  options: ["2", "−2", "8", "−8"] as [string, string, string, string],
  key: "A" as const,
  explanation: "Lima langkah ke kanan.",
};
describe("Video library strict boundaries", () => {
  it("allows complete four-choice cards but does not expose key/explanation or local identity", () => {
    const contaminated = {
      ...card,
      displayName: "PRIVATE_LOCAL_ONLY",
      studentLevel: "D1",
      email: "private@invalid",
    };
    const dto = publicLibraryItem(contaminated);
    expect(Object.keys(dto).sort()).toEqual([
      "id",
      "kind",
      "options",
      "prompt",
    ]);
    expect(JSON.stringify(dto)).not.toContain("PRIVATE_LOCAL_ONLY");
    expect(dto).not.toHaveProperty("key");
    expect(dto).not.toHaveProperty("explanation");
  });
  it("rejects local identity attached to network action/document", () => {
    expect(() =>
      libraryNetworkAction({
        ...{
          action: "save" as const,
          id,
          revision: 0,
          ready: true,
          document: { title: "Kelas", kind: "cards" as const, items: [card] },
        },
        displayName: "LOCAL",
      } as Parameters<typeof libraryNetworkAction>[0]),
    ).toThrow();
    expect(
      draftDocumentSchema.safeParse({
        title: "Soal",
        kind: "cards",
        items: [{ ...card, nickname: "LOCAL" }],
      }).success,
    ).toBe(false);
  });
  it.each([
    ["2", "2", "8", "−8"],
    ["2", "", "8", "−8"],
    ["2", " 2 ", "8", "−8"],
  ])("rejects duplicate/empty options %j", (...options) => {
    expect(
      collectionDocumentSchema.safeParse({
        title: "Soal",
        kind: "cards",
        items: [{ ...card, options }],
      }).success,
    ).toBe(false);
  });
  it("keeps incomplete drafts without marking ready", () => {
    const draft = {
      title: "",
      kind: "cards",
      items: [{ ...card, prompt: "", options: ["", "", "", ""] }],
    };
    expect(draftDocumentSchema.safeParse(draft).success).toBe(true);
    expect(collectionDocumentSchema.safeParse(draft).success).toBe(false);
  });
  it("rejects ? key, mixed types, duplicate IDs and oversized sheets", () => {
    for (const items of [
      [{ ...card, key: "?" }],
      [
        card,
        {
          id: "90000000-0000-4000-8000-000000000002",
          kind: "writing",
          prompt: "Tulis",
        },
      ],
      [card, card],
      Array.from({ length: 6 }, (_, i) => ({
        ...card,
        id: `90000000-0000-4000-8000-00000000000${i + 1}`,
      })),
    ])
      expect(
        collectionDocumentSchema.safeParse({
          title: "Soal",
          kind: "cards",
          items,
        }).success,
      ).toBe(false);
  });
  it("supports writing and exact tool config; invalid fraction is rejected before use", () => {
    expect(
      collectionDocumentSchema.safeParse({
        title: "Papan",
        kind: "interactive",
        items: [{ id, kind: "writing", prompt: "Jelaskan" }],
      }).success,
    ).toBe(true);
    expect(
      collectionDocumentSchema.safeParse({
        title: "Papan",
        kind: "interactive",
        items: [
          {
            id,
            kind: "interactive",
            prompt: "Bagi",
            tool: {
              kind: "fractions",
              operation: "add",
              left: { numerator: 1, denominator: 7 },
              right: { numerator: 1, denominator: 11 },
            },
          },
        ],
      }).success,
    ).toBe(false);
  });
  it("uses the Jakarta calendar across midnight UTC", () => {
    expect(jakartaDate(new Date("2026-09-29T16:59:59Z"))).toBe("2026-09-29");
    expect(jakartaDate(new Date("2026-09-29T17:00:00Z"))).toBe("2026-09-30");
  });
});
