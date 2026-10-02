import { PDFDocument, grayscale, PrintScaling } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { a4Cells, type CardKind } from "../layouts/layout-v1";
import { cardDrawing } from "../drawing";
import type { CustomFormBinding } from "../../contracts/custom-form";

const mm = 72 / 25.4;
// No identity input. The printed name line is blank; no teacher/student data enters PDF.
export async function createCardPdf(
  kind: CardKind,
  fontBytes: Uint8Array,
  binding?: CustomFormBinding,
): Promise<Uint8Array> {
  // Snapshot the bound drawing before the first asynchronous operation.
  const drawing = cardDrawing(kind, binding);
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const font = await doc.embedFont(fontBytes, { subset: true });
  doc.setTitle(
    binding ? "PapanNalar - Cek pemahaman" : "PapanNalar - Kartu Nalar",
  );
  doc.setLanguage("id-ID");
  doc.catalog.getOrCreateViewerPreferences().setPrintScaling(PrintScaling.None);
  const page = doc.addPage([210 * mm, 297 * mm]);
  for (const cell of a4Cells(kind))
    for (const c of drawing) {
      const x = (cell.x + c.x) * mm;
      const y = (297 - cell.y - c.y) * mm;
      if (c.kind === "text")
        page.drawText(c.text, {
          x,
          y,
          size: c.size * mm,
          font,
          color: grayscale(0),
        });
      else if (c.kind === "rect")
        page.drawRectangle({
          x,
          y: y - c.height * mm,
          width: c.width * mm,
          height: c.height * mm,
          color: grayscale(c.gray),
        });
      else
        page.drawCircle({
          x,
          y,
          size: c.radius * mm,
          color: grayscale(c.gray ?? 1),
          borderColor: grayscale(0),
          borderWidth: 0.25 * mm,
        });
    }
  return doc.save();
}
