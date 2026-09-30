import { describe, expect, it } from "vitest";
import {
  planTurns,
  splitTeams,
  startTurn,
  turnCounts,
} from "../../src/core/turns/scheduler";
import { seededGroupId } from "../../src/core/math/seed";
import { projectTurn } from "../../src/contracts/turns";
const students = Array.from({ length: 13 }, (_, i) => ({
  studentId: seededGroupId(12, i),
  attendanceNumber: i + 1,
  present: true,
  navigatorFirst: false,
}));
const input = {
  id: seededGroupId(0, 1),
  sessionId: seededGroupId(0, 2),
  groupId: seededGroupId(0, 3),
  taskIndex: 0,
  seed: 91,
  students,
  events: [],
  teams: splitTeams(students, [], 90),
  verifiedTouches: 2,
};
describe("TURN01 actual-start ledger", () => {
  it("balances teams and alternates without counting preview", () => {
    expect(input.teams.map((t) => t.length)).toEqual([7, 6]);
    const first = planTurns(input),
      second = planTurns({ ...input, taskIndex: 1 });
    expect(first.pilots.every((id) => input.teams[0].includes(id))).toBe(true);
    expect(second.pilots.every((id) => input.teams[1].includes(id))).toBe(true);
    expect(input.events).toEqual([]);
    expect(planTurns(input)).toEqual(first);
    const events = startTurn([], first);
    expect(startTurn(events, first)).toBe(events);
    expect(turnCounts(events, first.pilots[0]).pilot).toBe(1);
    expect(() => startTurn(events, { ...first, seed: 3 })).toThrow("conflict");
  });
  it.each([0, 1, 2, 4])(
    "%i touch uses eligible disjoint roles only",
    (verifiedTouches) => {
      const roster = students
        .slice(0, 5)
        .map((s, i) => ({ ...s, present: i !== 0, navigatorFirst: i === 1 }));
      const event = planTurns({
        ...input,
        verifiedTouches,
        students: roster,
        teams: splitTeams(roster, [], 1),
      });
      expect(event.pilots).toHaveLength(verifiedTouches >= 2 ? 2 : 1);
      expect(event.pilots).not.toContain(roster[1].studentId);
      expect([...event.pilots, ...event.navigators]).not.toContain(
        roster[0].studentId,
      );
      expect(new Set([...event.pilots, ...event.navigators]).size).toBe(
        event.pilots.length + event.navigators.length,
      );
    },
  );
  it("chooses least turns, no duplicates for one/zero present, and no identities in public DTO", () => {
    const roster = students.slice(0, 3),
      teams = splitTeams(roster, [], 1);
    const first = planTurns({
      ...input,
      students: roster,
      teams,
      verifiedTouches: 1,
    });
    const next = planTurns({
      ...input,
      id: seededGroupId(1, 1),
      taskIndex: 1,
      students: roster,
      teams,
      verifiedTouches: 1,
      events: [first],
    });
    expect(next.pilots).not.toContain(first.pilots[0]);
    const publicValue = projectTurn(
      first,
      roster.map((s) => ({ ...s, name: "LOCAL_CANARY" })),
    );
    expect(JSON.stringify(publicValue)).not.toMatch(
      /studentId|LOCAL_CANARY|name/,
    );
    const alone = planTurns({
      ...input,
      students: roster.slice(0, 1),
      teams: [[roster[0].studentId]],
    });
    expect(alone.pilots).toHaveLength(1);
    expect(alone.navigators).toEqual([]);
    const absent = planTurns({
      ...input,
      students: roster.map((s) => ({ ...s, present: false })),
      teams,
    });
    expect(absent.pilots).toEqual([]);
    expect(absent.navigators).toEqual([]);
  });
});
