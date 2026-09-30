"use client";
import { scanResultSchema } from "@/contracts/scanner";
import type { CardKind } from "@/cards/layouts/layout-v1";
import type { Raster, ScanResult } from "@/workers/omr/scan";
export function createScanner() {
  const worker = new Worker("/omr-worker.js");
  let next = 0;
  let pending: {
    id: number;
    resolve: (result: ScanResult) => void;
    reject: (error: Error) => void;
    timer: ReturnType<typeof setTimeout>;
  } | null = null;
  function reject() {
    if (pending) {
      clearTimeout(pending.timer);
      pending.reject(new Error("SCAN_FAILED"));
      pending = null;
    }
  }
  worker.onmessage = (
    event: MessageEvent<{ id: number; result?: unknown; error?: string }>,
  ) => {
    if (!pending || pending.id !== event.data.id) return;
    const parsed = scanResultSchema.safeParse(event.data.result);
    if (!parsed.success) {
      reject();
      return;
    }
    clearTimeout(pending.timer);
    pending.resolve(parsed.data);
    pending = null;
  };
  worker.onerror = reject;
  return {
    read(
      image: Raster,
      kind: CardKind,
      roster: readonly number[],
    ): Promise<ScanResult> {
      if (pending) return Promise.reject(new Error("SCANNER_BUSY"));
      return new Promise((resolve, fail) => {
        pending = {
          id: ++next,
          resolve,
          reject: fail,
          timer: setTimeout(reject, 15000),
        };
        worker.postMessage({ id: next, image, kind, roster: [...roster] }, [
          image.data.buffer,
        ]);
      });
    },
    close() {
      reject();
      worker.terminate();
    },
  };
}
export function stableScan(first: ScanResult, second: ScanResult): boolean {
  return (
    first.status === "accepted" &&
    second.status === "accepted" &&
    JSON.stringify(first) === JSON.stringify(second)
  );
}
