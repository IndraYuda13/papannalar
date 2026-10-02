import { afterEach, beforeEach, expect, it, vi } from "vitest";
beforeEach(() => {
  vi.resetModules();
  vi.useFakeTimers();
});
afterEach(() => vi.useRealTimers());
it("a precise heartbeat prevents second-rounded HTTP Date from making a fresh ACK appear in the future", async () => {
  const { observeServerClock, classroomNow } =
    await import("../../src/features/classroom/clock");
  const now = Date.parse("2026-09-30T10:00:00.850Z");
  vi.setSystemTime(now);
  observeServerClock("2026-09-30T10:00:00.000Z", now, now);
  expect(classroomNow()).toBe(now - 850);
  observeServerClock(new Date(now).toISOString(), now, now, true);
  vi.advanceTimersByTime(2000);
  observeServerClock("2026-09-30T10:00:02.000Z", now + 2000, now + 2000);
  expect(classroomNow()).toBe(now + 2000);
});
it("invalid or slow timestamps cannot replace a precise clock; coarse recovery resumes after expiry", async () => {
  const { observeServerClock, classroomNow } =
    await import("../../src/features/classroom/clock");
  vi.setSystemTime(100000);
  observeServerClock(new Date(100100).toISOString(), 100000, 100000, true);
  observeServerClock("invalid", 100000, 100000, true);
  observeServerClock(new Date(990000).toISOString(), 90000, 100000, true);
  expect(classroomNow()).toBe(100100);
  vi.advanceTimersByTime(61000);
  observeServerClock(new Date(161000).toISOString(), 161000, 161000);
  expect(classroomNow()).toBe(161000);
});
