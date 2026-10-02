import { cardDrawing, type DrawCommand } from "./drawing";
import {
  CARD_OPTIONS,
  cardLayout,
  type CardAnswer,
  type CardKind,
} from "./layouts/layout-v1";
import { homography, project } from "../workers/omr/geometry";
import type { Raster } from "../workers/omr/scan";
import {
  parseCustomFormBinding,
  type CustomFormBinding,
} from "../contracts/custom-form";

export type SyntheticCard = Readonly<{
  kind: CardKind;
  attendance: number;
  answers: readonly (CardAnswer | readonly CardAnswer[] | null)[];
  binding?: CustomFormBinding;
  rotation?: 0 | 1 | 2 | 3;
  skew?: number;
  shade?: number;
  scale?: number;
  faintRow?: number;
  missingMarker?: number;
}>;
// Explicit SYNTHETIC input adapter for demo/QA. Output is a real raster sent to
// the same scanner. No scan result or mastery is supplied to the production path.
export function syntheticCard(input: SyntheticCard): Raster {
  const binding =
    input.binding === undefined
      ? undefined
      : parseCustomFormBinding(input.binding);
  const layout = cardLayout(input.kind),
    scale = input.scale ?? 4;
  if (input.answers.length > (binding?.rows ?? layout.rows))
    throw new RangeError("Answers exceed the printed form rows");
  const width = Math.ceil(layout.width * scale),
    height = Math.ceil(layout.height * scale);
  const canonical = new Uint8Array(width * height).fill(255);
  const commands: DrawCommand[] = [...cardDrawing(input.kind, binding)];
  const fill = (x: number, y: number, gray = 0) =>
    commands.push({ kind: "circle", x, y, radius: 1.8, gray });
  for (const [row, digit] of [
    [layout.tens, Math.floor(input.attendance / 10)],
    [layout.units, input.attendance % 10],
  ] as const) {
    const p = row[digit];
    if (p) fill(p.x, p.y);
  }
  input.answers.forEach((answer, i) => {
    const options =
      answer === null ? [] : typeof answer === "string" ? [answer] : answer;
    for (const option of options) {
      const p = layout.answers[i][CARD_OPTIONS.indexOf(option)];
      fill(p.x, p.y, input.faintRow === i ? 0.6 : 0);
    }
  });
  for (const c of commands) {
    if (c.kind === "text") continue; // Browser/PDF tests additionally cover printed typography.
    const left = c.kind === "rect" ? c.x : c.x - c.radius,
      top = c.kind === "rect" ? c.y : c.y - c.radius;
    const right = c.kind === "rect" ? c.x + c.width : c.x + c.radius,
      bottom = c.kind === "rect" ? c.y + c.height : c.y + c.radius;
    for (let y = Math.round(top * scale); y < Math.round(bottom * scale); y++)
      for (
        let x = Math.round(left * scale);
        x < Math.round(right * scale);
        x++
      ) {
        if (x < 0 || y < 0 || x >= width || y >= height) continue;
        if (c.kind === "rect")
          canonical[y * width + x] = Math.round(c.gray * 255);
        else {
          const r = Math.hypot(x / scale - c.x, y / scale - c.y);
          if (r <= c.radius)
            canonical[y * width + x] = Math.round(
              (c.gray === null ? (r > c.radius - 0.25 ? 0 : 1) : c.gray) * 255,
            );
        }
      }
  }
  if (input.missingMarker !== undefined) {
    const p = layout.markers[input.missingMarker];
    for (let y = Math.floor((p.y - 3) * scale); y <= (p.y + 3) * scale; y++)
      for (let x = Math.floor((p.x - 3) * scale); x <= (p.x + 3) * scale; x++)
        canonical[y * width + x] = 255;
  }
  const margin = 18,
    skew = input.skew ?? 0;
  const w = width + margin * 2,
    h = height + margin * 2;
  const map = homography(
    [
      { x: margin + skew, y: margin },
      { x: w - margin, y: margin + skew },
      { x: w - margin - skew, y: h - margin },
      { x: margin, y: h - margin - skew },
    ],
    [
      { x: 0, y: 0 },
      { x: width - 1, y: 0 },
      { x: width - 1, y: height - 1 },
      { x: 0, y: height - 1 },
    ],
  );
  const rotation = input.rotation ?? 0,
    outWidth = rotation % 2 ? h : w,
    outHeight = rotation % 2 ? w : h;
  const data = new Uint8ClampedArray(outWidth * outHeight * 4).fill(255);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const p = project(map, x, y),
        px = Math.round(p.x),
        py = Math.round(p.y);
      const raw =
        px < 0 || py < 0 || px >= width || py >= height
          ? 220
          : canonical[py * width + px];
      const value = Math.round(raw * (1 - ((input.shade ?? 0) * x) / w));
      const destX =
        rotation === 0
          ? x
          : rotation === 1
            ? h - 1 - y
            : rotation === 2
              ? w - 1 - x
              : y;
      const destY =
        rotation === 0
          ? y
          : rotation === 1
            ? x
            : rotation === 2
              ? h - 1 - y
              : w - 1 - x;
      const i = (destY * outWidth + destX) * 4;
      data[i] = data[i + 1] = data[i + 2] = value;
    }
  return { width: outWidth, height: outHeight, data };
}
