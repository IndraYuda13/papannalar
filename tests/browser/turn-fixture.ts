import { createTurnRepository } from "../../src/local/turns";
import { createRotationRepository } from "../../src/local/rotations";
import {
  createRotation,
  rotationAction,
} from "../../src/core/stations/rotation";
import { confirmHold, previewHold } from "../../src/core/stations/hold";
import {
  planTurns,
  startTurn,
  turnCounts,
} from "../../src/core/turns/scheduler";
async function exercise() {
  const scope = { ownerId: crypto.randomUUID(), mode: "demo" as const },
    classId = crypto.randomUUID(),
    studentId = crypto.randomUUID();
  const repo = createTurnRepository(scope),
    empty = await repo.read(classId, "2026-2");
  const event = planTurns({
    id: crypto.randomUUID(),
    sessionId: crypto.randomUUID(),
    groupId: crypto.randomUUID(),
    taskIndex: 0,
    seed: 12,
    verifiedTouches: 2,
    students: [
      { studentId, attendanceNumber: 1, navigatorFirst: false, present: true },
    ],
    events: [],
    teams: [[studentId]],
  });
  const next = {
    ...empty,
    revision: 1,
    events: [...startTurn(empty.events, event)].map((e) => ({
      ...e,
      pilots: [...e.pilots],
      navigators: [...e.navigators],
      teams: e.teams.map((t) => [...t]),
    })),
  };
  await repo.save(next, 0);
  let conflict = false,
    immutable = false,
    privacy = false;
  try {
    await repo.save(next, 0);
  } catch {
    conflict = true;
  }
  try {
    await repo.save({ ...next, revision: 2, events: [] }, 1);
  } catch {
    immutable = true;
  }
  try {
    await repo.save(
      { ...next, revision: 2, name: "LOCAL_CANARY" } as typeof next,
      1,
    );
  } catch {
    privacy = true;
  }
  repo.close();
  const reopened = createTurnRepository(scope),
    stored = await reopened.read(classId, "2026-2"),
    nextSemester = await reopened.read(classId, "2027-1");
  reopened.close();
  const other = createTurnRepository({
      ...scope,
      ownerId: crypto.randomUUID(),
    }),
    otherCount = (await other.read(classId, "2026-2")).events.length;
  other.close();
  const rotations = createRotationRepository(scope),
    groupIds = Array.from({ length: 4 }, () => crypto.randomUUID());
  const rotation = createRotation({
    id: crypto.randomUUID(),
    groupIds,
    grade: 7,
  });
  await rotations.save(rotation, 0);
  const running = rotationAction(rotation, "start", 1000);
  await rotations.save(running, 1);
  const held = confirmHold(running, previewHold(running, groupIds[1]));
  await rotations.save(held, 2);
  const holdPersisted =
    (await rotations.read(held.id))?.schedule[1][1] === "Mandiri";
  let historyFrozen = false;
  try {
    await rotations.save(
      {
        ...held,
        revision: 4,
        schedule: [
          held.schedule[1],
          held.schedule[0],
          held.schedule[2],
          held.schedule[3],
        ],
      },
      3,
    );
  } catch {
    historyFrozen = true;
  }
  rotations.close();
  return {
    empty: empty.events.length,
    conflict,
    immutable,
    privacy,
    pilot: turnCounts(stored.events, studentId).pilot,
    duplicate: startTurn(stored.events, event).length,
    nextSemester: nextSemester.events.length,
    otherCount,
    holdPersisted,
    historyFrozen,
  };
}
declare global {
  interface Window {
    __turnFixture: { exercise: typeof exercise };
  }
}
window.__turnFixture = { exercise };
