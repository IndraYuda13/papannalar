import { describe, it, expect } from "vitest";
import {
  suggestLessonGroups,
  validateLessonGroups,
} from "../../src/core/groups/lesson-groups";
import { runV2Schema } from "../../src/contracts/library";
import { selectTopicEvidence } from "../../src/core/assessment/topic-evidence";
const ids = Array.from(
  { length: 9 },
  (_, i) => `90000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`,
);
const presence = ids.map((id, i) => ({ id, attendanceNumber: i + 1 }));
describe("observed evidence and real-class groups", () => {
  it("never pools incompatible sets or promotes review/group activity to evidence", () => {
    const competency = {
      topicId: "bilangan",
      competencyId: "bilangan-operasi",
      mappingVersion: 1 as const,
    };
    const run = runV2Schema.parse({
      id: ids[0],
      classId: ids[1],
      classLabel: "7A",
      collectionId: ids[2],
      version: 1,
      date: "2026-10-13",
      mode: "teach",
      responseMethod: "cards",
      mapping: { default: competency, overrides: [] },
      parentLessonId: null,
      assignmentId: null,
      status: "closed",
      position: 0,
      revision: 1,
      formId: ids[3],
      roster: presence,
      synthetic: false,
      document: {
        title: "Bilangan",
        kind: "cards",
        items: [
          {
            id: ids[4],
            kind: "card",
            prompt: "2+3",
            options: ["5", "4", "3", "2"],
            key: "A",
            explanation: "",
          },
        ],
      },
    });
    const response = (studentId: string) => ({
      studentId,
      answers: ["A" as const],
      answerStates: ["answered" as const],
      revision: 1,
      correct: 1,
      status: "received" as const,
      updatedAt: "2026-10-13T00:00:00Z",
    });
    const results = [
      { run, responses: [response(ids[0]), response(ids[1])] },
      {
        run: { ...run, id: ids[5], collectionId: ids[6] },
        responses: [response(ids[2])],
      },
      {
        run: { ...run, id: ids[7], responseMethod: "none" as const },
        responses: [response(ids[3])],
      },
      {
        run: { ...run, id: ids[8] },
        responses: [{ ...response(ids[4]), status: "review" as const }],
      },
    ];
    const selected = selectTopicEvidence({ presence, competency, results });
    expect(
      selected.filter((e) => e.status === "known").map((e) => e.studentId),
    ).toEqual([ids[0], ids[1]]);
    expect(selected[2].reason).toBe("not_comparable");
    expect(selected[3].evidence).toBe(null);
    expect(selected[4].evidence).toBe(null);
  });
  it("covers every pupil in property-sized classes and any editable group count", () => {
    for (let n = 1; n <= presence.length; n++)
      for (let count = 1; count <= n; count++) {
        const roster = presence.slice(0, n);
        const groups = suggestLessonGroups({
          presence: roster,
          evidence: [],
          groupCount: count,
          seed: `seed:${n}`,
        });
        expect(() => validateLessonGroups(roster, groups)).not.toThrow();
        const sizes = groups.map((g) => g.studentIds.length);
        expect(Math.max(...sizes) - Math.min(...sizes)).toBeLessThanOrEqual(1);
      }
  });
  it("keeps all unknown without fabricated placement", () => {
    const evidence = selectTopicEvidence({
      presence,
      competency: null,
      results: [],
    });
    expect(
      evidence.every((e) => e.status === "unknown" && e.evidence === null),
    ).toBe(true);
    const input = { presence, evidence, groupCount: 3, seed: "stable" };
    const groups = suggestLessonGroups(input);
    expect(groups).toEqual(suggestLessonGroups(input));
    expect(groups.map((g) => g.studentIds.length)).toEqual([3, 3, 3]);
    expect(() => validateLessonGroups(presence, groups)).not.toThrow();
    expect(() =>
      validateLessonGroups(presence, [...groups, groups[0]]),
    ).toThrow();
  });
  it("rejects zero groups and missing members", () => {
    expect(() =>
      suggestLessonGroups({ presence, evidence: [], groupCount: 0, seed: "x" }),
    ).toThrow();
    expect(() => validateLessonGroups(presence, [])).toThrow();
  });
});
