"use client";
import { scanResultSchema } from "../../contracts/scanner";
import {
  customFormPayload,
  parseCustomFormBinding,
  type CustomFormBinding,
} from "../../contracts/custom-form";
import { cardLayout, type CardKind } from "../../cards/layouts/layout-v1";
import type { Raster, ScanResult } from "../../workers/omr/scan";
export function createScanner() {
  const worker = new Worker("/omr-worker.js");
  let next = 0;
  let closed = false;
  let pending: {
    id: number;
    kind: CardKind;
    form?: CustomFormBinding;
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
    if (!parsed.success || parsed.data.kind !== pending.kind) {
      reject();
      return;
    }
    const result = parsed.data;
    if (result.status !== "rejected") {
      if (
        Boolean(result.form) !== Boolean(pending.form) ||
        (result.form &&
          pending.form &&
          customFormPayload(result.form) !== customFormPayload(pending.form)) ||
        result.answers.length !==
          (pending.form?.rows ?? cardLayout(pending.kind).rows)
      ) {
        reject();
        return;
      }
    } else if (result.form || result.answers.length) {
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
      formBinding?: CustomFormBinding,
    ): Promise<ScanResult> {
      if (closed) return Promise.reject(new Error("SCANNER_CLOSED"));
      if (pending) return Promise.reject(new Error("SCANNER_BUSY"));
      return new Promise((resolve, fail) => {
        const form =
          formBinding === undefined
            ? undefined
            : parseCustomFormBinding(formBinding);
        if (form && kind !== "weekly")
          throw new Error("Custom forms require the weekly layout");
        pending = {
          id: ++next,
          kind,
          ...(form ? { form } : {}),
          resolve,
          reject: fail,
          timer: setTimeout(reject, 15000),
        };
        try {
          worker.postMessage(
            {
              id: next,
              image,
              kind,
              roster: [...roster],
              ...(form ? { form } : {}),
            },
            [image.data.buffer],
          );
        } catch {
          reject();
        }
      });
    },
    close() {
      closed = true;
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

export function stableCameraScan(
  first: ScanResult,
  second: ScanResult,
): boolean {
  return (
    stableScan(first, second) ||
    (first.status === "review" &&
      second.status === "review" &&
      JSON.stringify(first) === JSON.stringify(second))
  );
}

export const AUTO_CAPTURE_INTERVAL_MS = 400;
export const AUTO_CAPTURE_COOLDOWN_MS = 1200;

/** Serial local reads; only stable, QR-validated results reach review. No pixels retained. */
export function createAutoCapture(input: {
  read(): Promise<ScanResult>;
  onRead(result: ScanResult): void;
  onFailure?(): void;
}) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let inFlight: Promise<void> | null = null;
  let previous: ScanResult | null = null;
  let running = false,
    closed = false,
    generation = 0;
  let lastStarted = -Infinity,
    notBefore = 0;
  function clear() {
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
  }
  function schedule() {
    clear();
    if (!running || closed || inFlight) return;
    timer = setTimeout(
      tick,
      Math.max(
        0,
        notBefore - Date.now(),
        lastStarted + AUTO_CAPTURE_INTERVAL_MS - Date.now(),
      ),
    );
  }
  function pause() {
    generation++;
    running = false;
    previous = null;
    notBefore = Date.now() + AUTO_CAPTURE_COOLDOWN_MS;
    clear();
    return inFlight ?? Promise.resolve();
  }
  function tick() {
    timer = undefined;
    if (!running || closed || inFlight) return;
    const ticket = generation;
    lastStarted = Date.now();
    inFlight = Promise.resolve()
      .then(input.read)
      .then((result) => {
        if (ticket !== generation || !running || closed) return;
        if (result.status === "rejected") {
          previous = null;
          input.onFailure?.();
        } else if (previous && stableCameraScan(previous, result)) {
          void pause();
          input.onRead(result);
        } else previous = result;
      })
      .catch(() => {
        if (ticket !== generation || !running || closed) return;
        previous = null;
        input.onFailure?.();
      })
      .finally(() => {
        inFlight = null;
        schedule();
      });
  }
  return {
    resume() {
      if (closed || running) return;
      generation++;
      previous = null;
      running = true;
      schedule();
    },
    pause,
    close() {
      closed = true;
      void pause();
    },
  };
}
