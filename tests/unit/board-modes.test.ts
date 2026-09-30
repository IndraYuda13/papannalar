import { describe, expect, it } from "vitest";
import {
  BOARD_MODES,
  publicPresentation,
  presentationStateSchema,
  type PresentationState,
} from "../../src/contracts/presentation";
import {
  publicSplit,
  type PublicSplit,
} from "../../src/contracts/board-layout";
import {
  spotlightView,
  resumeView,
  underlyingView,
} from "../../src/features/layar/presentation-view";
import { publicTool } from "../../src/contracts/tools";
import { GRAPH_EXAMPLES } from "../../src/core/tools/graph-tasks";
import { demoOpening } from "../../src/core/package/opening";
import {
  exampleGraphs,
  checkGraphs,
  intersection,
} from "../../src/core/tools/graphs";
import { rational } from "../../src/core/math/rational";
const id = (n: number) =>
  `10000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const tool = publicTool(GRAPH_EXAMPLES.intersection);
const groups: PresentationState["groups"] = [
  { id: id(1), label: "Segitiga Biru", attendanceNumbers: [1, 2] },
  { id: id(2), label: "Lingkaran Oranye", attendanceNumbers: [3, 4] },
  { id: id(3), label: "Kotak Hijau", attendanceNumbers: [5, 6] },
  { id: id(4), label: "Belah Ketupat Ungu", attendanceNumbers: [7, 8] },
];
function panels(count: number): PublicSplit {
  return {
    panels: groups.slice(0, count).map((g, i) => ({
      groupId: g.id,
      exercises: [1, 2].map((n) => ({
        id: id(100 + i * 10 + n),
        prompt: [{ kind: "text", text: "Bandingkan kedua paket." }],
        tool,
      })),
    })),
  };
}
const base: PresentationState = {
  schemaVersion: 1,
  mode: "station",
  question: 1,
  taskEpoch: id(50),
  groups,
  tool,
  pattern: "build",
};
describe("ten board modes and public view identity", () => {
  it("contains ten distinct required modes and restores the underlying descriptor with a new remote epoch", () => {
    expect(BOARD_MODES).toHaveLength(10);
    expect(new Set(BOARD_MODES).size).toBe(10);
    const spot = spotlightView(base, tool, id(51));
    expect(spot.taskEpoch).not.toBe(base.taskEpoch);
    expect(underlyingView(spot)).toEqual({ ...base, viewId: base.taskEpoch });
    const resumed = resumeView(spot, id(52));
    expect(resumed.mode).toBe("station");
    expect(resumed.taskEpoch).toBe(id(52));
    expect(underlyingView(resumed)).toEqual(underlyingView(spot));
    expect(resumed.spotlight).toBeUndefined();
    expect(() => resumeView(base, id(51))).toThrow();
    expect(
      spotlightView(base, tool, id(51), groups[1].id).spotlight?.groupId,
    ).toBe(groups[1].id);
    expect(() => spotlightView(base, tool, id(51), id(99))).toThrow();
  });
  it.each([2, 3, 4])(
    "allows %i unique groups, bounded exercises and stable split resume",
    (count) => {
      const split = publicPresentation({
        ...base,
        mode: "split",
        split: panels(count),
      });
      expect(split.split?.panels).toHaveLength(count);
      const restored = underlyingView(
        resumeView(spotlightView(split, tool, id(51)), id(52)),
      );
      expect(restored.split).toEqual(split.split);
      expect(restored.taskEpoch).toBe(split.taskEpoch);
    },
  );
  it("rejects unknown/duplicate groups, duplicate exercises, missing view and recursive/restricted resume modes", () => {
    const value = { ...base, mode: "split", split: panels(2) };
    for (const split of [
      panels(1),
      { panels: [...panels(4).panels, panels(2).panels[0]] },
      { panels: [panels(2).panels[0], panels(2).panels[0]] },
      { panels: panels(2).panels.map((p) => ({ ...p, groupId: id(99) })) },
      {
        panels: panels(2).panels.map((p) => ({
          ...p,
          exercises: [p.exercises[0], p.exercises[0]],
        })),
      },
    ])
      expect(
        presentationStateSchema.safeParse({ ...value, split }).success,
      ).toBe(false);
    const spot = spotlightView(base, tool, id(51));
    for (const returnMode of ["spotlight", "reflection", "check", "exit"])
      expect(
        presentationStateSchema.safeParse({
          ...spot,
          spotlight: { ...spot.spotlight, returnMode },
        }).success,
      ).toBe(false);
    expect(
      presentationStateSchema.safeParse({ ...spot, viewId: undefined }).success,
    ).toBe(false);
    expect(
      presentationStateSchema.safeParse({
        ...base,
        mode: "together",
        tool: undefined,
      }).success,
    ).toBe(false);
    expect(() =>
      spotlightView({ ...base, mode: "reflection" }, tool, id(51)),
    ).toThrow();
  });
  it("maps nested descriptors by allowlist and never serializes local identity, model, ink or assessment keys", () => {
    const untrusted = {
      ...base,
      mode: "split" as const,
      split: {
        panels: panels(2).panels.map((p) => ({
          ...p,
          nickname: "CANARY",
          exercises: p.exercises.map((e) => ({
            ...e,
            answerKey: "B",
            model: { x: 5 },
            ink: [1, 2],
          })),
        })),
      },
      studentName: "CANARY",
      mastery: 0.9,
    };
    expect(presentationStateSchema.safeParse(untrusted).success).toBe(false);
    expect(publicPresentation(untrusted)).toEqual({
      ...base,
      mode: "split",
      split: panels(2),
    });
    expect(JSON.stringify(publicSplit(untrusted.split))).not.toMatch(
      /CANARY|answerKey|ink|model/,
    );
    const spot = spotlightView(base, tool, id(51));
    const extra = {
      ...spot,
      spotlight: { ...spot.spotlight!, studentName: "CANARY" },
    };
    expect(publicPresentation(extra)).toEqual(spot);
  });
  it("SD5 retains intuition and the SMA10 catalog graph solves its actual two tariffs", () => {
    expect(demoOpening(5).intuitiveOnly).toBe(true);
    const sma = demoOpening(10);
    expect(sma.tool).toEqual(GRAPH_EXAMPLES.intersection);
    expect(
      checkGraphs(
        exampleGraphs(GRAPH_EXAMPLES.intersection).at(-1)!,
        GRAPH_EXAMPLES.intersection,
      ).modelMatches,
    ).toBe(true);
    expect(intersection(...GRAPH_EXAMPLES.intersection.lines)).toEqual({
      x: rational(5),
      y: rational(25),
    });
  });
});
