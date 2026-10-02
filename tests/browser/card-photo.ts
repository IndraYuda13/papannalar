import { syntheticCard, type SyntheticCard } from "../../src/cards/synthetic";
// Input-only fixture. No storage, API, mastery, responses or session mutation.
const api = {
  png(input: SyntheticCard) {
    const raster = syntheticCard(input),
      canvas = document.createElement("canvas");
    canvas.width = raster.width;
    canvas.height = raster.height;
    const context = canvas.getContext("2d")!,
      pixels = context.createImageData(raster.width, raster.height);
    pixels.data.set(raster.data);
    context.putImageData(pixels, 0, 0);
    return canvas.toDataURL("image/png").split(",")[1];
  },
};
declare global {
  interface Window {
    __cardPhoto: typeof api;
  }
}
window.__cardPhoto = api;
