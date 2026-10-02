import { describe, expect, it } from "vitest";
import {
  presentationStateSchema,
  publicPresentation,
  type PresentationState,
} from "../../src/contracts/presentation";
import { guidanceReportSchema } from "../../src/contracts/guidance";
import {
  spotlightView,
  resumeView,
  underlyingView,
} from "../../src/features/layar/presentation-view";
const id = (n: number) =>
  `16000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const base: PresentationState = {
  schemaVersion: 1,
  mode: "station",
  taskEpoch: id(1),
  question: 1,
  groups: [],
  tool: {
    kind: "number-line",
    origin: { numerator: -3, denominator: 1 },
    delta: { numerator: -5, denominator: 1 },
    orientation: "horizontal",
  },
};
describe("teacher practice guidance boundary", () => {
  it("public projection explicitly maps flags and cannot carry answer/identity fields", () => {
    const value = {
      ...base,
      guidance: { hint: 2, reveal: true, answerKey: "A", name: "CANARY" },
    };
    expect(presentationStateSchema.safeParse(value).success).toBe(false);
    expect(publicPresentation(value).guidance).toEqual({
      hint: 2,
      reveal: true,
    });
  });
  it.each(["check", "exit", "reflection", "groups", "opening"] as const)(
    "forbids target reveal on %s",
    (mode) => {
      expect(
        presentationStateSchema.safeParse({
          ...base,
          mode,
          guidance: { hint: 0, reveal: true },
        }).success,
      ).toBe(false);
    },
  );
  it("requires an actual practice tool and bounded hint count", () => {
    expect(
      presentationStateSchema.safeParse({
        ...base,
        tool: undefined,
        guidance: { hint: 0, reveal: true },
      }).success,
    ).toBe(false);
    expect(
      presentationStateSchema.safeParse({
        ...base,
        guidance: { hint: 4, reveal: false },
      }).success,
    ).toBe(false);
  });
  it("spotlight and return require fresh teacher confirmation rather than carrying a target reveal into another view", () => {
    const spot = spotlightView(
      { ...base, guidance: { hint: 2, reveal: true } },
      base.tool!,
      id(2),
    );
    expect(spot.guidance).toBeUndefined();
    const revealed = { ...spot, guidance: { hint: 3, reveal: true } };
    expect(underlyingView(revealed).guidance).toBeUndefined();
    expect(resumeView(revealed, id(3)).guidance).toBeUndefined();
  });
  it("board reports only the hint counter, never reveal, student model, names or a score", () => {
    const report = {
      action: "ack",
      presentationId: id(1),
      channelEpoch: id(2),
      taskEpoch: id(3),
      hint: 2,
    };
    expect(guidanceReportSchema.safeParse(report).success).toBe(true);
    for (const key of ["reveal", "name", "score", "history", "ink"])
      expect(
        guidanceReportSchema.safeParse({ ...report, [key]: true }).success,
      ).toBe(false);
  });
});
