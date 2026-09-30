import {
  buildPackage,
  freezePackage,
  replacePackageQuestion,
} from "../../src/core/package/build";
import { createPackageRepository } from "../../src/local/packages";
import { toPublicPackage } from "../../src/contracts/package";
import { seededGroupId } from "../../src/core/math/seed";
import { boardPackageFixture } from "../fixtures/board-package";
import { boardPackageCache } from "../../src/offline/board-package-cache";

function privateContentFields(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(privateContentFields);
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return Object.entries(record).some(
    ([key, child]) =>
      [
        "attendanceNumbers",
        "studentId",
        "plan",
        "answerKey",
        "reasonKey",
        "stepId",
        "name",
        "history",
        "ink",
      ].includes(key) ||
      (key === "groups" &&
        !(record.kind === "algebra" && typeof child === "number")) ||
      privateContentFields(child),
  );
}

async function exerciseBoardCache() {
  const databaseName = `qa-board-content-${crypto.randomUUID()}`;
  const { packet } = boardPackageFixture();
  const first = boardPackageCache(databaseName);
  const empty = (await first.read()) === undefined;
  let rejected = false;
  try {
    await first.save(
      Object.assign({}, packet.content, { roster: packet.plan.groups }),
    );
  } catch {
    rejected = true;
  }
  await first.save(packet.content);
  first.close();
  const reopened = boardPackageCache(databaseName);
  const loaded = await reopened.read();
  const persisted = JSON.stringify(loaded) === JSON.stringify(packet.content);
  const onlyContent = !privateContentFields(loaded);
  await reopened.clear();
  const erased = (await reopened.read()) === undefined;
  reopened.close();
  return { empty, rejected, persisted, onlyContent, erased };
}
async function inspectBoardCache() {
  const cache = boardPackageCache();
  try {
    const content = await cache.read();
    return {
      present: !!content,
      activities: content?.content.activities.length ?? 0,
      privateFields: privateContentFields(content),
    };
  } finally {
    cache.close();
  }
}
async function exercise() {
  const scope = { ownerId: crypto.randomUUID(), mode: "demo" as const };
  const input = {
    id: crypto.randomUUID(),
    classId: crypto.randomUUID(),
    grade: 7,
    seed: 13,
    variant: "initial" as const,
    occupied: [],
  };
  const first = buildPackage(input),
    repo = createPackageRepository(scope);
  const empty = (await repo.list()).length;
  await repo.save(first, 0);
  const second = replacePackageQuestion(first, first.assessment[0].id, 1221);
  await repo.save(second, 1);
  let conflict = false;
  try {
    await repo.save(first, 1);
  } catch {
    conflict = true;
  }
  const frozen = freezePackage(second);
  await repo.save(frozen, 2);
  let immutable = false;
  try {
    await repo.save(
      { ...frozen, opening: { ...frozen.opening, prompt: "changed" } },
      2,
    );
  } catch {
    immutable = true;
  }
  repo.close();
  const reopened = createPackageRepository(scope);
  const loaded = await reopened.read(first.id);
  const other = createPackageRepository({
    ownerId: seededGroupId(13, 0),
    mode: "demo",
  });
  const otherCount = (await other.list()).length;
  other.close();
  reopened.close();
  return {
    empty,
    conflict,
    immutable,
    persisted: loaded?.contentHash === frozen.contentHash,
    otherCount,
    publicKeys: Object.keys(toPublicPackage(frozen)).sort(),
  };
}
declare global {
  interface Window {
    __packageFixture: {
      exercise: typeof exercise;
      exerciseBoardCache: typeof exerciseBoardCache;
      inspectBoardCache: typeof inspectBoardCache;
    };
  }
}
window.__packageFixture = { exercise, exerciseBoardCache, inspectBoardCache };
