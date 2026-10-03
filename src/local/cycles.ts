"use client";
import type { Table } from "dexie";
import { openDataDatabase } from "./data-database";
import { assertSessionWriter } from "./writer";
import { parseOralRun } from "../contracts/oral";
import { localOperation, type LocalScope } from "./scope";
import { parseCycle } from "../contracts/cycle";
import { parseTeacherPackage } from "../contracts/package";
import {
  parseAssessmentContext,
  parseSavedCard,
  type AssessmentContext,
  type SavedCard,
} from "../contracts/assessment";
import { createCycle, finalizeCycle, type Cycle } from "../core/session/cycle";
import { freezePackage, type TeacherPackage } from "../core/package/build";
import { packageSession } from "../features/session/package-session";
import type { ClassDto } from "../contracts/classes";
import type { StudentDto } from "../contracts/api";
import type { ReplayBaseline } from "../core/placement/replay";
import { LocalActionError } from "./action-error";

export function createCycleRepository(scope: LocalScope) {
  const db = openDataDatabase(scope),
    cycles: Table<Cycle, string> = db.table("cycles"),
    sessions: Table<AssessmentContext, string> = db.table("sessions"),
    packages: Table<TeacherPackage, string> = db.table("packages"),
    responses: Table<SavedCard, string> = db.table("responses");
  async function history(classId: string) {
    let contexts = (
      await sessions.where("classroom.id").equals(classId).toArray()
    ).map(parseAssessmentContext);
    if (scope.mode === "demo") {
      // The filled example and the teacher's practice share a class/roster,
      // but never a learning timeline. Keep every example record untouched.
      const own = new Set(
        (await cycles.where("classId").equals(classId).toArray()).map(
          (c) => c.id,
        ),
      );
      contexts = contexts.filter((c) => own.has(c.session.sessionId));
    }
    return Promise.all(
      contexts.map(async (context) => ({
        context,
        cards: (
          await responses.where("sessionId").equals(context.id).toArray()
        ).map((c) => parseSavedCard(context, c)),
      })),
    );
  }
  return {
    start: (input: {
      id: string;
      packageId: string;
      classroom: ClassDto;
      students: readonly StudentDto[];
      baselines?: readonly ReplayBaseline[];
    }) =>
      localOperation(() =>
        db.transaction("rw", cycles, sessions, packages, async () => {
          if (input.classroom.mode !== scope.mode)
            throw new LocalActionError("CLASS_CHANGED");
          const existing = (
            await cycles.where("classId").equals(input.classroom.id).toArray()
          ).map(parseCycle);
          const active = existing.find((c) => !c.classEnded);
          // A repeated tap/retry of the same preparation resumes its session.
          if (active?.packageId === input.packageId) return active;
          if (active) throw new LocalActionError("ACTIVE_SESSION");
          if (existing.some((c) => !c.assessmentRevision))
            throw new LocalActionError("FINISH_PREVIOUS");
          const contexts = (
            await sessions
              .where("classroom.id")
              .equals(input.classroom.id)
              .toArray()
          )
            .map(parseAssessmentContext)
            .filter(
              (c) =>
                !c.parentSessionId &&
                (scope.mode !== "demo" || existing.some((e) => e.id === c.id)),
            );
          const pkg = parseTeacherPackage(await packages.get(input.packageId));
          if (
            pkg.classId !== input.classroom.id ||
            pkg.grade !== input.classroom.grade
          )
            throw new LocalActionError("CLASS_CHANGED");
          if (!input.students.some((s) => s.active))
            throw new LocalActionError("NO_STUDENTS");
          if (!pkg.assessment.length && input.classroom.grade > 3)
            throw new LocalActionError("CHECK_NOT_SUPPORTED");
          if (existing.some((c) => c.packageId === pkg.id))
            throw new LocalActionError("PACKAGE_USED");
          if (contexts.some((c) => !existing.some((e) => e.id === c.id)))
            throw new LocalActionError("SEPARATE_HISTORY");
          const ordinal =
            Math.max(0, ...contexts.map((c) => c.session.ordinal)) + 1;
          if (ordinal > 1 && pkg.variant === "initial")
            throw new LocalActionError("NEXT_CHECK_REQUIRED");
          const frozen = freezePackage(pkg);
          const ctx = packageSession({
            id: input.id,
            classroom: input.classroom,
            students: input.students,
            package: frozen,
            ordinal,
            baselines: input.baselines,
          });
          const cycle = parseCycle(
            createCycle({
              id: input.id,
              classId: input.classroom.id,
              packageId: pkg.id,
              ordinal,
            }),
          );
          await packages.put(frozen);
          await sessions.add(ctx);
          await cycles.add(cycle);
          return cycle;
        }),
      ),
    list: (classId?: string) =>
      localOperation(async () =>
        (classId
          ? await cycles.where("classId").equals(classId).toArray()
          : await cycles.toArray()
        )
          .map(parseCycle)
          .sort((a, b) => a.ordinal - b.ordinal),
      ),
    read: (id: string) =>
      localOperation(async () => {
        const cycle = parseCycle(await cycles.get(id));
        const pkg = parseTeacherPackage(await packages.get(cycle.packageId));
        const bundles = await history(cycle.classId);
        const parent = bundles.find((b) => b.context.id === cycle.id);
        if (!parent || parent.context.classroom.mode !== scope.mode)
          throw new Error("Missing parent session");
        const oralRuns = (
          await db
            .table("oralRuns")
            .where("classId")
            .equals(cycle.classId)
            .toArray()
        ).map(parseOralRun);
        return { cycle, package: pkg, bundles, parent, oralRuns };
      }),
    history: (classId: string) => localOperation(() => history(classId)),
    save: (input: Cycle, expectedRevision: number) =>
      localOperation(() =>
        db.transaction("rw", cycles, db.table("syncMeta"), async () => {
          const value = parseCycle(input),
            previous = parseCycle(await cycles.get(value.id));
          await assertSessionWriter(db, value.id);
          if (
            previous.revision !== expectedRevision ||
            value.revision !== expectedRevision + 1
          )
            throw new Error("Cycle revision conflict");
          if (
            value.classId !== previous.classId ||
            value.packageId !== previous.packageId ||
            value.ordinal !== previous.ordinal ||
            value.assessmentRevision !== previous.assessmentRevision ||
            (previous.classEnded && !value.classEnded) ||
            (previous.groups.length &&
              JSON.stringify(previous.groups) !==
                JSON.stringify(value.groups)) ||
            (previous.groups.length &&
              JSON.stringify(previous.absentStudentIds) !==
                JSON.stringify(value.absentStudentIds))
          )
            throw new Error("Frozen cycle changed");
          await cycles.put(value);
          return value;
        }),
      ),
    finalize: (
      id: string,
      expectedRevision: number,
      acknowledgeMissing: boolean,
    ) =>
      localOperation(() =>
        db.transaction(
          "rw",
          cycles,
          sessions,
          responses,
          db.table("syncMeta"),
          async () => {
            const cycle = parseCycle(await cycles.get(id));
            await assertSessionWriter(db, id);
            if (cycle.revision !== expectedRevision)
              throw new Error("Cycle revision conflict");
            const bundles = await history(cycle.classId),
              related = bundles.filter(
                (b) => b.context.session.sessionId === id,
              ),
              parent = related.find((b) => b.context.id === id);
            if (!parent) throw new Error("Missing parent");
            const present = parent.context.roster.filter(
              (s) => !cycle.absentStudentIds.includes(s.id),
            );
            let pending = 0;
            for (const s of present) {
              const exit = related.find(
                (b) =>
                  b.context.parentSessionId === id &&
                  b.context.roster.some((m) => m.id === s.id),
              );
              if (
                !exit ||
                !exit.cards.some(
                  (c) =>
                    c.studentId === s.id &&
                    c.choices.every((x) => x !== "missing"),
                )
              )
                pending++;
              if (
                !parent.context.oralOnly &&
                !parent.cards.some(
                  (c) =>
                    c.studentId === s.id &&
                    c.choices.every((x) => x !== "missing"),
                )
              )
                pending++;
            }
            const next = finalizeCycle(cycle, pending, acknowledgeMissing);
            for (const b of related)
              await sessions.put(
                parseAssessmentContext({
                  ...b.context,
                  session: { ...b.context.session, finalized: true },
                }),
              );
            await cycles.put(next);
            return { cycle: next, pending };
          },
        ),
      ),
    close: () => db.close(),
  };
}
