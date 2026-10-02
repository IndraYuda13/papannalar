import { syntheticCard, type SyntheticCard } from "../../src/cards/synthetic";
import { cardSvg } from "../../src/cards/drawing";
import {
  CARD_OPTIONS,
  cardLayout,
  type CardAnswer,
} from "../../src/cards/layouts/layout-v1";
import { createScanner } from "../../src/features/scanner/client";
import { readLocalPhoto } from "../../src/features/scanner/acquisition";
import { auditShellCache } from "../../src/offline/shell-cache";

const roster = Array.from({ length: 40 }, (_, i) => i + 1);
const api = {
  auditShellCache,
  async scan(input: SyntheticCard) {
    const scanner = createScanner();
    try {
      return await scanner.read(syntheticCard(input), input.kind, roster);
    } finally {
      scanner.close();
    }
  },
  async printedPhoto(attendance: number, answers: CardAnswer[]) {
    const layout = cardLayout("weekly");
    const filled = [
      layout.tens[Math.floor(attendance / 10)],
      layout.units[attendance % 10],
      ...answers.map((a, i) => layout.answers[i][CARD_OPTIONS.indexOf(a)]),
    ];
    const svg = cardSvg(
      "weekly",
      filled.map((p) => ({
        kind: "circle",
        x: p.x,
        y: p.y,
        radius: 1.8,
        gray: 0,
      })),
    );
    const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
    const image = new Image();
    try {
      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = reject;
        image.src = url;
      });
      const canvas = document.createElement("canvas");
      canvas.width = 840;
      canvas.height = 1188;
      canvas
        .getContext("2d")!
        .drawImage(image, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob>((resolve) =>
        canvas.toBlob((value) => resolve(value!), "image/png"),
      );
      const pixels = await readLocalPhoto(
        new File([blob], "synthetic.png", { type: "image/png" }),
      );
      const scanner = createScanner();
      try {
        return await scanner.read(pixels, "weekly", roster);
      } finally {
        scanner.close();
      }
    } finally {
      URL.revokeObjectURL(url);
    }
  },
};
declare global {
  interface Window {
    __omrFixture: typeof api;
  }
}
window.__omrFixture = api;
