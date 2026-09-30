import { describe, expect, it } from "vitest";
import {
  envelopeDecision,
  envelopeSchema,
  publicPresentation,
  presentationStateSchema,
  teacherPairingSchema,
} from "../../src/contracts/presentation";
import { id } from "../fixtures/placement";
const payload = {
  schemaVersion: 1 as const,
  mode: "opening" as const,
  question: 1,
  taskEpoch: id(10),
  groups: [
    { id: id(2), label: "Segitiga Biru" as const, attendanceNumbers: [7] },
  ],
};
const current = {
  protocolVersion: 1 as const,
  presentationId: id(1),
  channelEpoch: id(3),
  revision: 1,
  commandId: id(4),
  packageVersion: "prelim-7b-v1" as const,
  payload,
};
describe("public presentation boundary and recovery", () => {
  it("serializes only explicit group fields", () => {
    const enriched = {
      ...payload,
      name: "CANARY",
      groups: payload.groups.map((g) => ({
        ...g,
        level: "D1",
        mastery: 0.3,
        name: "CANARY",
      })),
    };
    expect(publicPresentation(enriched)).toEqual(payload);
    expect(presentationStateSchema.safeParse(enriched).success).toBe(false);
  });
  it.each(["name", "level", "stepId", "mastery", "answerKey", "score"])(
    "rejects %s at each incoming sink",
    (field) => {
      expect(
        presentationStateSchema.safeParse({
          ...payload,
          groups: payload.groups.map((g) => ({ ...g, [field]: "canary" })),
        }).success,
      ).toBe(false);
    },
  );
  it("ignores duplicate, reordered and stale epoch; recovers gaps", () => {
    expect(envelopeDecision(current, current)).toBe("ignore");
    expect(
      envelopeDecision(current, { ...current, revision: 3, commandId: id(7) }),
    ).toBe("recover");
    expect(
      envelopeDecision(current, { ...current, revision: 2, commandId: id(7) }),
    ).toBe("apply");
    expect(
      envelopeDecision(current, {
        ...current,
        revision: 2,
        commandId: id(7),
        channelEpoch: id(9),
      }),
    ).toBe("ignore");
    expect(envelopeDecision(null, current)).toBe("recover");
  });
  it("unknown protocol and arbitrary command never pass", () => {
    expect(
      envelopeSchema.safeParse({ ...current, protocolVersion: 2 }).success,
    ).toBe(false);
    expect(
      teacherPairingSchema.safeParse({ action: "sql", query: "drop" }).success,
    ).toBe(false);
  });
});
