import { describe, it, expect } from "vitest";
import {
  groupBoardActionSchema,
  groupBoardStateSchema,
  encodeToolModel,
  decodeToolModel,
} from "../../src/contracts/group-board";
import { reduceGroupBoardProgress } from "../../src/core/groups/group-board-progress";
import {
  emptyModel,
  exampleFrames,
  checkModel,
} from "../../src/core/tools/patterns";
import { GRAPH_EXAMPLES } from "../../src/core/tools/graph-tasks";
import { publicLibraryItem } from "../../src/contracts/library";
const id = (n: number) =>
  `b0000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const item = {
  id: id(1),
  kind: "card" as const,
  prompt: "2+3",
  options: ["5", "4", "3", "2"] as [string, string, string, string],
  key: "A" as const,
  explanation: "Lima",
};
const state = groupBoardStateSchema.parse({
  assignmentId: id(2),
  runId: id(3),
  groupLabel: "Kelompok 1",
  title: "Bilangan",
  position: 0,
  total: 2,
  revision: 1,
  taskEpoch: item.id,
  status: "active",
  item: publicLibraryItem(item),
  answer: null,
  feedback: null,
  checked: false,
  canNext: false,
});
const binding = {
  presentationId: id(4),
  channelEpoch: id(5),
  assignmentId: id(2),
  revision: 1,
  taskEpoch: item.id,
  requestId: id(6),
};
describe("limited group board", () => {
  it("roundtrips every graph rational without changing numeric graph configuration", () => {
    for (const task of Object.values(GRAPH_EXAMPLES)) {
      const model = exampleFrames(task).at(-1)!;
      const decoded = decodeToolModel(encodeToolModel(model));
      expect(decoded).toEqual(model);
      expect(checkModel(task, decoded)).toBe(true);
    }
  });
  it("wrong feedback allows next and stale next cannot advance", () => {
    const answered = reduceGroupBoardProgress(
      state,
      { action: "answer", ...binding, answer: { kind: "card", choice: "D" } },
      item,
    );
    const checked = reduceGroupBoardProgress(
      answered,
      { action: "check", ...binding, revision: 2 },
      item,
    );
    expect(checked.feedback?.status).toBe("try_again");
    expect(checked.canNext).toBe(true);
    const next = reduceGroupBoardProgress(
      checked,
      { action: "next", ...binding, revision: 3, skip: false },
      item,
    );
    expect(next.position).toBe(1);
    expect(() =>
      reduceGroupBoardProgress(
        next,
        { action: "next", ...binding, revision: 3, skip: false },
        item,
      ),
    ).toThrow("CONFLICT");
  });
  it("requires explicit skip and last-item finish", () => {
    expect(() =>
      reduceGroupBoardProgress(
        state,
        { action: "next", ...binding, skip: false },
        item,
      ),
    ).toThrow();
    expect(() =>
      reduceGroupBoardProgress(
        state,
        { action: "finish", ...binding, skip: true },
        item,
      ),
    ).toThrow();
    expect(
      reduceGroupBoardProgress(
        { ...state, position: 1 },
        { action: "finish", ...binding, skip: true },
        item,
      ).status,
    ).toBe("completed");
  });
  it("rejects key and private field injection", () => {
    expect(
      groupBoardActionSchema.safeParse({
        action: "answer",
        ...binding,
        answer: { kind: "card", choice: "A", passed: true },
      }).success,
    ).toBe(false);
    expect(
      groupBoardStateSchema.safeParse({ ...state, roster: [] }).success,
    ).toBe(false);
  });
  it("encodes exact rationals to JSON and restores model", () => {
    const task = {
      kind: "number-line" as const,
      origin: { numerator: -1, denominator: 2 },
      delta: { numerator: 3, denominator: 2 },
      orientation: "horizontal" as const,
    };
    for (const model of [emptyModel(task), ...exampleFrames(task)]) {
      const wire = encodeToolModel(model);
      expect(() => JSON.stringify(wire)).not.toThrow();
      expect(decodeToolModel(wire)).toEqual(model);
    }
    const model = exampleFrames(task).at(-1)!;
    expect(checkModel(task, decodeToolModel(encodeToolModel(model)))).toBe(
      true,
    );
  });
});
