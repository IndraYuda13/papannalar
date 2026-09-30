import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  AUTO_CAPTURE_COOLDOWN_MS,
  AUTO_CAPTURE_INTERVAL_MS,
  createAutoCapture,
  createScanner,
  stableCameraScan,
  stableScan,
} from "../../src/features/scanner/client";
import { syntheticCard } from "../../src/cards/synthetic";
import type { CardKind } from "../../src/cards/layouts/layout-v1";
import type { CustomFormBinding } from "../../src/contracts/custom-form";
import type { Raster, ScanResult } from "../../src/workers/omr/scan";

const binding: CustomFormBinding = {
  intent: "custom_assessment",
  formId: "ba7f18ae-496f-4c11-92ab-96752a8c1b87",
  version: 3,
  pageIndex: 0,
  rows: 3,
};
const accepted: ScanResult = {
  kind: "weekly",
  form: binding,
  status: "accepted",
  attendanceNumber: 7,
  answers: ["A", "B", "?"].map((result) => ({
    result: result as "A" | "B" | "?",
    status: "accepted",
  })),
  issues: [],
};
const review: ScanResult = {
  ...accepted,
  status: "review",
  attendanceNumber: null,
  issues: ["attendance"],
};
const rejected: ScanResult = {
  kind: "weekly",
  status: "rejected",
  attendanceNumber: null,
  answers: [],
  issues: ["markers"],
};

describe("V4 bounded auto-capture lifecycle", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("requires two stable frames, pauses after a read, and resumes only after cooldown", async () => {
    const read = vi.fn(async () => accepted),
      onRead = vi.fn();
    const auto = createAutoCapture({ read, onRead });
    auto.resume();
    await vi.advanceTimersByTimeAsync(0);
    expect(read).toHaveBeenCalledTimes(1);
    expect(onRead).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(AUTO_CAPTURE_INTERVAL_MS);
    expect(read).toHaveBeenCalledTimes(2);
    expect(onRead).toHaveBeenCalledExactlyOnceWith(accepted);
    auto.resume();
    await vi.advanceTimersByTimeAsync(AUTO_CAPTURE_COOLDOWN_MS - 1);
    expect(read).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(1);
    expect(read).toHaveBeenCalledTimes(3);
    await vi.advanceTimersByTimeAsync(AUTO_CAPTURE_INTERVAL_MS);
    expect(onRead).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(10000);
    expect(read).toHaveBeenCalledTimes(4);
    auto.close();
  });

  it("pauses on stable review instead of repeatedly sending ambiguous/attendance results", async () => {
    const read = vi.fn(async () => review),
      onRead = vi.fn();
    const auto = createAutoCapture({ read, onRead });
    auto.resume();
    await vi.advanceTimersByTimeAsync(10000);
    expect(read).toHaveBeenCalledTimes(2);
    expect(onRead).toHaveBeenCalledExactlyOnceWith(review);
    auto.close();
  });

  it("a rejected geometry frame breaks stability and cannot be delivered", async () => {
    const read = vi
      .fn<() => Promise<ScanResult>>()
      .mockResolvedValueOnce(accepted)
      .mockResolvedValueOnce(rejected)
      .mockResolvedValue(accepted);
    const onRead = vi.fn(),
      onFailure = vi.fn();
    const auto = createAutoCapture({ read, onRead, onFailure });
    auto.resume();
    await vi.advanceTimersByTimeAsync(AUTO_CAPTURE_INTERVAL_MS * 2);
    expect(onRead).not.toHaveBeenCalled();
    expect(onFailure).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(AUTO_CAPTURE_INTERVAL_MS);
    expect(onRead).toHaveBeenCalledExactlyOnceWith(accepted);
    auto.close();
  });

  it("moving between cards cannot accept a single clear but different read", async () => {
    const different = { ...accepted, attendanceNumber: 12 };
    const read = vi
      .fn<() => Promise<ScanResult>>()
      .mockResolvedValueOnce(accepted)
      .mockResolvedValue(different);
    const onRead = vi.fn(),
      auto = createAutoCapture({ read, onRead });
    auto.resume();
    await vi.advanceTimersByTimeAsync(AUTO_CAPTURE_INTERVAL_MS);
    expect(onRead).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(AUTO_CAPTURE_INTERVAL_MS);
    expect(onRead).toHaveBeenCalledExactlyOnceWith(different);
    auto.close();
  });

  it("serializes slow reads; manual pause drains the old read and suppresses its late result", async () => {
    let finish: (value: ScanResult) => void = () => {
      throw new Error("Read has not started");
    };
    const read = vi.fn(
      () =>
        new Promise<ScanResult>((resolve) => {
          finish = resolve;
        }),
    );
    const onRead = vi.fn(),
      auto = createAutoCapture({ read, onRead });
    auto.resume();
    await vi.advanceTimersByTimeAsync(3000);
    expect(read).toHaveBeenCalledTimes(1);
    let drained = false;
    const pause = auto.pause().then(() => {
      drained = true;
    });
    await vi.advanceTimersByTimeAsync(0);
    expect(drained).toBe(false);
    finish(accepted);
    await pause;
    expect(drained).toBe(true);
    await vi.advanceTimersByTimeAsync(10000);
    expect(onRead).not.toHaveBeenCalled();
    expect(read).toHaveBeenCalledTimes(1);
    auto.close();
  });

  it("rate-limits camera failures and cancels all callbacks on close", async () => {
    const read = vi.fn(async (): Promise<ScanResult> => {
      throw new Error("CAMERA_FRAME");
    });
    const onRead = vi.fn(),
      onFailure = vi.fn(),
      auto = createAutoCapture({ read, onRead, onFailure });
    auto.resume();
    await vi.advanceTimersByTimeAsync(1000);
    expect(read).toHaveBeenCalledTimes(3);
    expect(onFailure).toHaveBeenCalledTimes(3);
    auto.close();
    auto.resume();
    await vi.advanceTimersByTimeAsync(10000);
    expect(read).toHaveBeenCalledTimes(3);
    expect(onRead).not.toHaveBeenCalled();
  });

  it("compares form metadata as well as answers while preserving the legacy stability function", () => {
    expect(stableScan(accepted, accepted)).toBe(true);
    expect(stableScan(review, review)).toBe(false);
    expect(stableCameraScan(review, review)).toBe(true);
    expect(stableCameraScan(accepted, review)).toBe(false);
    expect(
      stableCameraScan(accepted, {
        ...accepted,
        form: { ...binding, version: 4 },
      }),
    ).toBe(false);
    expect(stableCameraScan(rejected, rejected)).toBe(false);
  });
});

