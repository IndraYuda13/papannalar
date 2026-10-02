import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  startPresentationWatch,
  boardAcknowledged,
  controllerPresent,
  type PresentationConnection,
} from "../../src/features/classroom/connection-transport";
import type {
  PresentationSnapshot,
  ConnectionPulse,
} from "../../src/contracts/presentation";
import { id } from "../fixtures/placement";
const epoch = Date.parse("2026-09-30T10:00:00Z");
function snapshot(): PresentationSnapshot {
  return {
    envelope: {
      protocolVersion: 1,
      presentationId: id(1),
      channelEpoch: id(2),
      commandId: id(3),
      revision: 3,
      packageVersion: "prelim-7b-v1",
      payload: {
        schemaVersion: 1,
        mode: "check",
        question: 3,
        taskEpoch: id(4),
        groups: [],
      },
    },
    ackRevision: 3,
    ackCommandId: id(3),
    ackAt: new Date(epoch).toISOString(),
  };
}
function pulse(value: PresentationSnapshot, seenAt = epoch): ConnectionPulse {
  return {
    channelEpoch: value.envelope.channelEpoch,
    revision: value.envelope.revision,
    ackRevision: value.ackRevision,
    ackCommandId: value.ackCommandId,
    ackAt: value.ackAt,
    controllerSeenAt: new Date(seenAt).toISOString(),
    serverNow: new Date(Date.now()).toISOString(),
  };
}
function harness(realtime = true) {
  let value = snapshot(),
    seenAt = epoch,
    online = true;
  let health: ((healthy: boolean) => void) | undefined;
  let notify: (() => void) | undefined;
  const received: (PresentationSnapshot | null)[] = [],
    states: PresentationConnection[] = [];
  const close = vi.fn();
  const call = vi.fn(
    async (action: "snapshot" | "heartbeat", signal: AbortSignal) => {
      if (signal.aborted) throw new Error("aborted");
      return action === "snapshot" ? value : pulse(value, seenAt);
    },
  );
  const subscribe = vi.fn<
    Parameters<typeof startPresentationWatch>[0]["subscribe"]
  >(async (_env, wake, onHealth) => {
    notify = wake;
    health = onHealth;
    onHealth(realtime);
    return realtime ? close : undefined;
  });
  const watch = startPresentationWatch({
    call,
    subscribe,
    onSnapshot: (s) => received.push(s),
    onConnection: (s) => states.push(s),
    isOnline: () => online,
    isTerminal: (e) => e instanceof Error && e.message === "revoked",
  });
  return {
    watch,
    call,
    close,
    received,
    states,
    subscribe,
    health: (v: boolean) => health?.(v),
    notify: () => notify?.(),
    offline: () => {
      online = false;
      watch.wake();
    },
    online: () => {
      online = true;
      watch.wake();
    },
    set: (v: PresentationSnapshot) => {
      value = v;
    },
    renew: () => {
      seenAt = Date.now();
    },
  };
}
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(epoch);
});
afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
});
describe("V2/V5 connection transport with a fake clock", () => {
  it("uses lightweight lease/ACK checks and only two full snapshots in 35 seconds of healthy realtime", async () => {
    const h = harness();
    await vi.advanceTimersByTimeAsync(35_000);
    expect(h.call.mock.calls.filter(([a]) => a === "snapshot")).toHaveLength(2);
    expect(h.call.mock.calls.filter(([a]) => a === "heartbeat")).toHaveLength(
      8,
    );
    expect(h.subscribe).toHaveBeenCalledTimes(1);
    expect(h.states.at(-1)?.transport).toBe("online");
    h.watch.stop();
  });
  it("keeps successful snapshot polling separate from controller presence", async () => {
    const h = harness(false);
    await vi.advanceTimersByTimeAsync(14_999);
    expect(h.states.at(-1)?.controller).toBe("present");
    await vi.advanceTimersByTimeAsync(1);
    expect(h.states.at(-1)).toMatchObject({
      transport: "online",
      controller: "away",
      session: "active",
    });
    expect(h.received.at(-1)?.envelope.payload.question).toBe(3);
    h.renew();
    await vi.advanceTimersByTimeAsync(5_000);
    expect(h.states.at(-1)?.controller).toBe("present");
    h.watch.stop();
  });
  it("retains the same question/task while offline, then recovers a newer canonical revision", async () => {
    const h = harness();
    await vi.advanceTimersByTimeAsync(0);
    h.offline();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(h.received).not.toContain(null);
    expect(h.received.at(-1)?.envelope.payload.question).toBe(3);
    expect(h.call).toHaveBeenCalledTimes(2);
    const next = snapshot();
    next.envelope.revision = 4;
    next.envelope.commandId = id(7);
    next.envelope.payload.question = 4;
    h.set(next);
    h.online();
    await vi.advanceTimersByTimeAsync(0);
    expect(h.received.at(-1)?.envelope).toEqual(next.envelope);
    expect(h.received.at(-1)?.envelope.presentationId).toBe(id(1));
    h.watch.stop();
  });
  it("revocation on lightweight heartbeat stops retries and never resurrects the old grant", async () => {
    const h = harness();
    await vi.advanceTimersByTimeAsync(0);
    h.call.mockRejectedValue(new Error("revoked"));
    await vi.advanceTimersByTimeAsync(5_000);
    expect(h.received.at(-1)).toBeNull();
    expect(h.states.at(-1)?.session).toBe("closed");
    const count = h.call.mock.calls.length;
    h.online();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(h.call).toHaveBeenCalledTimes(count);
    expect(h.close).toHaveBeenCalledTimes(1);
  });
  it("handles an epoch change on heartbeat and cleans the obsolete subscription", async () => {
    const h = harness();
    await vi.advanceTimersByTimeAsync(0);
    const next = snapshot();
    next.envelope.channelEpoch = id(9);
    h.set(next);
    await vi.advanceTimersByTimeAsync(5_000);
    expect(h.received.at(-1)?.envelope).toEqual(next.envelope);
    expect(h.close).toHaveBeenCalledTimes(1);
    expect(h.subscribe).toHaveBeenCalledTimes(2);
    h.watch.stop();
  });
  it("updates board ACK from heartbeat without downloading another full snapshot", async () => {
    const h = harness();
    await vi.advanceTimersByTimeAsync(0);
    const next = snapshot();
    next.ackAt = new Date(epoch + 4_000).toISOString();
    h.set(next);
    await vi.advanceTimersByTimeAsync(5_000);
    expect(h.received.at(-1)?.ackAt).toBe(next.ackAt);
    expect(h.call.mock.calls.filter(([a]) => a === "snapshot")).toHaveLength(1);
    expect(boardAcknowledged(h.received.at(-1)!, Date.now())).toBe(true);
    h.watch.stop();
  });
  it("falls back when a socket disconnects; bounded retries do not mark a failed transport online", async () => {
    const h = harness();
    await vi.advanceTimersByTimeAsync(0);
    h.health(false);
    h.call.mockRejectedValue(new Error("network"));
    await vi.advanceTimersByTimeAsync(20_000);
    expect(h.states.at(-1)?.transport).toBe("offline");
    expect(h.call.mock.calls.length).toBeLessThan(9);
    h.watch.stop();
  });
  it("coalesces recovery storms while a request is in flight and ignores late completion after stop", async () => {
    const h = harness();
    await vi.advanceTimersByTimeAsync(0);
    let finish: ((s: PresentationSnapshot) => void) | undefined;
    h.call.mockImplementationOnce(
      () =>
        new Promise<PresentationSnapshot>((resolve) => {
          finish = resolve;
        }),
    );
    for (let i = 0; i < 50; i++) h.notify();
    expect(h.call).toHaveBeenCalledTimes(3);
    const count = h.received.length;
    h.watch.stop();
    finish?.(snapshot());
    await vi.advanceTimersByTimeAsync(10_000);
    expect(h.received).toHaveLength(count);
    expect(vi.getTimerCount()).toBe(0);
  });
  it("supports a configurable grace and never infers controller/ACK from a snapshot timestamp", () => {
    const s = snapshot(),
      p = pulse(s);
    expect(controllerPresent(p, 9_999, 10_000)).toBe(true);
    expect(controllerPresent(p, 10_000, 10_000)).toBe(false);
    expect(controllerPresent({ ...p, controllerSeenAt: null }, 0)).toBe(false);
    expect(boardAcknowledged({ ...s, ackCommandId: id(8) }, epoch)).toBe(false);
    expect(boardAcknowledged(s, epoch + 15_000)).toBe(false);
  });
});
