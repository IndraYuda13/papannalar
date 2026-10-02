import jsQR from "jsqr";
import {
  CARD_OPTIONS,
  cardLayout,
  layoutPayload,
  type CardAnswer,
  type CardKind,
  type Point,
} from "../../cards/layouts/layout-v1";
import { cyclic, homography, project, type Homography } from "./geometry";
import {
  customFormPayload,
  customFormBindingSchema,
  type CustomFormBinding,
} from "../../contracts/custom-form";

export type Raster = Readonly<{
  width: number;
  height: number;
  data: Uint8ClampedArray;
}>;
export type BubbleRead = Readonly<{
  status: "accepted" | "blank" | "multiple" | "ambiguous" | "missing";
  index: number | null;
}>;
export type ScanResult = Readonly<{
  status: "accepted" | "review" | "rejected";
  kind: CardKind;
  form?: CustomFormBinding;
  attendanceNumber: number | null;
  answers: readonly Readonly<{
    result: CardAnswer | "missing";
    status: BubbleRead["status"];
  }>[];
  issues: readonly (
    | "markers"
    | "layout"
    | "contrast"
    | "attendance"
    | "answers"
    | "geometry"
    | "blur"
  )[];
}>;

export function classifyBubbleRow(
  inks: readonly (number | null)[],
): BubbleRead {
  if (inks.some((v) => v === null || !Number.isFinite(v)))
    return { status: "missing", index: null };
  const filled = inks.flatMap((v, i) => (v! >= 0.55 ? [i] : []));
  if (filled.length > 1) return { status: "multiple", index: null };
  if (inks.some((v) => v! > 0.25 && v! < 0.55))
    return { status: "ambiguous", index: null };
  return filled.length === 1
    ? { status: "accepted", index: filled[0] }
    : { status: "blank", index: null };
}
type Marker = Point & { area: number; width: number; height: number };
function markers(
  gray: Uint8Array,
  width: number,
  height: number,
  threshold: number,
): Marker[] {
  const visited = new Uint8Array(gray.length);
  const queue = new Int32Array(gray.length);
  const found: Marker[] = [];
  for (let start = 0; start < gray.length; start++) {
    if (visited[start] || gray[start] > threshold) continue;
    let head = 0,
      tail = 1,
      minX = width,
      minY = height,
      maxX = 0,
      maxY = 0,
      sumX = 0,
      sumY = 0;
    queue[0] = start;
    visited[start] = 1;
    while (head < tail) {
      const i = queue[head++],
        x = i % width,
        y = Math.floor(i / width);
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
      sumX += x;
      sumY += y;
      const neighbors = [
        x > 0 ? i - 1 : -1,
        x + 1 < width ? i + 1 : -1,
        y > 0 ? i - width : -1,
        y + 1 < height ? i + width : -1,
      ];
      for (const next of neighbors)
        if (next >= 0 && !visited[next] && gray[next] <= threshold) {
          visited[next] = 1;
          queue[tail++] = next;
        }
    }
    const w = maxX - minX + 1,
      h = maxY - minY + 1;
    if (
      w >= 8 &&
      h >= 8 &&
      w < width * 0.18 &&
      h < height * 0.18 &&
      w / h > 0.5 &&
      w / h < 2 &&
      tail / (w * h) >= 0.45
    ) {
      let solidity = 0;
      // Oriented bounding rectangles distinguish filled square markers from
      // circular bubbles, including tilted cards; no axis-alignment assumption.
      for (let angle = 0; angle < 90; angle += 5) {
        const cos = Math.cos((angle * Math.PI) / 180),
          sin = Math.sin((angle * Math.PI) / 180);
        let minU = Infinity,
          maxU = -Infinity,
          minV = Infinity,
          maxV = -Infinity;
        for (let i = 0; i < tail; i++) {
          const x = queue[i] % width,
            y = Math.floor(queue[i] / width);
          const u = x * cos + y * sin,
            v = -x * sin + y * cos;
          minU = Math.min(minU, u);
          maxU = Math.max(maxU, u);
          minV = Math.min(minV, v);
          maxV = Math.max(maxV, v);
        }
        solidity = Math.max(
          solidity,
          tail / ((maxU - minU + 1) * (maxV - minV + 1)),
        );
      }
      if (solidity >= 0.86)
        found.push({
          x: sumX / tail,
          y: sumY / tail,
          area: tail,
          width: w,
          height: h,
        });
    }
  }
  return found.sort((a, b) => b.area - a.area).slice(0, 12);
}
function grayAt(
  gray: Uint8Array,
  width: number,
  height: number,
  point: Point,
): number | null {
  const x = Math.round(point.x),
    y = Math.round(point.y);
  return x < 0 || y < 0 || x >= width || y >= height
    ? null
    : gray[y * width + x];
}
function readInk(
  gray: Uint8Array,
  width: number,
  height: number,
  h: Homography,
  center: Point,
  black: number,
): number | null {
  const inner: number[] = [],
    outer: number[] = [];
  for (let y = -3.1; y <= 3.1; y += 0.45)
    for (let x = -3.1; x <= 3.1; x += 0.45) {
      const radius = Math.hypot(x, y);
      if (radius > 1.15 && (radius < 2.6 || radius > 3.1)) continue;
      const value = grayAt(
        gray,
        width,
        height,
        project(h, center.x + x, center.y + y),
      );
      if (value === null) return null;
      (radius <= 1.15 ? inner : outer).push(value);
    }
  outer.sort((a, b) => a - b);
  const white = outer[Math.floor(outer.length * 0.75)];
  if (white - black < 45) return null;
  return (
    inner.reduce(
      (total, v) =>
        total + Math.max(0, Math.min(1, (white - v) / (white - black))),
      0,
    ) / inner.length
  );
}
function readQr(
  gray: Uint8Array,
  width: number,
  height: number,
  h: Homography,
  kind: CardKind,
): string | null {
  const box = cardLayout(kind).qr;
  const size = 148;
  // A few subpixel phases avoid nearest-neighbor aliasing on low-resolution
  // QR modules after perspective rectification. Payload still must decode exactly.
  for (const dx of [0, -0.15, 0.15])
    for (const dy of [0, -0.15, 0.15]) {
      const data = new Uint8ClampedArray(size * size * 4);
      let darkPixels = 0;
      for (let y = 0; y < size; y++)
        for (let x = 0; x < size; x++) {
          const p = project(
            h,
            box.x + ((x + 0.5) * box.size) / size + dx,
            box.y + ((y + 0.5) * box.size) / size + dy,
          );
          const value = grayAt(gray, width, height, p) ?? 255;
          if (value < 100) darkPixels++;
          const i = (y * size + x) * 4;
          data[i] = data[i + 1] = data[i + 2] = value;
          data[i + 3] = 255;
        }
      if (darkPixels < size * size * 0.08) return null;
      const decoded = jsQR(data, size, size, {
        inversionAttempts: "dontInvert",
      });
      if (decoded) return decoded.data;
    }
  return null;
}

