import { createOralRepository } from "../../src/local/oral";
import { loadPackagePlacements } from "../../src/features/oral/package-placement";
import {
  createOralRun,
  answerOral,
  evaluateOral,
  undoOral,
  skipOral,
  resumeOral,
} from "../../src/core/oral/state";
async function exercise() {
  const scope = { ownerId: crypto.randomUUID(), mode: "demo" as const };
  const run = createOralRun({
    id: crypto.randomUUID(),
    classId: crypto.randomUUID(),
    studentId: crypto.randomUUID(),
    attendanceNumber: 1,
    grade: 2,
    seed: 70,
  });
  const repo = createOralRepository(scope),
    empty = (await repo.list()).length;
  await repo.save(run, 0);
  const next = answerOral(run, {
    questionId: evaluateOral(run).question!.id,
    result: "correct",
    misconceptionCode: null,
  });
  await repo.save(next, 1);
  let conflict = false;
  try {
    await repo.save(run, 1);
  } catch {
    conflict = true;
  }
  let immutable = false;
  try {
    await repo.save({ ...next, seed: next.seed + 1, answers: [] }, 2);
  } catch {
    immutable = true;
  }
  repo.close();
  const reopened = createOralRepository(scope),
    saved = await reopened.latest(`student:${run.studentId}`);
  const undone = undoOral(saved!);
  await reopened.save(undone, saved!.revision);
  const skipped = skipOral(undone);
  await reopened.save(skipped, undone.revision);
  const resumed = resumeOral(skipped);
  await reopened.save(resumed, skipped.revision);
  const students = [
    {
      schemaVersion: 1 as const,
      id: run.studentId,
      classId: run.classId,
      attendanceNumber: 1,
      active: true,
    },
  ];
  const beforeComplete = await loadPackagePlacements(
    scope,
    run.classId,
    students,
  );
  const completed = answerOral(resumed, {
    questionId: evaluateOral(resumed).question!.id,
    result: "incorrect",
    misconceptionCode: null,
  });
  const finished = answerOral(completed, {
    questionId: evaluateOral(completed).question!.id,
    result: "correct",
    misconceptionCode: null,
  });
  await reopened.save(finished, resumed.revision);
  const packagePlacements = await loadPackagePlacements(
    scope,
    run.classId,
    students,
  );
  const inactivePlacements = await loadPackagePlacements(
    scope,
    run.classId,
    students.map((s) => ({ ...s, active: false })),
  );
  const result = {
    empty,
    conflict,
    immutable,
    persisted: saved?.revision,
    afterUndo: evaluateOral(undone).observationCount,
    skipped: evaluateOral(skipped).status,
    resumed: evaluateOral(resumed).status,
    beforeComplete,
    packagePlacements,
    inactivePlacements,
  };
  reopened.close();
  return result;
}
declare global {
  interface Window {
    __oralFixture: { exercise: typeof exercise };
  }
}
window.__oralFixture = { exercise };
