import type { Point } from "../../cards/layouts/layout-v1";

export type Homography = readonly number[];
export function homography(
  from: readonly Point[],
  to: readonly Point[],
): Homography {
  if (from.length !== 4 || to.length !== 4)
    throw new Error("Four points required");
  const rows = from.flatMap(({ x, y }, i) => {
    const { x: u, y: v } = to[i];
    return [
      [x, y, 1, 0, 0, 0, -u * x, -u * y, u],
      [0, 0, 0, x, y, 1, -v * x, -v * y, v],
    ];
  });
  for (let col = 0; col < 8; col++) {
    let pivot = col;
    for (let row = col + 1; row < 8; row++)
      if (Math.abs(rows[row][col]) > Math.abs(rows[pivot][col])) pivot = row;
    if (Math.abs(rows[pivot][col]) < 1e-9)
      throw new Error("Degenerate card geometry");
    [rows[col], rows[pivot]] = [rows[pivot], rows[col]];
    const divisor = rows[col][col];
    for (let j = col; j <= 8; j++) rows[col][j] /= divisor;
    for (let row = 0; row < 8; row++)
      if (row !== col) {
        const factor = rows[row][col];
        for (let j = col; j <= 8; j++) rows[row][j] -= factor * rows[col][j];
      }
  }
  return [...rows.map((row) => row[8]), 1];
}
export function project(h: Homography, x: number, y: number): Point {
  const d = h[6] * x + h[7] * y + 1;
  return {
    x: (h[0] * x + h[1] * y + h[2]) / d,
    y: (h[3] * x + h[4] * y + h[5]) / d,
  };
}
export function cyclic(points: readonly Point[]): Point[] {
  const center = points.reduce(
    (p, q) => ({ x: p.x + q.x / points.length, y: p.y + q.y / points.length }),
    { x: 0, y: 0 },
  );
  return [...points].sort(
    (a, b) =>
      Math.atan2(a.y - center.y, a.x - center.x) -
      Math.atan2(b.y - center.y, b.x - center.x),
  );
}
