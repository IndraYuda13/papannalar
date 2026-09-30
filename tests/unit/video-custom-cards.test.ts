import { describe, expect, it, vi } from "vitest";
import * as customForm from "../../src/contracts/custom-form";
import { scanResultSchema } from "../../src/contracts/scanner";
import { cardDrawing } from "../../src/cards/drawing";
import { syntheticCard } from "../../src/cards/synthetic";
import {
  CARD_KINDS,
  CARD_OPTIONS,
  cardLayout,
  decodeLayout,
  layoutPayload,
} from "../../src/cards/layouts/layout-v1";
import { scanCard } from "../../src/workers/omr/scan";

const binding: customForm.CustomFormBinding = {
  intent: "custom_assessment",
  formId: "ba7f18ae-496f-4c11-92ab-96752a8c1b87",
  version: 3,
  pageIndex: 0,
  rows: 3,
};
const roster = [7, 12];

describe("V4 immutable custom form contract", () => {
  it("accepts only form metadata, snapshots it and leaves legacy QR unchanged", () => {
    const original = { ...binding },
      parsed = customForm.parseCustomFormBinding(original);
    expect(Object.isFrozen(parsed)).toBe(true);
    original.version = 4;
    expect(parsed.version).toBe(3);
    const payload = customForm.customFormPayload(parsed);
    expect(payload).toContain("intent=custom_assessment");
    expect(payload).toContain(`form=${binding.formId}|version=3|page=0|rows=3`);
    expect(payload).not.toMatch(/student|class|teacher|name|absen|https/);
    expect(decodeLayout(payload)).toBeNull();
    for (const kind of CARD_KINDS)
      expect(decodeLayout(layoutPayload(kind))).toBe(kind);
  });
  it.each([
    { intent: "weekly" },
    { formId: "not-a-uuid" },
    { formId: "ba7f18ae-496f-1c11-92ab-96752a8c1b87" },
    { version: 0 },
    { version: 1.5 },
    { version: Infinity },
    { version: Number.MAX_SAFE_INTEGER + 1 },
    { pageIndex: 1 },
    { rows: 0 },
    { rows: 6 },
    { rows: 2.5 },
    { studentName: "PRIVATE_CANARY" },
  ])("rejects unsupported binding %j", (change) => {
    expect(() =>
      customForm.parseCustomFormBinding({ ...binding, ...change }),
    ).toThrow("Invalid boundary data");
  });
  it.each(["initial", "exit"] as const)(
    "does not reinterpret the %s layout as a custom form",
    (kind) => {
      expect(() => cardDrawing(kind, binding)).toThrow("weekly layout");
      expect(
        scanCard(
          syntheticCard({ kind, attendance: 7, answers: [] }),
          kind,
          roster,
          binding,
        ).issues,
      ).toEqual(["layout"]);
    },
  );
  it("marks every unused row and prevents synthetic inputs from hiding extra answers", () => {
    const commands = cardDrawing("weekly", binding);
    expect(
      commands.some((c) => c.kind === "text" && c.text === "Cek pemahaman"),
    ).toBe(true);
    expect(
      commands.filter(
        (c) => c.kind === "text" && c.text.startsWith("Tidak digunakan"),
      ),
    ).toHaveLength(2);
    for (const row of cardLayout("weekly").answers.slice(binding.rows))
      expect(
        commands.filter((c) => c.kind === "circle" && c.y === row[0].y),
      ).toHaveLength(0);
    expect(() =>
      syntheticCard({
        kind: "weekly",
        attendance: 7,
        binding,
        answers: ["A", "B", "C", "D"],
      }),
    ).toThrow("printed form rows");
  });
});

