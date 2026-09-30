import { expect, it } from "vitest";
import {
  capabilityFallback,
  latencySummary,
  measuredTouches,
} from "../../src/core/tools/capabilities";
import {
  boardProfileSchema,
  publicBoardProfile,
  type BoardProfile,
} from "../../src/contracts/board-profile";
import {
  remoteActionSchema,
  remoteCommandSchema,
  teacherRemoteSchema,
  boardRemoteSchema,
} from "../../src/contracts/remote";
const profile: BoardProfile = {
  schemaVersion: 1,
  touches: 2,
  pointerEvents: true,
  indexedDb: true,
  serviceWorker: true,
  width: 1920,
  heightPixels: 1080,
  browser: "chromium",
  major: 140,
  samples: 5,
  medianMs: 20,
  p95Ms: 40,
  height: "normal",
  durationSeconds: 60,
};
it.each([
  [false, false, false, 0],
  [true, false, false, 1],
  [true, true, false, 2],
  [true, true, true, 4],
  [false, true, true, 0],
  [true, false, true, 1],
] as const)("capability chain %s/%s/%s → %s", (a, b, c, result) =>
  expect(measuredTouches(a, b, c)).toBe(result),
);
it("fallback depends on observed capabilities and never fabricates a multitouch pass", () => {
  expect(capabilityFallback(profile)).toMatchObject({
    together: true,
    remote: false,
    lowZone: false,
    laptop: false,
    reducedMotion: false,
  });
  expect(
    capabilityFallback({
      ...profile,
      touches: 0,
      height: "high",
      p95Ms: null,
      serviceWorker: false,
    }),
  ).toMatchObject({
    together: false,
    remote: true,
    lowZone: true,
    laptop: true,
    reducedMotion: true,
  });
  expect(
    capabilityFallback({ ...profile, pointerEvents: false, p95Ms: 501 })
      .verifiedTouches,
  ).toBe(0);
});
it("latency quantiles are bounded actual samples, including missing samples", () => {
  expect(latencySummary([])).toEqual({ count: 0, medianMs: null, p95Ms: null });
  expect(latencySummary([NaN, -1, 99999, 10, 50, 30, 40, 20])).toEqual({
    count: 5,
    medianMs: 30,
    p95Ms: 50,
  });
  expect(latencySummary(Array(200).fill(4)).count).toBe(120);
});
it("profile mapper emits only diagnostic allowlist without child or fingerprint fields", () => {
  const extended = {
    ...profile,
    name: "PRIVATE",
    studentId: crypto.randomUUID(),
    level: "D1",
    userAgent: "RAW",
    browserId: "ID",
    handwriting: "PRIVATE",
  };
  expect(publicBoardProfile(extended)).toEqual(profile);
  expect(boardProfileSchema.safeParse(extended).success).toBe(false);
  expect(boardProfileSchema.safeParse({ ...profile, samples: 0 }).success).toBe(
    false,
  );
  expect(boardProfileSchema.safeParse({ ...profile, p95Ms: 1 }).success).toBe(
    false,
  );
});
it("remote actions are a closed tool protocol, numeric values only and normalized coordinates", () => {
  for (const input of [
    { kind: "activate", x: 1.1, y: 0 },
    { kind: "value", value: "PRIVATE" },
    { kind: "mode", mode: "exit" },
    { kind: "reveal" },
    { kind: "move", x: 0, y: 0, name: "PRIVATE" },
    { kind: "value", value: "Infinity" },
  ])
    expect(remoteActionSchema.safeParse(input).success).toBe(false);
  for (const value of ["-3", "1/2", "1,25"])
    expect(remoteActionSchema.safeParse({ kind: "value", value }).success).toBe(
      true,
    );
  const binding = {
    presentationId: crypto.randomUUID(),
    channelEpoch: crypto.randomUUID(),
    taskEpoch: crypto.randomUUID(),
  };
  const command = {
    id: crypto.randomUUID(),
    instanceId: crypto.randomUUID(),
    taskEpoch: binding.taskEpoch,
    sequence: 1,
    input: { kind: "activate", x: 0.5, y: 0.5 },
  };
  expect(remoteCommandSchema.safeParse(command).success).toBe(true);
  expect(
    teacherRemoteSchema.safeParse({ action: "send", ...binding, command })
      .success,
  ).toBe(true);
  expect(
    boardRemoteSchema.safeParse({ action: "send", ...binding, command })
      .success,
  ).toBe(false);
  expect(
    teacherRemoteSchema.safeParse({
      action: "ack",
      ...binding,
      receipt: { id: command.id, applied: true, editable: false },
    }).success,
  ).toBe(false);
});
