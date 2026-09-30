import { mkdir, readFile, writeFile } from "node:fs/promises";
import { PDFDocument } from "pdf-lib";
import jsQR from "jsqr";
import { describe, expect, it } from "vitest";
import {
  a4Cells,
  CARD_KINDS,
  cardLayout,
  decodeLayout,
  layoutPayload,
} from "../../src/cards/layouts/layout-v1";
import { cardDrawing, cardSvg } from "../../src/cards/drawing";
import { createCardPdf } from "../../src/cards/pdf/create";

describe("Single card layout and printable PDF", () => {
  it.each(CARD_KINDS)(
    "%s A4 cells, marker/ROI geometry and private-free QR",
    async (kind) => {
      const layout = cardLayout(kind);
      expect(layout.markers).toHaveLength(4);
      expect(layout.answers).toHaveLength(layout.rows);
      expect(layout.answers.every((row) => row.length === 5)).toBe(true);
      expect(layout.tens).toHaveLength(5);
      expect(layout.units).toHaveLength(10);
      expect(a4Cells(kind)).toHaveLength(kind === "initial" ? 2 : 4);
      expect(decodeLayout(layoutPayload(kind))).toBe(kind);
      expect(layoutPayload(kind)).not.toMatch(/student|name|absen|class|https/);
      for (const c of cardDrawing(kind)) {
        expect(c.x).toBeGreaterThanOrEqual(0);
        expect(c.y).toBeGreaterThanOrEqual(0);
        expect(
          c.x +
            (c.kind === "rect" ? c.width : c.kind === "circle" ? c.radius : 0),
        ).toBeLessThan(layout.width);
        expect(
          c.y +
            (c.kind === "rect" ? c.height : c.kind === "circle" ? c.radius : 0),
        ).toBeLessThan(layout.height);
      }
      const size = 240;
      const pixels = new Uint8ClampedArray(size * size * 4).fill(255);
      for (const c of cardDrawing(kind))
        if (
          c.kind === "rect" &&
          c.x >= layout.qr.x &&
          c.y >= layout.qr.y &&
          c.x + c.width <= layout.qr.x + layout.qr.size &&
          c.y + c.height <= layout.qr.y + layout.qr.size
        ) {
          for (
            let y = Math.round(((c.y - layout.qr.y) * size) / layout.qr.size);
            y <
            Math.round(
              ((c.y + c.height - layout.qr.y) * size) / layout.qr.size,
            );
            y++
          )
            for (
              let x = Math.round(((c.x - layout.qr.x) * size) / layout.qr.size);
              x <
              Math.round(
                ((c.x + c.width - layout.qr.x) * size) / layout.qr.size,
              );
              x++
            ) {
              const offset = (y * size + x) * 4;
              pixels[offset] = pixels[offset + 1] = pixels[offset + 2] = 0;
            }
        }
      expect(jsQR(pixels, size, size)?.data).toBe(layoutPayload(kind));
      const font = await readFile("public/fonts/atkinson-card.woff");
      const pdf = await createCardPdf(kind, font);
      const parsed = await PDFDocument.load(pdf);
      expect(parsed.getPageCount()).toBe(1);
      expect(parsed.getPage(0).getWidth()).toBeCloseTo((210 * 72) / 25.4, 6);
      expect(parsed.getPage(0).getHeight()).toBeCloseTo((297 * 72) / 25.4, 6);
      expect(parsed.getTitle()).toBe("PapanNalar - Kartu Nalar");
      await mkdir("artifacts/qa/M03/m03a", { recursive: true });
      await writeFile(`artifacts/qa/M03/m03a/${kind}.pdf`, pdf);
      await writeFile(`artifacts/qa/M03/m03a/${kind}.svg`, cardSvg(kind));
    },
  );
  it("unknown layout versions, data appended to QR and unsupported kinds fail closed", () => {
    for (const payload of [
      "PN|layout=2|kind=weekly|rows=5",
      layoutPayload("weekly") + "|name=CANARY",
      "https://example.invalid",
      "PN|layout=1|kind=exit|rows=5",
    ])
      expect(decodeLayout(payload)).toBeNull();
    expect(() => cardLayout("other" as "weekly")).toThrow();
  });
});