type Request = {
  id: number;
  image: Raster;
  kind: CardKind;
  roster: number[];
  form?: CustomFormBinding;
};
class LocalWorker {
  static instances: LocalWorker[] = [];
  onmessage:
    ((event: MessageEvent<{ id: number; result?: unknown }>) => void) | null =
    null;
  onerror: (() => void) | null = null;
  request: Request | null = null;
  transferred: Transferable[] = [];
  terminate = vi.fn();
  constructor() {
    LocalWorker.instances.push(this);
  }
  postMessage(request: Request, transferred: Transferable[]) {
    this.request = request;
    this.transferred = transferred;
  }
  reply(result: unknown, id = this.request!.id) {
    this.onmessage?.(new MessageEvent("message", { data: { id, result } }));
  }
}
const image = (): Raster => ({
  width: 1,
  height: 1,
  data: new Uint8ClampedArray(4),
});

describe("V4 scanner worker binding boundary", () => {
  beforeEach(() => {
    LocalWorker.instances = [];
    vi.stubGlobal("Worker", LocalWorker);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("sends a copied binding and transferred frame, then returns only a verified result", async () => {
    const scanner = createScanner(),
      worker = LocalWorker.instances[0],
      frame = image(),
      form = { ...binding };
    const result = scanner.read(frame, "weekly", [7], form);
    form.version = 4;
    expect(worker.request?.form).toEqual(binding);
    expect(worker.transferred).toEqual([frame.data.buffer]);
    worker.reply(accepted);
    expect(await result).toEqual(accepted);
    scanner.close();
    expect(worker.terminate).toHaveBeenCalledTimes(1);
  });

  it.each([
    { ...accepted, form: undefined },
    { ...accepted, form: { ...binding, version: 4 } },
    { ...accepted, form: { ...binding, pageIndex: 1 } },
    { ...accepted, kind: "exit" },
    { ...accepted, answers: accepted.answers.slice(0, 2) },
    { ...accepted, form: { ...binding, studentName: "PRIVATE_CANARY" } },
  ])("rejects a mismatched or malformed worker reply", async (reply) => {
    const scanner = createScanner(),
      worker = LocalWorker.instances[0];
    const promise = scanner.read(image(), "weekly", [7], binding);
    const assertion = expect(promise).rejects.toThrow("SCAN_FAILED");
    worker.reply(reply);
    await assertion;
    scanner.close();
  });

  it("refuses a custom result when no binding was requested", async () => {
    const scanner = createScanner(),
      worker = LocalWorker.instances[0];
    const promise = scanner.read(image(), "weekly", [7]);
    const assertion = expect(promise).rejects.toThrow("SCAN_FAILED");
    worker.reply(accepted);
    await assertion;
    scanner.close();
  });

  it("rejects concurrent work, ignores stale replies and cancels pending reads on close", async () => {
    const scanner = createScanner(),
      worker = LocalWorker.instances[0];
    const promise = scanner.read(image(), "weekly", [7], binding);
    await expect(scanner.read(image(), "weekly", [7], binding)).rejects.toThrow(
      "SCANNER_BUSY",
    );
    const assertion = expect(promise).rejects.toThrow("SCAN_FAILED");
    worker.reply(accepted, worker.request!.id + 1);
    scanner.close();
    await assertion;
    await expect(scanner.read(image(), "weekly", [7], binding)).rejects.toThrow(
      "SCANNER_CLOSED",
    );
  });

  it("rejects a custom binding on the legacy exit layout before posting pixels", async () => {
    const scanner = createScanner(),
      worker = LocalWorker.instances[0];
    await expect(scanner.read(image(), "exit", [7], binding)).rejects.toThrow(
      "weekly layout",
    );
    expect(worker.request).toBeNull();
    scanner.close();
  });

  it("passes the binding through the actual worker entry point without returning pixels", async () => {
    const workerScope: {
      onmessage: ((event: MessageEvent<Request>) => void) | null;
      postMessage: (value: unknown) => void;
    } = { onmessage: null, postMessage: vi.fn() };
    vi.stubGlobal("self", workerScope);
    await import("../../src/workers/omr/worker");
    const handler = workerScope.onmessage;
    if (!handler) throw new Error("Worker did not register its input handler");
    handler(
      new MessageEvent("message", {
        data: {
          id: 42,
          kind: "weekly",
          roster: [7],
          form: binding,
          image: syntheticCard({
            kind: "weekly",
            attendance: 7,
            answers: ["A", "B", "?"],
            binding,
          }),
        },
      }),
    );
    expect(workerScope.postMessage).toHaveBeenCalledExactlyOnceWith({
      id: 42,
      result: accepted,
    });
  });
});
