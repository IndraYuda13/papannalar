import { exitFixture, exitId } from "./exit";
import { buildPackage, freezePackage } from "../../src/core/package/build";
import {
  createCycle,
  closeCycle,
  finalizeCycle,
  freezeCycleGroups,
} from "../../src/core/session/cycle";
import {
  packageSession,
  deriveTimeline,
} from "../../src/features/session/package-session";
import { gradeCard } from "../../src/core/assessment/card-response";
import { parseSavedCard } from "../../src/contracts/assessment";
import { toSessionSync, syncMutationSchema } from "../../src/contracts/sync";
import { createExitPlan, exitKeys } from "../../src/core/assessment/exit";
import { exitContext } from "../../src/contracts/exit";
import {
  createOralRun,
  answerOral,
  evaluateOral,
} from "../../src/core/oral/state";
import { toSyncOral } from "../../src/contracts/sync-history";
export function syncFixture() {
  const { classroom, students } = exitFixture();
  const pkg = freezePackage(
    buildPackage({
      id: exitId(300),
      classId: classroom.id,
      grade: classroom.grade,
      variant: "initial",
      seed: 412,
      occupied: [],
    }),
  );
  const parent = packageSession({
    id: exitId(301),
    classroom,
    students,
    package: pkg,
    ordinal: 1,
  });
  const cards = parent.roster.map((s) => {
    const choices = parent.keys.map((k, i) => (i === 5 ? ("?" as const) : k));
    return parseSavedCard(parent, {
      id: `${parent.id}/${s.id}`,
      sessionId: parent.id,
      studentId: s.id,
      choices,
      graded: gradeCard(
        parent.bindings.find((b) => b.studentId === s.id)!,
        parent.keys,
        choices,
        1,
        "manual",
      ),
    });
  });
  const initial = createCycle({
    id: parent.id,
    classId: classroom.id,
    packageId: pkg.id,
    ordinal: 1,
  });
  const groups = deriveTimeline([{ context: parent, cards }], parent, initial)
    .grouping.groups;
  const cycle = finalizeCycle(
    closeCycle(freezeCycleGroups(initial, groups)),
    3,
    true,
  );
  const plan = createExitPlan({
    id: exitId(302),
    sessionId: parent.id,
    package: pkg,
    groups,
  });
  const exit = exitContext(plan, parent);
  const exitCards = [
    parseSavedCard(exit, {
      id: `${exit.id}/${students[0].id}`,
      sessionId: exit.id,
      studentId: students[0].id,
      choices: exitKeys(plan, students[0].id),
      graded: gradeCard(
        exit.bindings[0],
        exit.keys,
        exitKeys(plan, students[0].id),
        1,
        "manual",
      ),
    }),
  ];
  const payload = toSessionSync({
    cycle,
    package: pkg,
    bundles: [
      { context: parent, cards },
      { context: exit, cards: exitCards },
    ],
  });
  const mutation = syncMutationSchema.parse({
    schemaVersion: 1,
    eventId: exitId(303),
    deviceId: exitId(304),
    clientSequence: 1,
    classId: classroom.id,
    sessionId: cycle.id,
    baseRevision: 0,
    writerEpoch: 1,
    operation: "session-save",
    payload,
  });
  return {
    classroom,
    students,
    pkg,
    parent,
    cards,
    cycle,
    plan,
    exit,
    exitCards,
    payload,
    mutation,
  };
}
export function syncHistoryFixture() {
  const f = syncFixture();
  let run = createOralRun({
    id: exitId(310),
    classId: f.classroom.id,
    studentId: f.students[0].id,
    attendanceNumber: 1,
    grade: 7,
    seed: 552,
    afterSessionOrdinal: 1,
  });
  run = answerOral(run, {
    questionId: evaluateOral(run).question!.id,
    result: "correct",
    misconceptionCode: null,
  });
  run = answerOral(run, {
    questionId: evaluateOral(run).question!.id,
    result: "incorrect",
    misconceptionCode: null,
  });
  const payload = {
    ...f.payload,
    oral: [toSyncOral(run)],
    turns: [
      {
        semester: "2026-2",
        navigatorFirst: [],
        events: [
          {
            id: exitId(311),
            sessionId: f.cycle.id,
            groupId: null,
            taskIndex: 0,
            seed: 15,
            pilots: [f.students[0].id],
            navigators: [f.students[1].id],
            teams: [f.students.map((s) => s.id)],
          },
        ],
      },
    ],
  };
  return { ...f, run, payload, mutation: { ...f.mutation, payload } };
}
