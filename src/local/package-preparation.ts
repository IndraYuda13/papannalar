"use client";
import { z } from "zod";
import type { TeacherPackage } from "../core/package/build";
import { parseTeacherPackage } from "../contracts/package";
import { contentHash } from "../content/templates/format";
import { openDataDatabase } from "./data-database";
import { localOperation, type LocalScope } from "./scope";

export const preparationChecksSchema = z.tuple([
  z.boolean(),
  z.boolean(),
  z.boolean(),
]);
export type PreparationChecks = z.infer<typeof preparationChecksSchema>;
const recordSchema = z.strictObject({
  fingerprint: z.string(),
  checks: preparationChecksSchema,
});
export function preparationFingerprint(pkg: TeacherPackage) {
  // Binding/revision/freeze are not content changes. This is a local preparation
  // reminder, never a signed content approval or an AI/pilot eligibility input.
  // Use the storage boundary's field order: generation and schema parsing can
  // arrange the same nested fields differently without changing their content.
  const contents = parseTeacherPackage(pkg);
  return contentHash(
    JSON.stringify({
      grade: contents.grade,
      opening: contents.opening,
      assessment: contents.assessment,
      activities: contents.activities,
      oralGeneralActivity: contents.oralGeneralActivity,
    }),
  );
}
export function packagePreparation(scope: LocalScope) {
  const db = openDataDatabase(scope);
  return {
    read: (pkg: TeacherPackage): Promise<PreparationChecks> =>
      localOperation(async () => {
        const row = await db
          .table("localMeta")
          .get(`package:preparation:${pkg.id}`);
        if (!row) return [false, false, false];
        let stored: unknown;
        try {
          stored = JSON.parse(row.value);
        } catch {
          return [false, false, false];
        }
        const parsed = recordSchema.safeParse(stored);
        return parsed.success &&
          parsed.data.fingerprint === preparationFingerprint(pkg)
          ? parsed.data.checks
          : [false, false, false];
      }),
    save: (pkg: TeacherPackage, checks: PreparationChecks) =>
      localOperation(() =>
        db.transaction(
          "rw",
          db.table("packages"),
          db.table("localMeta"),
          async () => {
            const current: TeacherPackage | undefined = await db
              .table("packages")
              .get(pkg.id);
            if (
              !current ||
              preparationFingerprint(current) !== preparationFingerprint(pkg)
            )
              throw new Error("Preparation content changed");
            await db.table("localMeta").put({
              key: `package:preparation:${pkg.id}`,
              value: JSON.stringify({
                fingerprint: preparationFingerprint(pkg),
                checks: preparationChecksSchema.parse(checks),
              }),
            });
          },
        ),
      ),
    close: () => db.close(),
  };
}
