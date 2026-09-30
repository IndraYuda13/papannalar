import { PDFDocument, grayscale, type PDFFont, type PDFPage } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { toPublicQuestion } from "../../contracts/package";
import type { ActivitySet } from "../../core/package/build";
import { promptText } from "../../content/templates/format";
import {
  independentQuestion,
  optionalQuestion,
} from "../../core/package/independent";

function lines(
  text: string,
  font: PDFFont,
  size: number,
  width: number,
): string[] {
  const result: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(next, size) > width && line) {
      result.push(line);
      line = word;
    } else line = next;
  }
  if (line) result.push(line);
  return result;
}
function text(
  page: PDFPage,
  value: string,
  y: number,
  font: PDFFont,
  size = 13,
) {
  for (const line of lines(value, font, size, 495)) {
    page.drawText(line, { x: 50, y, font, size });
    y -= size * 1.4;
  }
  return y;
}
// Only math content is projected. No roster, local labels or student identities enter a PDF.
export async function createIndependentPdf(
  activity: ActivitySet,
  grade: number,
  fontBytes: Uint8Array,
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const font = await doc.embedFont(fontBytes, { subset: true });
  doc.setTitle("PapanNalar - Tugas Mandiri Berdua");
  doc.setLanguage("id-ID");
  let page = doc.addPage([595.28, 841.89]);
  let y = text(page, "PapanNalar · Tugas Mandiri", 790, font, 21);
  y = text(page, "Untuk dua siswa · 3 wajib + 1 boleh", y - 10, font);
  y =
    text(
      page,
      "Kerjakan di buku bersama pasanganmu. Gambar model dan jelaskan alasanmu.",
      y - 8,
      font,
    ) - 22;
  const questions = [
    ...activity.independent.map(independentQuestion),
    optionalQuestion(activity.optional),
  ];
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i],
      projected = toPublicQuestion(q);
    const instruction = `${i + 1}. ${i === 3 ? "Boleh: " : "Wajib: "}${promptText(projected.prompt)}`;
    const height =
      lines(instruction, font, 15, 495).length * 21 +
      (grade <= 3 ? 55 : 0) +
      90;
    if (y - height < 55) {
      page = doc.addPage([595.28, 841.89]);
      y = 790;
    }
    y = text(page, instruction, y, font, 15);
    if (grade <= 3) {
      const { a, b, c, d } = q.params;
      if (q.stepId === "B4" || (q.stepId === "A4" && !d)) {
        for (let j = 0; j < b; j++)
          page.drawRectangle({
            x: 50 + j * (180 / b),
            y: y - 26,
            width: 180 / b,
            height: 25,
            borderColor: grayscale(0),
            borderWidth: 1,
            color: grayscale(j < a ? 0.4 : 1),
          });
      } else {
        const count =
          q.stepId === "A4" && d
            ? c
            : q.stepId === "A3"
              ? a
              : Math.min(20, Math.abs(a));
        for (let j = 0; j < count; j++)
          page.drawCircle({
            x: 57 + (j % 10) * 22,
            y: y - 12 - Math.floor(j / 10) * 20,
            size: 6,
            borderColor: grayscale(0),
            borderWidth: 1,
            color: grayscale(0.8),
          });
      }
      y -= 55;
    }
    y -= 12;
    page.drawRectangle({
      x: 50,
      y: y - 56,
      width: 495,
      height: 56,
      borderColor: grayscale(0.55),
      borderWidth: 0.5,
    });
    y -= 78;
  }
  for (const p of doc.getPages())
    text(
      p,
      "Konten draft untuk demo · review guru diperlukan sebelum pilot.",
      27,
      font,
      9,
    );
  return doc.save();
}
