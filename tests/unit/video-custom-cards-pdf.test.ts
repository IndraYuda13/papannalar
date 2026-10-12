import { readFile, mkdir, writeFile, mkdtemp, rm } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { cardDrawing } from "../../src/cards/drawing";
import {
  PDFDocument,
  PDFArray,
  PDFRawStream,
  decodePDFRawStream,
} from "pdf-lib";
import jsQR from "jsqr";
import fontkit from "@pdf-lib/fontkit";
import { expect, it } from "vitest";
import { createCardPdf } from "../../src/cards/pdf/create";
import {
  cardLayout,
  a4Cells,
  layoutPayload,
  type CardKind,
} from "../../src/cards/layouts/layout-v1";
import {
  customFormPayload,
  type CustomFormBinding,
} from "../../src/contracts/custom-form";

const binding: CustomFormBinding = {
  intent: "custom_assessment",
  formId: "ba7f18ae-496f-4c11-92ab-96752a8c1b87",
  version: 2,
  pageIndex: 0,
  rows: 3,
};
const mm = 72 / 25.4;

async function pdfQrPayloads(bytes: Uint8Array, kind: CardKind) {
  const doc = await PDFDocument.load(bytes),
    page = doc.getPage(0);
  const contents = page.node.Contents();
  const streams =
    contents instanceof PDFArray ? contents.asArray() : [contents];
  const operators = streams
    .map((ref) => {
      const stream = doc.context.lookup(ref);
      if (!(stream instanceof PDFRawStream))
        throw new Error("Expected actual PDF content stream");
      return Buffer.from(decodePDFRawStream(stream).decode()).toString(
        "latin1",
      );
    })
    .join("\n");
  // Recover the QR's filled rectangles from the saved PDF's vector operators,
  // not from cardDrawing or intercepted pdf-lib calls. Text/circles are ignored.
  const rectangles = [...operators.matchAll(/q\n([\s\S]*?)\nQ/g)].flatMap(
    ([, block]) => {
      if (!/(?:^|\n)0 g\n/.test(block) || !block.includes("\nf")) return [];
      const translate = block.match(/1 0 0 1 ([\d.-]+) ([\d.-]+) cm/);
      const size = block.match(/0 0 m\n0 ([\d.-]+) l\n([\d.-]+) [\d.-]+ l/);
      return translate && size
        ? [
            {
              x: +translate[1],
              y: +translate[2],
              width: +size[2],
              height: +size[1],
            },
          ]
        : [];
    },
  );
  const qr = cardLayout(kind).qr,
    size = 280;
  const payloads = a4Cells(kind).map((cell) => {
    const pixels = new Uint8ClampedArray(size * size * 4).fill(255);
    for (const r of rectangles) {
      const x = r.x / mm - cell.x - qr.x;
      const y = 297 - (r.y + r.height) / mm - cell.y - qr.y;
      const width = r.width / mm,
        height = r.height / mm;
      if (
        x < -0.001 ||
        y < -0.001 ||
        x + width > qr.size + 0.001 ||
        y + height > qr.size + 0.001
      )
        continue;
      for (
        let row = Math.round((y * size) / qr.size);
        row < Math.round(((y + height) * size) / qr.size);
        row++
      )
        for (
          let col = Math.round((x * size) / qr.size);
          col < Math.round(((x + width) * size) / qr.size);
          col++
        ) {
          const offset = (row * size + col) * 4;
          pixels[offset] = pixels[offset + 1] = pixels[offset + 2] = 0;
        }
    }
    return jsQR(pixels, size, size)?.data;
  });
  return { doc, payloads };
}

it("custom PDF has four decodable, identical bound QRs in actual saved output", async () => {
  const bytes = await createCardPdf(
    "weekly",
    await readFile("public/fonts/atkinson-card.woff"),
    binding,
  );
  const { doc, payloads } = await pdfQrPayloads(bytes, "weekly");
  expect(doc.getPageCount()).toBe(1);
  expect(doc.getTitle()).toBe("PapanNalar - Cek pemahaman");
  expect(doc.getPage(0).getWidth()).toBeCloseTo(210 * mm, 6);
  expect(doc.getPage(0).getHeight()).toBeCloseTo(297 * mm, 6);
  expect(payloads).toEqual(Array(4).fill(customFormPayload(binding)));
  const metrics = await PDFDocument.create();
  metrics.registerFontkit(fontkit);
  const font = await metrics.embedFont(
    await readFile("public/fonts/atkinson-card.woff"),
  );
  const commands = cardDrawing("weekly", binding);
  const header = commands.find((c) => c.kind === "text" && c.y === 23);
  if (!header || header.kind !== "text")
    throw new Error("Missing bound header");
  expect(
    header.x + font.widthOfTextAtSize(header.text, header.size),
  ).toBeLessThan(cardLayout("weekly").qr.x);
  const directory = await mkdtemp(join(tmpdir(), "pn-card-binding-"));
  try {
    const file = join(directory, "cards.pdf");
    await writeFile(file, bytes);
    const savedText = execFileSync("pdftotext", [file, "-"], {
      encoding: "utf8",
    });
    const code = `${binding.formId.slice(0, 8)} · V${binding.version}`;
    expect(savedText.split(code).length - 1).toBe(4);
    const header = cardDrawing("weekly", binding).find(
      (c) => c.kind === "text" && c.y === 23,
    );
    expect(header).toMatchObject({ x: 12, y: 23, size: 3.5, text: code });

    if (process.env.PNL_PRINT_BINDING_EVIDENCE) {
      await mkdir(process.env.PNL_PRINT_BINDING_EVIDENCE, { recursive: true });
      await writeFile(
        join(process.env.PNL_PRINT_BINDING_EVIDENCE, "cards.pdf"),
        bytes,
      );
      await writeFile(
        join(process.env.PNL_PRINT_BINDING_EVIDENCE, "cards.txt"),
        savedText,
      );
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

it.each(["initial", "weekly", "exit"] as const)(
  "legacy %s PDF retains the actual QR payload",
  async (kind) => {
    const { doc, payloads } = await pdfQrPayloads(
      await createCardPdf(
        kind,
        await readFile("public/fonts/atkinson-card.woff"),
      ),
      kind,
    );
    expect(doc.getTitle()).toBe("PapanNalar - Kartu Nalar");
    expect(payloads).toEqual(
      Array(kind === "initial" ? 2 : 4).fill(layoutPayload(kind)),
    );
  },
);
