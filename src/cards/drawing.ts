import QRCode from "qrcode";
import {
  CARD_OPTIONS,
  cardLayout,
  layoutPayload,
  type CardKind,
} from "./layouts/layout-v1";
import {
  customFormPayload,
  parseCustomFormBinding,
  type CustomFormBinding,
} from "../contracts/custom-form";

export type DrawCommand =
  | {
      kind: "rect";
      x: number;
      y: number;
      width: number;
      height: number;
      gray: number;
    }
  | {
      kind: "circle";
      x: number;
      y: number;
      radius: number;
      gray: number | null;
    }
  | { kind: "text"; x: number; y: number; size: number; text: string };

export function cardDrawing(
  kind: CardKind,
  binding?: CustomFormBinding,
): readonly DrawCommand[] {
  const form =
    binding === undefined ? undefined : parseCustomFormBinding(binding);
  if (form && kind !== "weekly")
    throw new Error("Custom forms require the weekly layout");
  const l = cardLayout(kind);
  const commands: DrawCommand[] = [];
  const text = (x: number, y: number, size: number, text: string) =>
    commands.push({ kind: "text", x, y, size, text });
  for (const marker of l.markers)
    commands.push({
      kind: "rect",
      x: marker.x - 2.5,
      y: marker.y - 2.5,
      width: l.markerSize,
      height: l.markerSize,
      gray: 0,
    });
  const qr = QRCode.create(
    form ? customFormPayload(form) : layoutPayload(kind),
    { errorCorrectionLevel: "M" },
  );
  const moduleSize = l.qr.size / (qr.modules.size + 8);
  for (let y = 0; y < qr.modules.size; y++)
    for (let x = 0; x < qr.modules.size; x++)
      if (qr.modules.get(y, x))
        commands.push({
          kind: "rect",
          x: l.qr.x + (x + 4) * moduleSize,
          y: l.qr.y + (y + 4) * moduleSize,
          width: moduleSize,
          height: moduleSize,
          gray: 0,
        });
  text(12, 16, 4, "PapanNalar");
  text(12, 23, 3.5, form ? "Cek pemahaman" : l.title);
  text(12, 31, 2.4, "Nama: ................................................");
  text(12, 37, 2.2, "Nomor absen - puluhan");
  text(12, 49, 2.2, "Satuan");
  for (const row of [l.tens, l.units])
    row.forEach((p, i) => {
      text(p.x - 0.7, p.y - 2.8, 2.3, String(i));
      commands.push({
        kind: "circle",
        x: p.x,
        y: p.y,
        radius: l.bubbleRadius,
        gray: null,
      });
    });
  // Writing boxes are a visual guide only; scanner uses the bubbles.
  for (const x of [60, 67]) {
    commands.push(
      { kind: "rect", x, y: 38, width: 6, height: 0.25, gray: 0 },
      { kind: "rect", x, y: 44, width: 6, height: 0.25, gray: 0 },
      { kind: "rect", x, y: 38, width: 0.25, height: 6, gray: 0 },
      { kind: "rect", x: x + 6, y: 38, width: 0.25, height: 6, gray: 0 },
    );
  }
  if (kind === "initial") {
    text(12, 66, 2.4, "Hitamkan penuh");
    text(12, 70, 2.4, "satu gelembung.");
    text(12, 76, 2.4, "Belum tahu? Pilih ?");
  } else {
    text(12, 62, 2.4, "Hitamkan penuh satu gelembung.");
    text(12, 66, 2.4, "Belum tahu? Pilih ?");
  }
  l.answers[0].forEach((p, i) =>
    text(p.x - 0.8, p.y - (kind === "initial" ? 4 : 6), 2.8, CARD_OPTIONS[i]),
  );
  l.answers.forEach((row, i) => {
    text(kind === "initial" ? 60 : 12, row[0].y + 0.8, 2.8, String(i + 1));
    if (form && i >= form.rows) {
      text(25, row[0].y + 0.8, 2.4, "Tidak digunakan — kosongkan.");
      return;
    }
    row.forEach((p) =>
      commands.push({
        kind: "circle",
        x: p.x,
        y: p.y,
        radius: l.bubbleRadius,
        gray: null,
      }),
    );
  });
  text(12, 129, 2.2, "Penuh");
  text(36, 129, 2.2, "Samar: cek");
  text(62, 129, 2.2, "Ganda: cek");
  for (const [x, gray] of [
    [25, 0],
    [53, 0.65],
    [84, 0],
    [91, 0],
  ])
    commands.push({ kind: "circle", x, y: 128, radius: 1.4, gray });
  text(12, 137, 2.2, "Cetak 100% / ukuran asli. Mulai kelas 4. v1");
  return commands;
}

const xml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&apos;",
      })[c]!,
  );
export function cardSvg(
  kind: CardKind,
  extra: readonly DrawCommand[] = [],
): string {
  const layout = cardLayout(kind);
  const body = [...cardDrawing(kind), ...extra]
    .map((c) => {
      if (c.kind === "text")
        return `<text x="${c.x}" y="${c.y}" font-family="Atkinson Hyperlegible, sans-serif" font-size="${c.size}">${xml(c.text)}</text>`;
      if (c.kind === "rect")
        return `<rect x="${c.x}" y="${c.y}" width="${c.width}" height="${c.height}" fill="rgb(${c.gray * 255},${c.gray * 255},${c.gray * 255})"/>`;
      return `<circle cx="${c.x}" cy="${c.y}" r="${c.radius}" fill="${c.gray === null ? "white" : `rgb(${c.gray * 255},${c.gray * 255},${c.gray * 255})`}" stroke="black" stroke-width="0.25"/>`;
    })
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${layout.width}mm" height="${layout.height}mm" viewBox="0 0 ${layout.width} ${layout.height}"><rect width="100%" height="100%" fill="white"/>${body}</svg>`;
}
