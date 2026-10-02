"use client";
import type { Raster } from "@/workers/omr/scan";
export interface ImageAcquisition {
  capture(): Promise<Raster>;
  close(): void;
}
export function capturePixels(
  source: CanvasImageSource,
  width: number,
  height: number,
): Raster {
  if (width * height > 16_000_000 || width < 80 || height < 80)
    throw new Error("IMAGE_SIZE");
  const scale = Math.min(1, 1600 / Math.max(width, height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("CANVAS_UNAVAILABLE");
  context.drawImage(source, 0, 0, canvas.width, canvas.height);
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
  canvas.width = canvas.height = 0;
  return { width: pixels.width, height: pixels.height, data: pixels.data };
}
export async function readLocalPhoto(file: File): Promise<Raster> {
  if (
    !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
    file.size > 16_000_000
  )
    throw new Error("IMAGE_FORMAT");
  const bitmap = await createImageBitmap(file, {
    imageOrientation: "from-image",
  });
  try {
    return capturePixels(bitmap, bitmap.width, bitmap.height);
  } finally {
    bitmap.close();
  }
}
export async function openCamera(
  video: HTMLVideoElement,
): Promise<ImageAcquisition> {
  if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia)
    throw new Error("CAMERA_SECURE_CONTEXT");
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
      facingMode: { ideal: "environment" },
      width: { ideal: 1600 },
      height: { ideal: 1200 },
    },
  });
  video.srcObject = stream;
  try {
    await video.play();
  } catch {
    stream.getTracks().forEach((track) => track.stop());
    throw new Error("CAMERA_PLAYBACK");
  }
  return {
    capture: async () =>
      capturePixels(video, video.videoWidth, video.videoHeight),
    close: () => {
      stream.getTracks().forEach((track) => track.stop());
      video.srcObject = null;
    },
  };
}
