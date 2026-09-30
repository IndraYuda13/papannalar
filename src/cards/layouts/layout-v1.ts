export const CARD_KINDS = ["initial", "weekly", "exit"] as const;
export type CardKind = (typeof CARD_KINDS)[number];
export const CARD_OPTIONS = ["A", "B", "C", "D", "?"] as const;
export type CardAnswer = (typeof CARD_OPTIONS)[number];
export type Point = Readonly<{ x: number; y: number }>;
export type CardLayout = Readonly<{
  version: 1;
  kind: CardKind;
  width: number;
  height: number;
  rows: number;
  title: string;
  markerSize: number;
  markers: readonly Point[];
  qr: Readonly<{ x: number; y: number; size: number }>;
  bubbleRadius: number;
  tens: readonly Point[];
  units: readonly Point[];
  answers: readonly (readonly Point[])[];
}>;
export function cardLayout(kind: CardKind): CardLayout {
  if (!CARD_KINDS.includes(kind)) throw new RangeError("Unknown card kind");
  const width = kind === "initial" ? 210 : 105;
  const height = 148.5;
  const rows = kind === "initial" ? 10 : kind === "weekly" ? 5 : 3;
  const xs =
    kind === "initial" ? [72, 93, 114, 135, 156] : [25, 40, 55, 70, 85];
  const points = (xs: number[], y: number) =>
    Object.freeze(xs.map((x) => Object.freeze({ x, y })));
  return Object.freeze({
    version: 1,
    kind,
    width,
    height,
    rows,
    title:
      kind === "initial"
        ? "Cek Awal"
        : kind === "weekly"
          ? "Cek Mingguan"
          : "Kartu Keluar",
    markerSize: 5,
    markers: Object.freeze(
      [
        { x: 6, y: 6 },
        { x: width - 6, y: 6 },
        { x: width - 6, y: height - 6 },
        { x: 6, y: height - 6 },
      ].map((p) => Object.freeze(p)),
    ),
    qr: Object.freeze({ x: width - 36, y: 9, size: 28 }),
    bubbleRadius: 2,
    tens: points([25, 32, 39, 46, 53], 43),
    units: points([20, 27, 34, 41, 48, 55, 62, 69, 76, 83], 55),
    answers: Object.freeze(
      Array.from({ length: rows }, (_, i) =>
        points(xs, kind === "initial" ? 63.5 + i * 6.5 : 80 + i * 10),
      ),
    ),
  });
}
export function layoutPayload(kind: CardKind): string {
  const layout = cardLayout(kind);
  return `PN|layout=1|kind=${layout.kind}|rows=${layout.rows}`;
}
export function decodeLayout(payload: string): CardKind | null {
  return CARD_KINDS.find((kind) => layoutPayload(kind) === payload) ?? null;
}
export function a4Cells(kind: CardKind): readonly Point[] {
  return kind === "initial"
    ? [
        { x: 0, y: 0 },
        { x: 0, y: 148.5 },
      ]
    : [
        { x: 0, y: 0 },
        { x: 105, y: 0 },
        { x: 0, y: 148.5 },
        { x: 105, y: 148.5 },
      ];
}
