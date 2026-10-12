import { PDFDocument, grayscale, PrintScaling, type PDFFont } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import {
  printAssignmentSchema,
  type PrintAssignment,
} from "@/contracts/print-assignment";

function lines(
  text: string,
  font: PDFFont,
  size: number,
  width: number,
): string[] {
  const result: string[] = [];
  for (const paragraph of text.split(/\r?\n/)) {
    let line = "";
    for (const word of paragraph.split(/\s+/)) {
      if (!word) continue;
      const candidate = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) <= width) {
        line = candidate;
        continue;
      }
      if (line) {
        result.push(line);
        line = "";
      }
      // Long unbroken tokens must not escape the printable width.
      for (const character of word) {
        if (font.widthOfTextAtSize(line + character, size) > width && line) {
          result.push(line);
          line = "";
        }
        line += character;
      }
    }
    result.push(line);
  }
  return result;
}

export async function createQuestionSheetPdf(
  input: PrintAssignment,
  fontBytes: Uint8Array,
): Promise<Uint8Array> {
  // Strict allowlist is captured before async font loading; keys and roster never reach the PDF.
  const print = printAssignmentSchema.parse(input);
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const font = await doc.embedFont(fontBytes, { subset: true });
  doc.setTitle(`PapanNalar - Lembar soal - ${print.code}`);
  doc.setLanguage("id-ID");
  doc.catalog.getOrCreateViewerPreferences().setPrintScaling(PrintScaling.None);
  const width = 595.28,
    height = 841.89,
    margin = 48,
    lineHeight = 19;
  let page = doc.addPage([width, height]),
    y = height - margin;
  const heading = () => {
    page.drawText("PapanNalar · Lembar soal", { x: margin, y, size: 16, font });
    y -= 26;
    for (const line of lines(print.title, font, 14, width - margin * 2)) {
      page.drawText(line, { x: margin, y, size: 14, font });
      y -= lineHeight;
    }
    page.drawText(`Kode tugas ${print.code} · Versi ${print.version}`, {
      x: margin,
      y,
      size: 10,
      font,
    });
    y -= 25;
    page.drawText("Isi nomor absen dan jawaban pada Kartu Nalar yang cocok.", {
      x: margin,
      y,
      size: 10,
      font,
    });
    y -= 30;
  };
  const newPage = () => {
    page = doc.addPage([width, height]);
    y = height - margin;
    heading();
  };
  const draw = (text: string, indent = 0, size = 12) => {
    for (const line of lines(text, font, size, width - margin * 2 - indent)) {
      if (y < margin + 24) newPage();
      page.drawText(line, {
        x: margin + indent,
        y,
        size,
        font,
        color: grayscale(0),
      });
      y -= lineHeight;
    }
  };
  heading();
  print.items.forEach((item, index) => {
    const estimate =
      lines(`${index + 1}. ${item.prompt}`, font, 12, width - margin * 2)
        .length *
        lineHeight +
      item.options.reduce(
        (n, o) =>
          n + lines(o, font, 12, width - margin * 2 - 20).length * lineHeight,
        0,
      ) +
      50;
    if (estimate <= height - 210 && y - estimate < margin + 24) newPage();
    draw(`${index + 1}. ${item.prompt}`);
    y -= 6;
    item.options.forEach((option, i) => draw(`${"ABCD"[i]}. ${option}`, 20));
    draw("? · Belum tahu", 20, 11);
    y -= 20;
  });
  doc.getPages().forEach((p, i) =>
    p.drawText(`${print.code} · Halaman ${i + 1}/${doc.getPageCount()}`, {
      x: margin,
      y: 25,
      size: 9,
      font,
    }),
  );
  return doc.save();
}
