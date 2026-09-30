import { describe, expect, it } from "vitest";
import { STEP_IDS, type StepId } from "../../src/content/ladder/registry";
import {
  DEMO_LABEL_SEED,
  demoGroupRoster,
} from "../../src/content/demo/class-7b";
import {
  GROUP_LABELS,
  groupStudents,
  moveGroupStudent,
  type GroupStudent,
} from "../../src/core/groups/grouping";
import {
  seededGroupId,
  seededRandom,
  seededShuffle,
} from "../../src/core/math/seed";
import { serializeBoardState } from "../../src/contracts/board";
import {
  id,
  level,
  lanjut,
  baseline,
  history,
  revision,
  session,
  weeklyBinding,
} from "../fixtures/placement";
import { replayPlacement } from "../../src/core/placement/replay";

function roster(
  counts: readonly number[],
  steps: readonly StepId[] = STEP_IDS,
): GroupStudent[] {
  let attendanceNumber = 0;
  return counts.flatMap((count, i) =>
    Array.from({ length: count }, () => ({
      studentId: id(++attendanceNumber),
      attendanceNumber,
      active: true,
      displayed: level(steps[i]),
    })),
  );
}
const config = { target: "D5" as const, seed: DEMO_LABEL_SEED };

describe("Grouping from displayed placement", () => {
  it("canonical 7B is 7/13/12 with seeded source labels and D3+D4 composition", () => {
    const groups = groupStudents(demoGroupRoster(), config).groups;
    expect(
      groups.map((g) => [
        g.label,
        g.members.length,
        g.activityStep,
        g.exitBaseStep,
        g.exitContextStep,
      ]),
    ).toEqual([
      ["Segitiga Biru", 7, "D1", "D1", "D1"],
      ["Lingkaran Oranye", 13, "D2", "D2", "D2"],
      ["Kotak Hijau", 12, "D3", "D3", "D4"],
    ]);
    expect(groups[2].composition).toEqual([
      { placement: level("D3"), count: 8 },
      { placement: level("D4"), count: 4 },
    ]);
    expect(groups[2].extensionSteps).toEqual(["D4"]);
  });
  it("merges occupied adjacent levels, including gaps; equal totals choose lower pair", () => {
    const result = groupStudents(
      roster([3, 3, 3, 3], ["A1", "B1", "C1", "D1"]),
      { ...config, desiredGroups: 3 },
    );
    expect(result.groups.map((g) => g.members.length)).toEqual([6, 3, 3]);
    expect(result.groups[0].activityStep).toBe("A1");
    expect(result.groups[0].exitContextStep).toBe("B1");
    expect(result.merges[0].reason).toBe("group-limit");
  });
  it("small group goes to the smaller neighbor; majority activity and lower support are explicit", () => {
    const result = groupStudents(roster([2, 7, 6], ["D1", "D2", "D3"]), config);
    expect(result.groups.map((g) => g.members.length)).toEqual([9, 6]);
    expect(result.groups[0]).toMatchObject({
      activityStep: "D2",
      exitBaseStep: "D1",
      exitContextStep: "D2",
      supportStudentIds: [id(1), id(2)],
    });
    expect(result.merges[0].reason).toBe("small-group");
    expect(
      groupStudents(roster([5, 1, 3]), config).groups.map(
        (g) => g.members.length,
      ),
    ).toEqual([5, 4]);
    expect(
      groupStudents(roster([3, 1, 3]), config).groups.map(
        (g) => g.members.length,
      ),
    ).toEqual([4, 3]);
  });
  it("repeats small merges; majority ties choose lower level; does not force target count", () => {
    const result = groupStudents(roster([1, 1, 1]), config);
    expect(result.groups).toHaveLength(1);
    expect(result.groups[0].activityStep).toBe("A1");
    expect(result.merges).toHaveLength(2);
    expect(groupStudents(roster([8, 10]), config).groups).toHaveLength(2);
  });
  it.each([0, 1, 2, 3, 5, 6, 8, 9, 13, 32, 40])(
    "homogeneous N=%s is balanced, deterministic, no fictitious pupils",
    (n) => {
      const students = roster([n], ["D1"]);
      const result = groupStudents(students, config);
      expect(result.groups).toHaveLength(
        n === 0 ? 0 : Math.min(3, Math.max(1, Math.floor(n / 3))),
      );
      expect(result.groups.flatMap((g) => g.members)).toHaveLength(n);
      const sizes = result.groups.map((g) => g.members.length);
      if (sizes.length)
        expect(Math.max(...sizes) - Math.min(...sizes)).toBeLessThanOrEqual(1);
      expect(result.smallClass).toBe(n > 0 && n < 3);
      expect(groupStudents(students.toReversed(), config)).toEqual(result);
    },
  );
  it("Lanjut stays enrichment, activity anchors at target, and inactive pupils stay out", () => {
    const students = [
      ...roster([3], ["D5"]),
      ...roster([2], ["E4"]).map((s, i) => ({
        ...s,
        studentId: id(i + 4),
        attendanceNumber: i + 4,
        displayed: lanjut,
      })),
      {
        studentId: id(6),
        attendanceNumber: 6,
        displayed: level("A1"),
        active: false,
      },
    ];
    const result = groupStudents(students, config);
    expect(result.groups).toHaveLength(1);
    expect(result.groups[0]).toMatchObject({
      activityStep: "D5",
      exitBaseStep: "D5",
      exitContextStep: "D5",
      enrichmentStudentIds: [id(4), id(5)],
    });
    expect(result.groups[0].members).toHaveLength(5);
    expect(
      groupStudents(
        students.map((s) => ({ ...s, displayed: lanjut })),
        config,
      ).groups[0].activityStep,
    ).toBe("D5");
  });
  it("seed changes labels but never quota merges; input order never changes output", () => {
    const students = demoGroupRoster();
    const first = groupStudents(students, config);
    const labels = new Set<string>();
    for (let seed = 0; seed < 32; seed++) {
      const result = groupStudents(seededShuffle(students, seed), {
        ...config,
        seed,
      });
      expect(result.groups.map((g) => g.members)).toEqual(
        first.groups.map((g) => g.members),
      );
      expect(result.merges).toEqual(first.merges);
      labels.add(result.groups.map((g) => g.label).join("/"));
    }
    expect(labels.size).toBeGreaterThan(4);
  });
  it("property matrix: 120 deterministic rosters conserve active IDs and unique labels", () => {
    for (let seed = 0; seed < 120; seed++) {
      const random = seededRandom(seed);
      const n = seed % 41;
      const students = roster([n]).map((s) => ({
        ...s,
        active: random() > 0.15,
        displayed: level(STEP_IDS[Math.floor(random() * STEP_IDS.length)]),
      }));
      const desiredGroups = 2 + (seed % 3);
      const result = groupStudents(students, {
        ...config,
        seed,
        desiredGroups,
      });
      expect(result.groups.length).toBeLessThanOrEqual(desiredGroups);
      expect(
        result.groups.every((g) => g.members.length >= 3 || result.smallClass),
      ).toBe(true);
      expect(
        result.groups.flatMap((g) => g.members.map((m) => m.studentId)).sort(),
      ).toEqual(
        students
          .filter((s) => s.active)
          .map((s) => s.studentId)
          .sort(),
      );
      expect(new Set(result.groups.map((g) => g.id)).size).toBe(
        result.groups.length,
      );
      expect(new Set(result.groups.map((g) => g.label)).size).toBe(
        result.groups.length,
      );
      expect(
        groupStudents(students.toReversed(), {
          ...config,
          seed,
          desiredGroups,
        }),
      ).toEqual(result);
    }
  });
  it("manual move only edits membership, preserves labels/activity, and leaves input immutable", () => {
    const result = groupStudents(demoGroupRoster(), config);
    const before = JSON.stringify(result);
    const moved = moveGroupStudent(
      result.groups,
      result.groups[0].members[0].studentId,
      result.groups[1].id,
      "D5",
    );
    expect(moved.map((g) => g.members.length)).toEqual([6, 14, 12]);
    expect(moved[1].activityStep).toBe("D2");
    expect(moved[1].exitBaseStep).toBe("D1");
    expect(JSON.stringify(result)).toBe(before);
    expect(() =>
      moveGroupStudent(result.groups, id(999), result.groups[0].id, "D5"),
    ).toThrow();
    const tiny = groupStudents(roster([1]), config).groups;
    expect(moveGroupStudent(tiny, id(1), tiny[0].id, "D5")).toEqual(tiny);
  });
  it("board serialization projects shape/color and attendance without private group composition", () => {
    const groups = groupStudents(demoGroupRoster(), config).groups;
    const payload = JSON.parse(
      serializeBoardState({
        groups: groups.map((g) => ({
          ...g,
          attendanceNumbers: g.members.map((s) => s.attendanceNumber),
        })),
      }),
    );
    expect(Object.keys(payload.groups[0])).toEqual([
      "id",
      "label",
      "attendanceNumbers",
    ]);
    expect(JSON.stringify(payload)).not.toMatch(
      /D[1-5]|mastery|studentId|displayed|composition|support/,
    );
  });
  it("two sessions of different evidence change real displayed distribution via production replay", () => {
    const s1 = session(1),
      s2 = session(2);
    const b1 = weeklyBinding(s1),
      b2 = weeklyBinding(s2);
    const base = {
      ...baseline(),
      mastery: { ...baseline().mastery, D1: 0.79, D2: 0.79 },
    };
    const r1 = revision(b1, ["missing", "missing", "correct"]);
    const first = replayPlacement(base, history([s1], [b1], [r1]));
    const second = replayPlacement(
      base,
      history(
        [s1, s2],
        [b1, b2],
        [r1, revision(b2, ["missing", "missing", "missing", "correct"])],
      ),
    );
    const students = roster([3, 3], ["D1", "D3"]);
    const from = groupStudents(
      students.map((s) =>
        s.attendanceNumber <= 3
          ? { ...s, displayed: first.placement.displayed! }
          : s,
      ),
      config,
    );
    const to = groupStudents(
      students.map((s) =>
        s.attendanceNumber <= 3
          ? { ...s, displayed: second.placement.displayed! }
          : s,
      ),
      config,
    );
    expect(from.homogeneous).toBe(false);
    expect(to.homogeneous).toBe(true);
    expect(to.groups.every((g) => g.activityStep === "D3")).toBe(true);
  });
  it("rejects duplicate identity, invalid settings, private/computed extras and overlarge roster", () => {
    const one = roster([1]);
    for (const desiredGroups of [0, 1, 5, 2.5])
      expect(() => groupStudents(one, { ...config, desiredGroups })).toThrow();
    for (const seed of [-1, NaN, 0x100000000])
      expect(() => groupStudents(one, { ...config, seed })).toThrow();
    expect(() => groupStudents([...one, ...one], config)).toThrow();
    expect(() => groupStudents(roster([41]), config)).toThrow();
    expect(() =>
      groupStudents([{ ...one[0], attendanceNumber: 41 }], config),
    ).toThrow();
    expect(() =>
      groupStudents(
        [{ ...one[0], computed: level("E4") } as GroupStudent],
        config,
      ),
    ).toThrow();
    expect(() =>
      groupStudents(
        [{ ...one[0], name: "LOCAL_ONLY_CANARY" } as GroupStudent],
        config,
      ),
    ).toThrow();
    expect(() => seededRandom(0x100000000)).toThrow();
    expect(() => seededGroupId(1, -1)).toThrow();
    expect(seededShuffle(GROUP_LABELS, 80)).toEqual(GROUP_LABELS);
  });
});
