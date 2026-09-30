import { createSyncRepository } from "../../src/local/sync";
import { createCycleRepository } from "../../src/local/cycles";
import { createPackageRepository } from "../../src/local/packages";
import { createAssessmentRepository } from "../../src/local/assessments";
import { readLocalAccess } from "../../src/local/access";
import { classDetailSchema } from "../../src/contracts/classes";
import { buildPackage } from "../../src/core/package/build";
import { synchronize } from "../../src/features/session/sync-client";
import { syncRecordsSchema } from "../../src/contracts/sync";
import { purgeDeletedClass } from "../../src/local/delete-class";
import type { CardChoice } from "../../src/core/assessment/card-response";

async function scope() {
  const ownerId = (await readLocalAccess())?.id;
  if (!ownerId) throw new Error("Fixture requires real local teacher grant");
  return { ownerId, mode: "demo" as const };
}
async function initialize() {
  const response = await fetch("/api/v1/classes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id: crypto.randomUUID(),
      label: "7S",
      grade: 7,
      count: 3,
      mode: "demo",
    }),
  });
  if (!response.ok) throw new Error("Test class creation failed");
  const detail = classDetailSchema.parse(await response.json()),
    local = await scope();
  const packages = createPackageRepository(local),
    cycles = createCycleRepository(local),
    assessments = createAssessmentRepository(local);
  try {
    const pkg = buildPackage({
      id: crypto.randomUUID(),
      classId: detail.class.id,
      grade: 7,
      variant: "initial",
      seed: 412,
      occupied: [],
    });
    await packages.save(pkg, 0);
    const cycle = await cycles.start({
      id: crypto.randomUUID(),
      packageId: pkg.id,
      classroom: detail.class,
      students: detail.students,
    });
    const parent = (await cycles.read(cycle.id)).parent.context;
    await assessments.save(cycle.id, {
      studentId: detail.students[0].id,
      choices: parent.keys,
      expectedRevision: 0,
      source: "manual",
    });
    return { classId: detail.class.id, sessionId: cycle.id };
  } finally {
    packages.close();
    cycles.close();
    assessments.close();
  }
}
async function queue() {
  const repo = createSyncRepository(await scope());
  try {
    await repo.prepare();
    return await repo.list();
  } finally {
    repo.close();
  }
}
async function sync() {
  const local = await scope(),
    repo = createSyncRepository(local);
  try {
    await repo.resume();
    return await synchronize(local);
  } finally {
    repo.close();
  }
}
async function correct(sessionId: string, choice: CardChoice = "?") {
  const repo = createAssessmentRepository(await scope());
  try {
    const data = await repo.read(sessionId),
      card = data.cards[0];
    const choices = [...card.choices];
    choices[0] = choice;
    return await repo.save(sessionId, {
      studentId: card.studentId,
      choices,
      expectedRevision: card.graded.revision,
      source: "manual",
    });
  } finally {
    repo.close();
  }
}
async function counts(sessionId: string) {
  const repo = createAssessmentRepository(await scope());
  try {
    return await repo.counts(sessionId);
  } finally {
    repo.close();
  }
}
async function canonical(classId: string) {
  const response = await fetch(`/api/v1/sync?classId=${classId}`);
  return syncRecordsSchema.parse(await response.json());
}
async function purge(classId: string) {
  await purgeDeletedClass(await scope(), classId);
}
declare global {
  interface Window {
    __syncFixture: {
      initialize: typeof initialize;
      queue: typeof queue;
      sync: typeof sync;
      correct: typeof correct;
      counts: typeof counts;
      canonical: typeof canonical;
      purge: typeof purge;
    };
  }
}
window.__syncFixture = {
  initialize,
  queue,
  sync,
  correct,
  counts,
  canonical,
  purge,
};