describe("V4 custom OMR from actual pixels", () => {
  it.each([0, 1, 2, 3] as const)(
    "reads bound answers at rotation %i with perspective and shadow",
    (rotation) => {
      const frame = syntheticCard({
        kind: "weekly",
        attendance: 7,
        binding,
        answers: ["A", null, "?"],
        rotation,
        skew: 4,
        shade: 0.08,
        scale: 4,
      });
      const result = scanCard(frame, "weekly", roster, binding);
      expect(result).toMatchObject({
        status: "accepted",
        attendanceNumber: 7,
        form: binding,
      });
      expect(result.answers).toEqual([
        { status: "accepted", result: "A" },
        { status: "blank", result: "?" },
        { status: "accepted", result: "?" },
      ]);
      expect(scanResultSchema.parse(result)).toEqual(result);
    },
  );
  it.each([1, 5])(
    "emits exactly %i active rows, never treating unused rows as answers",
    (rows) => {
      const form = { ...binding, rows };
      const answers = CARD_OPTIONS.slice(0, rows);
      const result = scanCard(
        syntheticCard({
          kind: "weekly",
          attendance: 12,
          binding: form,
          answers,
        }),
        "weekly",
        roster,
        form,
      );
      expect(result.status).toBe("accepted");
      expect(result.answers.map((a) => a.result)).toEqual(answers);
      expect(result.form?.rows).toBe(rows);
    },
  );
  it("rejects generic cards in custom mode and custom cards in a legacy scanner", () => {
    const custom = syntheticCard({
      kind: "weekly",
      attendance: 7,
      answers: ["A", "B", "C"],
      binding,
    });
    const legacy = syntheticCard({
      kind: "weekly",
      attendance: 7,
      answers: ["A", "B", "C"],
    });
    for (const result of [
      scanCard(custom, "weekly", roster),
      scanCard(legacy, "weekly", roster, binding),
    ]) {
      expect(result).toMatchObject({
        status: "rejected",
        issues: ["layout"],
        answers: [],
      });
      expect(result.form).toBeUndefined();
    }
  });
  it.each([
    { version: 4 },
    { rows: 2 },
    { formId: "0d1ca945-6580-4eb8-b1aa-8c27030f1642" },
  ])("requires the exact expected form metadata %j", (change) => {
    const frame = syntheticCard({
      kind: "weekly",
      attendance: 7,
      answers: [],
      binding,
    });
    expect(
      scanCard(frame, "weekly", roster, { ...binding, ...change }),
    ).toMatchObject({ status: "rejected", answers: [], issues: ["layout"] });
  });
  it.each([
    (payload: string) => payload.replace("page=0", "page=1"),
    (payload: string) => payload.replace("layout=1", "layout=2"),
    (payload: string) => `${payload}|unexpected=1`,
  ])(
    "rejects a QR containing an unsupported page/layout or appended data",
    (alter) => {
      const payload = customForm.customFormPayload(binding);
      // Corrupt only the printed QR. Decode/geometry/classification remain real.
      const payloadOverride = vi
        .spyOn(customForm, "customFormPayload")
        .mockReturnValue(alter(payload));
      let frame;
      try {
        frame = syntheticCard({
          kind: "weekly",
          attendance: 7,
          answers: [],
          binding,
          scale: 5,
        });
      } finally {
        payloadOverride.mockRestore();
      }
      expect(scanCard(frame, "weekly", roster, binding)).toMatchObject({
        status: "rejected",
        answers: [],
        issues: ["layout"],
      });
    },
  );
  it("missing markers cannot emit a bound result; multiple marks and invalid attendance require review", () => {
    const missing = scanCard(
      syntheticCard({
        kind: "weekly",
        attendance: 7,
        binding,
        answers: [],
        missingMarker: 0,
      }),
      "weekly",
      roster,
      binding,
    );
    expect(missing.status).toBe("rejected");
    expect(missing.form).toBeUndefined();
    const multiple = scanCard(
      syntheticCard({
        kind: "weekly",
        attendance: 7,
        binding,
        answers: [["A", "B"], "C", "D"],
      }),
      "weekly",
      roster,
      binding,
    );
    expect(multiple).toMatchObject({
      status: "review",
      form: binding,
      issues: ["answers"],
    });
    expect(multiple.answers[0]).toEqual({
      status: "multiple",
      result: "missing",
    });
    const absent = scanCard(
      syntheticCard({ kind: "weekly", attendance: 40, binding, answers: [] }),
      "weekly",
      roster,
      binding,
    );
    expect(absent).toMatchObject({
      status: "review",
      form: binding,
      attendanceNumber: null,
      issues: ["attendance"],
    });
  });
  it.each(CARD_KINDS)("preserves old %s cards and QR payloads", (kind) => {
    const answers = Array.from(
      { length: cardLayout(kind).rows },
      (_, i) => CARD_OPTIONS[i % 5],
    );
    const result = scanCard(
      syntheticCard({ kind, attendance: 7, answers, skew: 6 }),
      kind,
      roster,
    );
    expect(result.status).toBe("accepted");
    expect(result.form).toBeUndefined();
    expect(result.answers.map((a) => a.result)).toEqual(answers);
  });
});
