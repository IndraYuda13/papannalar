import { mkdir, writeFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import {
  CARD_KINDS,
  CARD_OPTIONS,
  cardLayout,
  type CardAnswer,
} from "../../src/cards/layouts/layout-v1";
import { syntheticCard } from "../../src/cards/synthetic";
import { classifyBubbleRow, scanCard } from "../../src/workers/omr/scan";
import { homography, project } from "../../src/workers/omr/geometry";

const roster = Array.from({ length: 40 }, (_, i) => i + 1);
describe("Client OMR geometry and classification", () => {
  it.each([4, 6, 8, 14, 28])("subpixel QR perspective regression %s", (i) => {
    const kind = CARD_KINDS[i % 3];
    const answers = Array.from(
      { length: cardLayout(kind).rows },
      (_, row) => CARD_OPTIONS[(i + row) % 5],
    );
    const result = scanCard(
      syntheticCard({
        kind,
        attendance: (i % 40) + 1,
        answers,
        rotation: (i % 4) as 0 | 1 | 2 | 3,
        skew: (i % 5) * 2,
        shade: (i % 4) * 0.08,
        scale: 3.5,
      }),
      kind,
      roster,
    );
    expect(result, JSON.stringify(result)).toMatchObject({
      status: "accepted",
      attendanceNumber: (i % 40) + 1,
    });
    expect(result.answers.map((a) => a.result)).toEqual(answers);
  });
  it.each([
    { input: [0, 0, 0], expected: { status: "blank", index: null } },
    { input: [0, 0.8, 0], expected: { status: "accepted", index: 1 } },
    { input: [0, 0.4, 0], expected: { status: "ambiguous", index: null } },
    { input: [0.8, 0.8, 0], expected: { status: "multiple", index: null } },
    { input: [0, null, 0], expected: { status: "missing", index: null } },
  ])("bubble $expected.status is explicit", ({ input, expected }) =>
    expect(classifyBubbleRow(input)).toEqual(expected),
  );
  it("homography maps all four corners and known interior without affine assumptions", () => {
    const from = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
    ];
    const to = [
      { x: 5, y: 2 },
      { x: 30, y: 4 },
      { x: 27, y: 31 },
      { x: 2, y: 22 },
    ];
    const h = homography(from, to),
      inverse = homography(to, from);
    from.forEach((p, i) => {
      const actual = project(h, p.x, p.y);
      expect(actual.x).toBeCloseTo(to[i].x, 8);
      expect(actual.y).toBeCloseTo(to[i].y, 8);
    });
    const q = project(h, 3, 7),
      p = project(inverse, q.x, q.y);
    expect(p.x).toBeCloseTo(3, 8);
    expect(p.y).toBeCloseTo(7, 8);
    expect(() => homography(from.slice(1), to)).toThrow();
    expect(() => homography(Array(4).fill(from[0]), to)).toThrow();
  });
  it.each(CARD_KINDS)(
    "reads %s four rotations and perspective from actual pixels",
    (kind) => {
      const answers = Array.from(
        { length: cardLayout(kind).rows },
        (_, i) => CARD_OPTIONS[i % 5],
      );
      for (const rotation of [0, 1, 2, 3] as const) {
        const result = scanCard(
          syntheticCard({
            kind,
            attendance: 7,
            answers,
            rotation,
            skew: 10,
            shade: 0.2,
          }),
          kind,
          roster,
        );
        expect(
          result,
          JSON.stringify({ rotation, kind, result }),
        ).toMatchObject({
          status: "accepted",
          attendanceNumber: 7,
        });
        expect(result.answers.map((a) => a.result)).toEqual(answers);
      }
    },
  );
  it("blank -> ?, multiple/faint -> review, absent ROI/card is not a wrong answer", () => {
    const blank = scanCard(
      syntheticCard({
        kind: "weekly",
        attendance: 12,
        answers: [null, "B", "?", "C", "D"],
      }),
      "weekly",
      roster,
    );
    expect(blank.status).toBe("accepted");
    expect(blank.answers[0]).toEqual({ status: "blank", result: "?" });
    const multiple = scanCard(
      syntheticCard({
        kind: "weekly",
        attendance: 12,
        answers: [["A", "B"], "B", "?", "C", "D"],
      }),
      "weekly",
      roster,
    );
    expect(multiple.status).toBe("review");
    expect(multiple.answers[0].status).toBe("multiple");
    const faint = scanCard(
      syntheticCard({
        kind: "weekly",
        attendance: 12,
        answers: ["A", "B", "?", "C", "D"],
        faintRow: 0,
      }),
      "weekly",
      roster,
    );
    expect(faint.status).toBe("review");
    expect(faint.answers[0].status).toBe("ambiguous");
    const cropped = scanCard(
      syntheticCard({
        kind: "weekly",
        attendance: 12,
        answers: [],
        missingMarker: 0,
      }),
      "weekly",
      roster,
    );
    expect(cropped.status).toBe("rejected");
    expect(cropped.answers).toEqual([]);
  });
  it("invalid attendance, wrong QR kind and invalid geometry never autoaccept", () => {
    for (const attendance of [0, 41])
      expect(
        scanCard(
          syntheticCard({ kind: "exit", attendance, answers: ["A", "B", "C"] }),
          "exit",
          roster,
        ).status,
      ).toBe("review");
    const frame = syntheticCard({ kind: "weekly", attendance: 7, answers: [] });
    expect(scanCard(frame, "exit", roster).status).toBe("rejected");
    expect(scanCard(frame, "weekly", [1, 2]).issues).toContain("attendance");
    expect(
      scanCard(
        { width: 1, height: 1, data: new Uint8ClampedArray(4) },
        "weekly",
        roster,
      ).issues,
    ).toEqual(["geometry"]);
    expect(
      scanCard(
        { ...frame, data: new Uint8ClampedArray(frame.data.length).fill(255) },
        "weekly",
        roster,
      ).issues,
    ).toEqual(["contrast"]);
  });
  it("1000 deterministic synthetic cards: all attendance/answer variants; report actual timings", async () => {
    const timings: number[] = [];
    let correct = 0,
      accepted = 0,
      answerCount = 0,
      correctAnswers = 0,
      attendanceCorrect = 0;
    for (let i = 0; i < 1000; i++) {
      const kind = CARD_KINDS[i % 3],
        attendance = (i % 40) + 1;
      const answers: CardAnswer[] = Array.from(
        { length: cardLayout(kind).rows },
        (_, row) => CARD_OPTIONS[(i + row) % 5],
      );
      const image = syntheticCard({
        kind,
        attendance,
        answers,
        rotation: (i % 4) as 0 | 1 | 2 | 3,
        skew: (i % 5) * 2,
        shade: (i % 4) * 0.08,
        scale: i % 2 ? 4 : 3.5,
      });
      const start = performance.now(),
        result = scanCard(image, kind, roster);
      timings.push(performance.now() - start);
      answerCount += answers.length;
      if (result.status === "accepted") accepted++;
      if (result.attendanceNumber === attendance) attendanceCorrect++;
      correctAnswers += answers.filter(
        (answer, row) => answer === result.answers[row]?.result,
      ).length;
      if (
        result.status === "accepted" &&
        result.attendanceNumber === attendance &&
        JSON.stringify(result.answers.map((a) => a.result)) ===
          JSON.stringify(answers)
      )
        correct++;
    }
    const sorted = [...timings].sort((a, b) => a - b);
    const report = {
      dataset:
        "synthetic-v1; geometry/QR/bubbles; printed text separately verified",
      cards: 1000,
      accepted,
      exactCards: correct,
      attendanceCorrect,
      answerCount,
      correctAnswers,
      rejectedOrReview: 1000 - accepted,
      firstScanMs: timings[0],
      warmMedianMs: sorted[500],
      p95Ms: sorted[950],
      maxMs: sorted[999],
      physicalPhotos: 0,
    };
    await mkdir("artifacts/qa/M03/m03b", { recursive: true });
    await writeFile(
      "artifacts/qa/M03/m03b/synthetic-results.json",
      JSON.stringify(report, null, 2),
    );
    expect(correct).toBe(1000);
    expect(correctAnswers).toBe(answerCount);
  }, 180000);
});
