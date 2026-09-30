import { exitFixture } from "../fixtures/exit";
import { createExitRepository } from "../../src/local/exit";
import { createAssessmentRepository } from "../../src/local/assessments";
import { exitContext, publicExit } from "../../src/contracts/exit";
import { exitKeys, summarizeExit } from "../../src/core/assessment/exit";
async function exercise() {
  const f = exitFixture(),
    scope = { ownerId: crypto.randomUUID(), mode: "demo" as const },
    exits = createExitRepository(scope),
    repo = createAssessmentRepository(scope),
    ctx = exitContext(f.plan, f.parent);
  await repo.create(f.parent);
  await exits.create(f.plan, ctx);
  const input = {
    studentId: f.students[0].id,
    choices: exitKeys(f.plan, f.students[0].id),
    source: "omr" as const,
    expectedRevision: 0,
  };
  const first = await repo.save(f.plan.id, input),
    duplicate = await repo.save(f.plan.id, input);
  const before = await repo.counts(f.plan.id);
  const correction = await repo.save(f.plan.id, {
    ...input,
    choices: [
      input.choices[0],
      input.choices[1] === "A" ? "B" : "A",
      input.choices[2],
    ],
    source: "manual",
    expectedRevision: 1,
  });
  const conflict = await repo.save(f.plan.id, {
    ...input,
    expectedRevision: 1,
  });
  let frozen = false;
  try {
    await exits.create(
      {
        ...f.plan,
        groups: f.plan.groups.map((g) => ({ ...g, label: "Kotak Hijau" })),
      },
      ctx,
    );
  } catch {
    frozen = true;
  }
  exits.close();
  repo.close();
  const again = createExitRepository(scope),
    answers = createAssessmentRepository(scope),
    persisted = (await again.read(f.parent.id))!,
    saved = await answers.read(persisted.id),
    counts = await answers.counts(persisted.id);
  const other = createExitRepository({
    ownerId: crypto.randomUUID(),
    mode: "demo",
  });
  const isolated = (await other.read(f.parent.id)) === undefined;
  const projection = JSON.stringify(publicExit(persisted, 2));
  again.close();
  answers.close();
  other.close();
  return {
    first: first.status,
    duplicate: duplicate.status,
    before,
    correction: correction.status,
    conflict: conflict.status,
    frozen,
    isolated,
    counts,
    parentSessionId: saved.context.parentSessionId === f.parent.id,
    keysPreserved:
      JSON.stringify(saved.context.keysByStudent) ===
      JSON.stringify(ctx.keysByStudent),
    revision: saved.cards[0].graded.revision,
    summary: summarizeExit(
      persisted,
      saved.cards.map((c) => c.graded),
    ),
    privateAbsent: ![
      "studentId",
      "answerKey",
      "reasonKey",
      "stepId",
      "classification",
    ].some((k) => projection.includes(k)),
  };
}
declare global {
  interface Window {
    __exitFixture: { exercise: typeof exercise };
  }
}
window.__exitFixture = { exercise };
