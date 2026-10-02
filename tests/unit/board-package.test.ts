import { describe, expect, it } from "vitest";
import { boardPackageFixture } from "../fixtures/board-package";
import {
  parseBoardPackage,
  parseBoardPacket,
  publicBoardPacket,
  publicBoardPackage,
} from "../../src/contracts/board-package";
import {
  packagePages,
  currentPackagePage,
} from "../../src/features/layar/package-navigation";
import { presentationStateSchema } from "../../src/contracts/presentation";
import { questionTool } from "../../src/core/package/tool-task";
import { generateQuestion } from "../../src/core/package/question";
import { publicTool } from "../../src/contracts/tools";
import { checkModel, exampleFrames } from "../../src/core/tools/patterns";

describe("board content cache and local navigation boundary", () => {
  it("keeps frozen v1 fractions intact when their common partition exceeds the interactive limit", () => {
    let unsupported = 0;
    for (const step of ["C3", "D2"] as const)
      for (let seed = 0; seed < 100; seed++) {
        const old = generateQuestion(step, seed, 1),
          before = JSON.stringify(old),
          task = questionTool(old);
        if (task) expect(() => publicTool(task)).not.toThrow();
        else unsupported++;
        expect(JSON.stringify(old)).toBe(before);
        expect(() =>
          publicTool(questionTool(generateQuestion(step, seed, 2))!),
        ).not.toThrow();
      }
    expect(unsupported).toBeGreaterThan(0);
  });
  it("keeps actual C4 rupiah values valid in the ratio model", () => {
    for (let seed = 0; seed < 100; seed++) {
      const task = questionTool(generateQuestion("C4", seed))!;
      expect(() => publicTool(task)).not.toThrow();
      expect(checkModel(task, exampleFrames(task).at(-1)!)).toBe(true);
    }
  });
  it("maps actual package content without assessment keys, student IDs, level or roster", () => {
    const { p, packet } = boardPackageFixture();
    const serialized = JSON.stringify(packet.content);
    for (const key of [
      "answerKey",
      "reasonKey",
      "stepId",
      "studentId",
      "attendanceNumbers",
      "classId",
      "members",
      "name",
      "mastery",
    ])
      expect(serialized).not.toContain(`"${key}"`);
    expect(packet.content.content.assessment[0].id).toBe(p.assessment[0].id);
    expect(
      packet.content.models.every((m) =>
        p.activities.some((a) => a.board.some((q) => q.id === m.questionId)),
      ),
    ).toBe(true);
    expect(parseBoardPacket(packet)).toEqual(packet);
    const extendedContent = {
      ...packet.content,
      name: "CANARY",
      plan: packet.plan,
    };
    const extendedPacket = { ...packet, name: "CANARY" };
    expect(publicBoardPackage(extendedContent)).toEqual(packet.content);
    expect(publicBoardPacket(extendedPacket)).toEqual(packet);
  });
  it("rejects extra fields on storage and nested assessment-key injection", () => {
    const { packet } = boardPackageFixture();
    expect(() => parseBoardPackage(packet)).toThrow();
    expect(() =>
      parseBoardPackage({ ...packet.content, plan: packet.plan }),
    ).toThrow();
    const injected = structuredClone(packet);
    Object.assign(injected.content.content.assessment[0], { answerKey: "A" });
    expect(() => parseBoardPacket(injected)).toThrow();
    expect(publicBoardPacket(injected)).toEqual(packet);
  });
  it("rejects unknown/duplicate model and group bindings", () => {
    const { packet } = boardPackageFixture();
    const input = structuredClone(packet);
    input.plan.groups[0].activityId = input.plan.id;
    expect(() => parseBoardPacket(input)).toThrow();
    expect(() =>
      parseBoardPacket({
        ...packet,
        plan: {
          ...packet.plan,
          groups: [packet.plan.groups[0], packet.plan.groups[0]],
        },
      }),
    ).toThrow();
    expect(() =>
      parseBoardPackage({
        ...packet.content,
        models: [packet.content.models[0], packet.content.models[0]],
      }),
    ).toThrow();
    expect(() =>
      parseBoardPackage({
        ...packet.content,
        models: [
          {
            ...packet.content.models[0],
            questionId: packet.content.content.assessment[0].id,
          },
        ],
      }),
    ).toThrow();
  });
  it.each([5, 7])(
    "grade %i navigates actual package, schedule and three public exit rows without recording evidence",
    (grade) => {
      const { packet } = boardPackageFixture(grade);
      const pages = packagePages(packet.content, packet.plan, packet.plan.id);
      expect(pages[0].state.mode).toBe("opening");
      expect(pages.at(-1)?.state.mode).toBe("reflection");
      expect(pages.filter((p) => p.state.mode === "check")).toHaveLength(5);
      expect(pages.filter((p) => p.state.mode === "exit")).toHaveLength(3);
      for (const p of pages) {
        expect(presentationStateSchema.safeParse(p.state).success).toBe(true);
        expect(p.state.roles).toBeUndefined();
        expect(p.state.station?.deadlineAt ?? null).toBe(null);
        expect(currentPackagePage(pages, p.state)).toBe(pages.indexOf(p));
      }
      const lastExit = pages.filter((p) => p.state.mode === "exit")[2].state
        .exit!;
      expect(lastExit.groups[0].question).toEqual(
        packet.content.content.activities.find(
          (a) => a.id === packet.plan.groups[0].contextActivityId,
        )!.exitContext,
      );
    },
  );
  it("offline reload uses anonymous selected practice and loses all roster/bindings", () => {
    const { packet } = boardPackageFixture();
    const last = packet.content.content.activities.at(-1)!;
    const pages = packagePages(
      packet.content,
      undefined,
      packet.plan.id,
      last.id,
    );
    expect(pages.every((p) => !p.state.groups.length)).toBe(true);
    expect(pages.some((p) => p.state.mode === "groups")).toBe(false);
    expect(
      pages.find((p) => p.state.mode === "station")?.state.practice?.question,
    ).toEqual(last.board[0]);
    expect(JSON.stringify(pages)).not.toContain("attendanceNumbers");
  });
  it("short variation uses split panels with the actual two group activities", () => {
    const { packet } = boardPackageFixture(7, true);
    const pages = packagePages(packet.content, packet.plan, packet.plan.id);
    expect(
      pages.find((p) => p.state.mode === "split")?.state.split?.panels,
    ).toHaveLength(2);
    expect(packet.plan.stations).toHaveLength(1);
  });
});
