import { mkdirSync, writeFileSync } from "node:fs";
import { expect, it } from "vitest";
import {
  planTurns,
  splitTeams,
  startTurn,
  type TurnEvent,
} from "../../src/core/turns/scheduler";
import { seededGroupId, seededRandom } from "../../src/core/math/seed";
it(
  "500 classes: registered-student Pilot coverage, 5% absence, deterministic production scheduler",
  { timeout: 30_000 },
  () => {
    const results = [2, 1].map((touches) => {
      let covered = 0,
        coveredStudents = 0;
      const sessions = touches === 2 ? 3 : 4;
      for (let sample = 0; sample < 500; sample++) {
        const random = seededRandom(sample),
          students = Array.from({ length: 32 }, (_, i) => ({
            studentId: seededGroupId(4, i),
            attendanceNumber: i + 1,
            present: true,
            navigatorFirst: false,
          }));
        let events: readonly TurnEvent[] = [];
        for (let session = 0; session < sessions; session++) {
          const present = students.map((s) => ({
            ...s,
            present: random() >= 0.05,
          }));
          const sessionId = seededGroupId(sample + 800, session);
          // Opening uses the same ledger, with the whole class as one candidate pool.
          events = startTurn(
            events,
            planTurns({
              id: seededGroupId(sample + 2000, session * 10),
              sessionId,
              groupId: null,
              taskIndex: 0,
              seed: Math.floor(random() * 2 ** 32),
              students: present,
              teams: [present.map((s) => s.studentId)],
              events,
              verifiedTouches: touches,
            }),
          );
          for (const [g, group] of [
            present.slice(0, 7),
            present.slice(7, 20),
            present.slice(20),
          ].entries()) {
            const seed = Math.floor(random() * 2 ** 32),
              teams = splitTeams(group, events, seed);
            for (let task = 0; task < 3; task++)
              events = startTurn(
                events,
                planTurns({
                  id: seededGroupId(
                    sample + 2000,
                    session * 10 + 1 + g * 3 + task,
                  ),
                  sessionId,
                  groupId: seededGroupId(5, g),
                  taskIndex: task,
                  seed: (seed + task) >>> 0,
                  students: group,
                  teams,
                  events,
                  verifiedTouches: touches,
                }),
              );
          }
        }
        const used = new Set(events.flatMap((e) => e.pilots));
        coveredStudents += used.size;
        if (students.every((s) => used.has(s.studentId))) covered++;
      }
      return {
        touches,
        sessions,
        classes: 500,
        roster: 32,
        grouping: [7, 13, 12],
        absenceProbability: 0.05,
        tasksPerGroup: 3,
        openingIncluded: true,
        allRegisteredCovered: covered,
        classCoverage: covered / 500,
        coveredStudents,
        registeredStudents: 16000,
      };
    });
    mkdirSync("artifacts/qa/M08", { recursive: true });
    writeFileSync(
      "artifacts/qa/M08/turn-simulation.json",
      JSON.stringify(
        {
          kind: "DETERMINISTIC_SIMULATION_NOT_CLASSROOM",
          seedRange: [0, 499],
          results,
        },
        null,
        2,
      ),
    );
    expect(results[0].classCoverage).toBeGreaterThanOrEqual(0.95);
    expect(results[1].coveredStudents).toBeGreaterThan(0);
  },
);