export function scanCard(
  image: Raster,
  kind: CardKind,
  roster: readonly number[],
  binding?: CustomFormBinding,
): ScanResult {
  const layout = cardLayout(kind);
  const fail = (issue: ScanResult["issues"][number]): ScanResult => ({
    status: "rejected",
    kind,
    attendanceNumber: null,
    answers: [],
    issues: [issue],
  });
  const parsed =
    binding === undefined
      ? undefined
      : customFormBindingSchema.safeParse(binding);
  if (parsed && (!parsed.success || kind !== "weekly")) return fail("layout");
  const form = parsed?.success ? parsed.data : undefined;
  const expectedQr = form ? customFormPayload(form) : layoutPayload(kind);
  if (
    !Number.isInteger(image.width) ||
    !Number.isInteger(image.height) ||
    image.width < 80 ||
    image.height < 80 ||
    image.width > 2000 ||
    image.height > 2000 ||
    image.data.length !== image.width * image.height * 4
  )
    return fail("geometry");
  const gray = new Uint8Array(image.width * image.height);
  const histogram = new Uint32Array(256);
  for (let i = 0; i < gray.length; i++) {
    gray[i] = Math.round(
      image.data[i * 4] * 0.299 +
        image.data[i * 4 + 1] * 0.587 +
        image.data[i * 4 + 2] * 0.114,
    );
    histogram[gray[i]]++;
  }
  const percentile = (fraction: number) => {
    let total = 0;
    for (let i = 0; i < 256; i++) {
      total += histogram[i];
      if (total >= gray.length * fraction) return i;
    }
    return 255;
  };
  const dark = percentile(0.001),
    white = percentile(0.85);
  if (white - dark < 60) return fail("contrast");
  const found = markers(
    gray,
    image.width,
    image.height,
    dark + (white - dark) * 0.3,
  );
  if (found.length < 4) return fail("markers");
  const candidates: Homography[] = [];
  for (let a = 0; a < found.length - 3; a++)
    for (let b = a + 1; b < found.length - 2; b++)
      for (let c = b + 1; c < found.length - 1; c++)
        for (let d = c + 1; d < found.length; d++) {
          const four = [found[a], found[b], found[c], found[d]];
          if (
            Math.max(...four.map((p) => p.area)) >
            Math.min(...four.map((p) => p.area)) * 2.5
          )
            continue;
          const points = cyclic(four);
          const area =
            Math.abs(
              points.reduce(
                (sum, p, i) =>
                  sum +
                  p.x * points[(i + 1) % 4].y -
                  p.y * points[(i + 1) % 4].x,
                0,
              ),
            ) / 2;
          if (area < image.width * image.height * 0.15) continue;
          // Marker area should agree with the card quadrilateral, not bubbles/text.
          if (four.some((p) => p.area / area < 0.0007 || p.area / area > 0.007))
            continue;
          for (let rotation = 0; rotation < 4; rotation++) {
            let h: Homography;
            try {
              h = homography(
                layout.markers,
                points.map((_, i) => points[(i + rotation) % 4]),
              );
            } catch {
              continue;
            }
            const matchesMarkerScale = layout.markers.every((marker, i) => {
              const corners = [
                [-2.5, -2.5],
                [2.5, -2.5],
                [2.5, 2.5],
                [-2.5, 2.5],
              ].map(([x, y]) => project(h, marker.x + x, marker.y + y));
              const expectedArea =
                Math.abs(
                  corners.reduce(
                    (sum, p, j) =>
                      sum +
                      p.x * corners[(j + 1) % 4].y -
                      p.y * corners[(j + 1) % 4].x,
                    0,
                  ),
                ) / 2;
              const point = points[(i + rotation) % 4];
              const observedArea = four.find(
                (p) => p.x === point.x && p.y === point.y,
              )!.area;
              return (
                observedArea > expectedArea * 0.7 &&
                observedArea < expectedArea * 1.3
              );
            });
            if (!matchesMarkerScale) continue;
            const payload = readQr(gray, image.width, image.height, h, kind);
            if (payload === expectedQr) candidates.push(h);
          }
        }
  if (candidates.length !== 1) return fail("layout");
  const h = candidates[0];
  const edgeStrength =
    layout.markers.reduce((sum, p) => {
      let largest = 0,
        previous: number | null = null;
      for (let offset = -3.5; offset <= 3.5; offset += 0.25) {
        const current = grayAt(
          gray,
          image.width,
          image.height,
          project(h, p.x + offset, p.y),
        );
        if (current !== null && previous !== null)
          largest = Math.max(largest, Math.abs(current - previous));
        previous = current;
      }
      return sum + largest / (white - dark);
    }, 0) / 4;
  if (edgeStrength < 0.18) return fail("blur");
  const black =
    layout.markers.reduce(
      (sum, p) =>
        sum +
        (grayAt(gray, image.width, image.height, project(h, p.x, p.y)) ?? dark),
      0,
    ) / 4;
  const row = (points: readonly Point[]) =>
    classifyBubbleRow(
      points.map((p) => readInk(gray, image.width, image.height, h, p, black)),
    );
  const tens = row(layout.tens),
    units = row(layout.units);
  let attendanceNumber =
    tens.status === "accepted" && units.status === "accepted"
      ? tens.index! * 10 + units.index!
      : null;
  if (
    attendanceNumber === null ||
    attendanceNumber < 1 ||
    attendanceNumber > 40 ||
    !roster.includes(attendanceNumber)
  )
    attendanceNumber = null;
  const answers = layout.answers
    .slice(0, form?.rows ?? layout.rows)
    .map((points) => {
      const read = row(points);
      return {
        result:
          read.status === "accepted"
            ? CARD_OPTIONS[read.index!]
            : read.status === "blank"
              ? ("?" as const)
              : ("missing" as const),
        status: read.status,
      };
    });
  const issues: ScanResult["issues"][number][] = [];
  if (attendanceNumber === null) issues.push("attendance");
  if (answers.some((answer) => answer.result === "missing"))
    issues.push("answers");
  return {
    status: issues.length ? "review" : "accepted",
    kind,
    ...(form ? { form } : {}),
    attendanceNumber,
    answers,
    issues,
  };
}
