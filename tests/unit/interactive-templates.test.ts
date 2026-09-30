import { describe, expect, it } from "vitest";
import {
  INTERACTIVE_HELP,
  templateItem,
} from "../../src/features/library/templates";
import {
  collectionDocumentSchema,
  publicLibraryItem,
} from "../../src/contracts/library";
import { checkModel, exampleFrames } from "../../src/core/tools/patterns";

const id = "90000000-0000-4000-8000-000000000091";
const examples = Object.entries(INTERACTIVE_HELP).flatMap(([kind, help]) =>
  help.templates.map((template) => ({ kind, label: template.label, template })),
);

describe("Interactive authoring examples use real deterministic engines", () => {
  it.each(examples)(
    "$kind / $label is ready to save, preview and solve",
    ({ kind, template }) => {
      const item = templateItem(id, template);
      expect(
        item.kind === "writing"
          ? "writing"
          : item.kind === "interactive"
            ? item.tool.kind
            : "card",
      ).toBe(kind);
      expect(
        collectionDocumentSchema.safeParse({
          title: "Contoh",
          kind: "interactive",
          items: [item],
        }).success,
      ).toBe(true);
      const dto = publicLibraryItem(item);
      expect(dto.id).toBe(id);
      if (item.kind === "interactive") {
        const frames = exampleFrames(item.tool);
        expect(frames.length).toBeGreaterThan(1);
        expect(checkModel(item.tool, frames.at(-1)!)).toBe(true);
      }
    },
  );
  it("offers 2–4 unique examples for each of the six tools and writing", () => {
    expect(Object.keys(INTERACTIVE_HELP).sort()).toEqual([
      "algebra",
      "balance",
      "fractions",
      "graphs",
      "number-line",
      "ratio",
      "writing",
    ]);
    for (const help of Object.values(INTERACTIVE_HELP)) {
      expect(help.templates.length).toBeGreaterThanOrEqual(2);
      expect(help.templates.length).toBeLessThanOrEqual(4);
      expect(new Set(help.templates.map((t) => t.id)).size).toBe(
        help.templates.length,
      );
    }
  });
  it("preserves the question ID and allows only public fields when filling a template", () => {
    const example = INTERACTIVE_HELP["number-line"].templates[0];
    const contaminated = {
      ...example,
      displayName: "LOCAL_ONLY_SENTINEL",
      item: { ...example.item, nickname: "LOCAL_ONLY_SENTINEL" },
    };
    const item = templateItem(id, contaminated);
    expect(Object.keys(item).sort()).toEqual(["id", "kind", "prompt", "tool"]);
    expect(item.id).toBe(id);
    expect(JSON.stringify(item)).not.toContain("LOCAL_ONLY_SENTINEL");
    if (item.kind !== "interactive")
      throw new Error("Expected interactive example");
    if (item.tool.kind === "number-line") item.tool.origin.numerator = 99;
    expect(templateItem(id, example)).not.toEqual(item);
  });
});
